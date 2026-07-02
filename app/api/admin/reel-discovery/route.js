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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_BACKFILL_SECRET = process.env.ADMIN_BACKFILL_SECRET;
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

const YOUTUBE_SEARCH_LIMIT = 5;
const RESULT_LIMIT = 5;

function serverSupabase() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

function clampNumber(value, fallback, max) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.floor(number), max);
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

async function saveCandidates(client, candidates = []) {
  if (!client || !candidates.length) return { saved: 0, error: null };
  const rows = candidates.map((candidate) => ({
    ...candidate,
    updated_at: new Date().toISOString()
  }));
  const { error } = await client.from("reel_candidates").upsert(rows, { onConflict: "source,source_url" });
  if (error) return { saved: 0, error: error.message };
  return { saved: rows.length, error: null };
}

async function promoteCandidates(client, candidates = []) {
  if (!client || !candidates.length) return { promoted: 0, error: null };
  const rows = candidates
    .map((candidate) => promoteCandidateToReelCache({ ...candidate, status: candidate.status || "approved" }))
    .filter(Boolean)
    .map(candidateToReelCacheRow);
  if (!rows.length) return { promoted: 0, error: null };
  const { error } = await client.from("reel_cache").upsert(rows, { onConflict: "source,source_video_id" });
  if (error) return { promoted: 0, error: error.message };
  return { promoted: rows.length, error: null };
}

async function tmdbCandidates(target) {
  if (!TMDB_API_KEY) return { candidates: [], errors: ["Missing NEXT_PUBLIC_TMDB_API_KEY."] };
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
            candidates.push(normalizeReelCandidate({
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
              quality_score: scoreReelCandidate({ label: video.type, video_title: video.name, thumbnail_url: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg` }, normalizedItem),
              status: "pending",
              discovered_by: "admin_tmdb"
            }));
          });
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { candidates: dedupeReelCandidates(candidates).slice(0, target), errors };
}

async function youtubeCandidates(queries = [], target) {
  if (!YOUTUBE_API_KEY) return { candidates: [], errors: ["Missing YOUTUBE_API_KEY."] };
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
        maxResults: String(RESULT_LIMIT)
      });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        errors.push("YouTube quota/rate limit reached.");
        break;
      }
      if (!response.ok) throw new Error(data?.error?.message || `YouTube ${response.status}`);
      (data.items || []).forEach((video) => {
        const sourceVideoId = video.id?.videoId;
        const videoTitle = video.snippet?.title || query;
        if (!sourceVideoId || rejectUnsafeReelResult({ title: videoTitle })) return;
        const sourceUrl = `https://www.youtube.com/watch?v=${sourceVideoId}`;
        candidates.push(normalizeReelCandidate({
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
        }));
      });
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { candidates: dedupeReelCandidates(candidates).slice(0, target), errors, searches };
}

function manualCandidates(urls = [], target) {
  const candidates = urls.slice(0, target).map((url) => {
    const classified = classifyReelSourceUrl(url);
    if (!classified) return null;
    return normalizeReelCandidate({
      ...classified,
      title: "Manual reel candidate",
      video_title: "Manual reel candidate",
      status: "pending",
      discovered_by: "admin_manual"
    });
  }).filter(Boolean);
  return { candidates: dedupeReelCandidates(candidates), errors: [] };
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
  const source = ["tmdb", "youtube", "manual"].includes(body?.source) ? body.source : "tmdb";
  const target = clampNumber(body?.target, 25, 100);
  const dryRun = body?.dryRun !== false;
  const promote = Boolean(body?.promote);

  let result;
  if (source === "youtube") result = await youtubeCandidates(body?.queries || [], target);
  else if (source === "manual") result = manualCandidates(body?.urls || [], target);
  else result = await tmdbCandidates(target);

  const relevant = result.candidates.filter((candidate) => {
    if (!candidate.item_key && !candidate.tmdb_id) return true;
    return candidateLooksRelevant(candidate, { title: candidate.title, name: candidate.title, id: candidate.tmdb_id, media_type: candidate.media_type });
  });

  let savedCandidates = 0;
  let promotedToCache = 0;
  const errors = [...(result.errors || [])];
  if (!dryRun && client) {
    const saveResult = await saveCandidates(client, relevant);
    savedCandidates = saveResult.saved;
    if (saveResult.error) errors.push(saveResult.error);
    if (promote) {
      const promoteResult = await promoteCandidates(client, relevant.map((candidate) => ({ ...candidate, status: "approved" })));
      promotedToCache = promoteResult.promoted;
      if (promoteResult.error) errors.push(promoteResult.error);
    }
  } else if (!dryRun && !client) {
    errors.push("Supabase server client is not configured.");
  }

  return NextResponse.json({
    checked: relevant.length,
    candidates: relevant,
    savedCandidates,
    promotedToCache,
    skippedDuplicates: result.candidates.length - relevant.length,
    errors,
    dryRun
  });
}
