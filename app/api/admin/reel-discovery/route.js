import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  candidateLooksRelevant,
  candidateToReelCacheRow,
  classifyReelSourceUrl,
  dedupeReelCandidates,
  normalizeReelCandidate,
  promoteCandidateToReelCache,
  rejectUnsafeReelResult,
  scoreReelCandidate
} from "../../../../lib/reelDiscovery.js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_BACKFILL_SECRET = process.env.ADMIN_BACKFILL_SECRET;
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const YOUTUBE_SEARCH_LIMIT = 5;
const RESULT_LIMIT = 5;

function serverSupabase() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

function clampNumber(value, fallback = 25, max = 100) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(Math.floor(number), max));
}

function mediaType(item = {}) {
  return item.media_type || (item.first_air_date || item.name ? "tv" : "movie");
}

function itemKeyOf(item = {}) {
  return item.id ? `${mediaType(item)}:${item.id}` : "";
}

function titleOf(item = {}) {
  return item.title || item.name || "Untitled";
}

function isMissingTableError(error) {
  return error?.code === "42P01" || /does not exist|schema cache|reel_candidates|discovery_jobs/i.test(error?.message || "");
}

function safeError(error) {
  if (!error) return "";
  if (isMissingTableError(error)) return "Discovery tables are missing. Run supabase/reels_discovery_engine.sql first.";
  return error.message || String(error);
}

function isQuotaError(status, message = "") {
  return status === 429 || /quota|rate limit|rate_limit|exceeded/i.test(message || "");
}

async function saveDiscoveryJob(client, row) {
  if (!client) return;
  const { error } = await client.from("discovery_jobs").insert({
    ...row,
    updated_at: new Date().toISOString(),
    started_at: row.started_at || null,
    finished_at: row.finished_at || new Date().toISOString(),
    last_run_at: new Date().toISOString()
  });
  if (error && !isMissingTableError(error)) {
    console.error("MovieGram admin discovery job save failed", { message: error.message, code: error.code });
  }
}

async function saveCandidates(client, candidates = []) {
  if (!client || !candidates.length) return { saved: 0, error: null };
  const rows = candidates.map((candidate) => ({
    ...candidate,
    updated_at: new Date().toISOString()
  }));
  const { error } = await client.from("reel_candidates").upsert(rows, { onConflict: "source,source_url" });
  if (error) return { saved: 0, error: safeError(error), missingTables: isMissingTableError(error) };
  return { saved: rows.length, error: null };
}

async function listCandidates(client, status = "pending", limit = 50) {
  if (!client) return { candidates: [], errors: ["Supabase server client is not configured."] };
  const query = client
    .from("reel_candidates")
    .select("*")
    .order("quality_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(clampNumber(limit, 50, 100));
  const { data, error } = status === "all" ? await query : await query.eq("status", status);
  if (error) return { candidates: [], errors: [safeError(error)] };
  return { candidates: data || [], errors: [] };
}

async function updateCandidateStatus(client, id, status, rejectionReason = "") {
  if (!client || !id) return { errors: ["Missing Supabase client or candidate id."] };
  const patch = {
    status,
    rejection_reason: status === "rejected" ? rejectionReason || "Rejected by admin review." : null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await client.from("reel_candidates").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) return { errors: [safeError(error)] };
  return { candidate: data, errors: [] };
}

async function promoteCandidateById(client, id) {
  if (!client || !id) return { promoted: 0, skippedDuplicates: 0, errors: ["Missing Supabase client or candidate id."] };
  const { data: candidate, error } = await client.from("reel_candidates").select("*").eq("id", id).maybeSingle();
  if (error) return { promoted: 0, skippedDuplicates: 0, errors: [safeError(error)] };
  if (!candidate) return { promoted: 0, skippedDuplicates: 0, errors: ["Candidate not found."] };
  const normalized = normalizeReelCandidate({ ...candidate, status: "approved" });
  if (!(normalized.source && (normalized.source_video_id || normalized.source_url || normalized.watch_url || normalized.embed_url))) {
    return { promoted: 0, skippedDuplicates: 0, errors: ["Candidate is missing source URL or video id."] };
  }
  const duplicateQuery = client
    .from("reel_cache")
    .select("id", { count: "exact", head: true });
  const duplicateFilters = [];
  if (normalized.source_video_id) duplicateFilters.push(`source_video_id.eq.${normalized.source_video_id}`);
  if (normalized.source_url) duplicateFilters.push(`source_url.eq.${normalized.source_url}`);
  if (normalized.watch_url) duplicateFilters.push(`watch_url.eq.${normalized.watch_url}`);
  if (normalized.embed_url) duplicateFilters.push(`embed_url.eq.${normalized.embed_url}`);
  const duplicateResult = duplicateFilters.length
    ? await duplicateQuery.or(duplicateFilters.join(","))
    : { count: 0, error: null };
  if (duplicateResult.error) return { promoted: 0, skippedDuplicates: 0, errors: [safeError(duplicateResult.error)] };
  if (duplicateResult.count) {
    await client.from("reel_candidates").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id);
    return { promoted: 0, skippedDuplicates: duplicateResult.count, errors: [] };
  }
  const row = promoteCandidateToReelCache(normalized) || candidateToReelCacheRow({ ...normalized, status: "approved" });
  const { error: upsertError } = await client.from("reel_cache").upsert(row, { onConflict: "source,source_video_id" });
  if (upsertError) return { promoted: 0, skippedDuplicates: 0, errors: [safeError(upsertError)] };
  await client.from("reel_candidates").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id);
  return { promoted: 1, skippedDuplicates: 0, errors: [] };
}

async function tmdbCandidates(target) {
  if (!TMDB_API_KEY) return { candidates: [], errors: ["Missing TMDB_API_KEY or NEXT_PUBLIC_TMDB_API_KEY."] };
  const errors = [];
  const buckets = [
    ["movie", "popular"],
    ["movie", "top_rated"],
    ["tv", "popular"],
    ["tv", "top_rated"]
  ];
  const candidates = [];
  for (const [type, list] of buckets) {
    if (candidates.length >= target) break;
    try {
      const listUrl = `https://api.themoviedb.org/3/${type}/${list}?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US&page=1`;
      const listResponse = await fetch(listUrl, { cache: "no-store" });
      const listData = await listResponse.json().catch(() => ({}));
      if (!listResponse.ok) throw new Error(listData?.status_message || `TMDB ${listResponse.status}`);
      for (const item of (listData.results || []).slice(0, 12)) {
        if (candidates.length >= target) break;
        const videosUrl = `https://api.themoviedb.org/3/${type}/${item.id}/videos?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;
        const videosResponse = await fetch(videosUrl, { cache: "no-store" });
        const videosData = await videosResponse.json().catch(() => ({}));
        if (!videosResponse.ok) throw new Error(videosData?.status_message || `TMDB videos ${videosResponse.status}`);
        const normalizedItem = { ...item, media_type: type };
        (videosData.results || [])
          .filter((video) => video.site === "YouTube" && video.key && ["Clip", "Teaser", "Featurette", "Behind the Scenes", "Trailer"].includes(video.type))
          .slice(0, 3)
          .forEach((video) => {
            if (candidates.length >= target) return;
            const sourceUrl = `https://www.youtube.com/watch?v=${video.key}`;
            const candidate = normalizeReelCandidate({
              source: "youtube",
              source_video_id: video.key,
              source_url: sourceUrl,
              watch_url: sourceUrl,
              media_type: type,
              tmdb_id: item.id,
              item_key: itemKeyOf(normalizedItem),
              title: titleOf(normalizedItem),
              video_title: video.name,
              channel_title: "TMDB",
              creator_username: "TMDB",
              thumbnail_url: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
              label: video.type,
              content_format: video.type === "Trailer" ? "trailer" : video.type === "Clip" ? "clip" : "teaser",
              aspect_mode: "horizontal",
              status: "pending",
              discovered_by: "admin_tmdb"
            });
            candidates.push({ ...candidate, quality_score: scoreReelCandidate(candidate, normalizedItem) });
          });
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { candidates: dedupeReelCandidates(candidates).slice(0, target), errors };
}

async function youtubeCandidates(queries = [], target) {
  if (!YOUTUBE_API_KEY) return { candidates: [], errors: ["Missing server-only YOUTUBE_API_KEY."] };
  const errors = [];
  const candidates = [];
  let searches = 0;
  for (const query of queries.slice(0, YOUTUBE_SEARCH_LIMIT)) {
    if (searches >= YOUTUBE_SEARCH_LIMIT || candidates.length >= target) break;
    searches += 1;
    try {
      const params = new URLSearchParams({
        key: YOUTUBE_API_KEY,
        part: "snippet",
        q: query,
        type: "video",
        videoEmbeddable: "true",
        safeSearch: "moderate",
        maxResults: String(Math.min(RESULT_LIMIT, 5))
      });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        errors.push(data?.error?.message || `YouTube ${response.status}`);
        if (isQuotaError(response.status, data?.error?.message)) break;
        continue;
      }
      (data.items || []).forEach((video) => {
        const sourceVideoId = video.id?.videoId;
        const videoTitle = video.snippet?.title || query;
        if (!sourceVideoId || rejectUnsafeReelResult({ title: videoTitle })) return;
        const sourceUrl = `https://www.youtube.com/watch?v=${sourceVideoId}`;
        const candidate = normalizeReelCandidate({
          source: "youtube",
          source_video_id: sourceVideoId,
          source_url: sourceUrl,
          watch_url: sourceUrl,
          title: query,
          video_title: videoTitle,
          channel_title: video.snippet?.channelTitle || "",
          creator_username: video.snippet?.channelTitle || "",
          thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || "",
          status: "pending",
          discovered_by: "admin_youtube"
        });
        candidates.push({ ...candidate, quality_score: scoreReelCandidate(candidate) });
      });
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { candidates: dedupeReelCandidates(candidates).slice(0, target), errors, searches };
}

function manualCandidates(urls = [], target) {
  const candidates = urls.slice(0, target).map((entry) => {
    const raw = typeof entry === "string" ? { url: entry } : entry || {};
    const classified = classifyReelSourceUrl(raw.url || raw.source_url || "");
    if (!classified) return null;
    const candidate = normalizeReelCandidate({
      ...classified,
      title: raw.title || "Manual reel candidate",
      video_title: raw.video_title || raw.title || "Manual reel candidate",
      label: raw.label || classified.label,
      status: "pending",
      discovered_by: "admin_manual"
    });
    return { ...candidate, quality_score: scoreReelCandidate(candidate) };
  }).filter(Boolean);
  return { candidates: dedupeReelCandidates(candidates), errors: [] };
}

async function discoverCandidates(source, body, target) {
  if (source === "youtube") return youtubeCandidates(body?.queries || [], target);
  if (source === "manual") return manualCandidates(body?.urls || [], target);
  return tmdbCandidates(target);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const secret = request.headers.get("x-admin-secret") || body?.secret || "";
  if (!ADMIN_BACKFILL_SECRET || secret !== ADMIN_BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const client = serverSupabase();
  const action = body?.action || "discover";
  const target = clampNumber(body?.target, 25, 100);
  const dryRun = body?.dryRun !== false;
  const errors = [];

  if (action === "list") {
    const listed = await listCandidates(client, body?.status || "pending", target);
    return NextResponse.json({ checked: listed.candidates.length, candidates: listed.candidates, savedCandidates: 0, promotedToCache: 0, skippedDuplicates: 0, errors: listed.errors, dryRun: true });
  }

  if (action === "approve" || action === "reject") {
    const updated = await updateCandidateStatus(client, body?.candidateId, action === "approve" ? "approved" : "rejected", body?.rejectionReason || "");
    return NextResponse.json({ checked: updated.candidate ? 1 : 0, candidates: updated.candidate ? [updated.candidate] : [], savedCandidates: 0, promotedToCache: 0, skippedDuplicates: 0, errors: updated.errors, dryRun: true });
  }

  if (action === "promote") {
    const promoted = await promoteCandidateById(client, body?.candidateId);
    await saveDiscoveryJob(client, { job_type: "candidate_promote", status: promoted.errors.length ? "failed" : "done", source: "admin", saved_count: promoted.promoted, error_count: promoted.errors.length, error_message: promoted.errors.join("; ") });
    return NextResponse.json({ checked: 1, candidates: [], savedCandidates: 0, promotedToCache: promoted.promoted, skippedDuplicates: promoted.skippedDuplicates, errors: promoted.errors, dryRun: false });
  }

  const source = ["tmdb", "youtube", "manual"].includes(body?.source) ? body.source : "tmdb";
  const result = await discoverCandidates(source, body, target);
  const relevant = result.candidates.filter((candidate) => {
    if (!candidate.item_key && !candidate.tmdb_id) return true;
    return candidateLooksRelevant(candidate, { title: candidate.title, name: candidate.title, id: candidate.tmdb_id, media_type: candidate.media_type });
  });
  errors.push(...(result.errors || []));

  let savedCandidates = 0;
  let skippedDuplicates = result.candidates.length - relevant.length;
  if (!dryRun && client) {
    const saveResult = await saveCandidates(client, relevant);
    savedCandidates = saveResult.saved;
    if (saveResult.error) errors.push(saveResult.error);
  } else if (!dryRun && !client) {
    errors.push("Supabase server client is not configured.");
  }

  await saveDiscoveryJob(client, {
    job_type: "admin_reel_discovery",
    status: errors.some((message) => /quota|rate limit/i.test(message)) ? "rate_limited" : errors.length ? "failed" : "done",
    source,
    provider: source,
    target_count: target,
    checked_count: relevant.length,
    saved_count: savedCandidates,
    error_count: errors.length,
    error_message: errors.join("; ").slice(0, 500)
  });

  return NextResponse.json({
    checked: relevant.length,
    candidates: relevant,
    savedCandidates,
    promotedToCache: 0,
    skippedDuplicates,
    errors,
    dryRun
  });
}
