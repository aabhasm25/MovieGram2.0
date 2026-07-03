import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assessCandidateRelevance,
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
const ENRICH_SEARCH_LIMIT = 20;

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

function scoreForItem(candidate, item = {}) {
  const relevance = assessCandidateRelevance(candidate, item);
  return {
    ...candidate,
    match_score: relevance.match_score,
    rejection_reason: relevance.rejection_reason,
    status: relevance.accepted ? candidate.status || "pending" : "rejected",
    quality_score: scoreReelCandidate(candidate, item)
  };
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

async function checkDiscoveryDb(client) {
  if (!client) return { ready: false, errors: ["Supabase server client is not configured."] };
  const tables = ["creator_sources", "reel_candidates", "discovery_jobs", "reel_failures"];
  const results = {};
  const errors = [];
  for (const table of tables) {
    const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
    if (error) {
      results[table] = false;
      errors.push(safeError(error));
    } else {
      results[table] = true;
      results[`${table}_count`] = count || 0;
    }
  }
  return { ready: tables.every((table) => results[table]), tables: results, errors: [...new Set(errors)] };
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
  const relevance = assessCandidateRelevance(normalized, { title: normalized.title, name: normalized.title, id: normalized.tmdb_id, media_type: normalized.media_type });
  const manualOverride = normalized.discovered_by === "admin_manual";
  if (!manualOverride && (!relevance.accepted || Number(normalized.quality_score || 0) < 120 || Number(normalized.match_score || relevance.match_score || 0) < 35)) {
    return { promoted: 0, skippedDuplicates: 0, errors: [`Low relevance candidate not promoted: ${relevance.rejection_reason || "threshold not met"}`] };
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
  const failureResult = normalized.source_video_id
    ? await client.from("reel_failures").select("id", { count: "exact", head: true }).eq("source_video_id", normalized.source_video_id)
    : { count: 0, error: null };
  if (failureResult.error && !isMissingTableError(failureResult.error)) return { promoted: 0, skippedDuplicates: 0, errors: [safeError(failureResult.error)] };
  if (failureResult.count) return { promoted: 0, skippedDuplicates: 0, errors: ["Candidate has a known embed/playback failure."] };
  const row = promoteCandidateToReelCache(normalized) || candidateToReelCacheRow({ ...normalized, status: "approved" });
  const { error: upsertError } = await client.from("reel_cache").upsert(row, { onConflict: "source,source_video_id" });
  if (upsertError) return { promoted: 0, skippedDuplicates: 0, errors: [safeError(upsertError)] };
  await client.from("reel_candidates").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id);
  return {
    promoted: 1,
    skippedDuplicates: 0,
    promotedList: [{
      title: row.title,
      video_title: row.video_title,
      source: row.source,
      item_key: row.item_key,
      format: normalized.content_format,
      aspect_mode: normalized.aspect_mode,
      score: normalized.quality_score
    }],
    errors: manualOverride && !relevance.accepted ? ["Warning: manually promoted low-relevance candidate."] : []
  };
}

async function promoteTopSafeCandidates(client, limit = 25) {
  if (!client) return { promoted: 0, skippedDuplicates: 0, errors: ["Supabase server client is not configured."] };
  const { data, error } = await client
    .from("reel_candidates")
    .select("*")
    .in("status", ["approved", "pending"])
    .order("quality_score", { ascending: false })
    .limit(clampNumber(limit, 25, 100));
  if (error) return { promoted: 0, skippedDuplicates: 0, errors: [safeError(error)] };
  let promoted = 0;
  let skippedDuplicates = 0;
  const promotedList = [];
  const errors = [];
  for (const candidate of data || []) {
    const normalized = normalizeReelCandidate({ ...candidate, status: "approved" });
    if (normalized.rejection_reason || Number(normalized.quality_score || 0) < 145 || Number(normalized.match_score || 0) < 45 || normalized.source !== "youtube") continue;
    const result = await promoteCandidateById(client, candidate.id);
    promoted += result.promoted || 0;
    skippedDuplicates += result.skippedDuplicates || 0;
    promotedList.push(...(result.promotedList || []));
    errors.push(...(result.errors || []));
  }
  return { promoted, skippedDuplicates, errors, promotedList };
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
            candidates.push(scoreForItem(candidate, normalizedItem));
          });
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { candidates: dedupeReelCandidates(candidates).slice(0, target), errors };
}

async function tmdbCandidatesForItems(items = [], targetPerItem = 5) {
  if (!TMDB_API_KEY) return { candidates: [], errors: ["Missing TMDB_API_KEY or NEXT_PUBLIC_TMDB_API_KEY."] };
  const errors = [];
  const candidates = [];
  for (const rawItem of items) {
    const item = { ...rawItem, media_type: mediaType(rawItem) };
    if (!item.id) continue;
    try {
      const videosUrl = `https://api.themoviedb.org/3/${mediaType(item)}/${item.id}/videos?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;
      const response = await fetch(videosUrl, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.status_message || `TMDB videos ${response.status}`);
      (data.results || [])
        .filter((video) => video.site === "YouTube" && video.key && ["Clip", "Teaser", "Featurette", "Behind the Scenes", "Trailer"].includes(video.type))
        .sort((a, b) => {
          const ranks = { Clip: 100, Teaser: 80, Featurette: 72, "Behind the Scenes": 68, Trailer: 35 };
          return (ranks[b.type] || 0) - (ranks[a.type] || 0) + (Number(b.official) - Number(a.official)) * 10;
        })
        .slice(0, targetPerItem)
        .forEach((video) => {
          const sourceUrl = `https://www.youtube.com/watch?v=${video.key}`;
          const candidate = normalizeReelCandidate({
            source: "youtube",
            source_video_id: video.key,
            source_url: sourceUrl,
            watch_url: sourceUrl,
            media_type: mediaType(item),
            tmdb_id: item.id,
            item_key: itemKeyOf(item),
            title: titleOf(item),
            video_title: video.name,
            channel_title: "TMDB",
            creator_username: "TMDB",
            thumbnail_url: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
            label: video.type,
            content_format: video.type === "Clip" ? "clip" : video.type === "Teaser" ? "teaser" : video.type === "Featurette" ? "featurette" : video.type === "Behind the Scenes" ? "behind_the_scenes" : "trailer",
            aspect_mode: "horizontal",
            status: "pending",
            discovered_by: "admin_enrich_tmdb"
          });
          const scored = scoreForItem(candidate, item);
          candidates.push({ ...scored, quality_score: scored.quality_score + (video.official ? 10 : 0) });
        });
    } catch (error) {
      errors.push(`${titleOf(item)}: ${error.message}`);
    }
  }
  return { candidates: dedupeReelCandidates(candidates), errors };
}

function youtubeQueriesForEnrichment(item = {}, preferNonTrailers = true) {
  const title = titleOf(item);
  const year = String(item.year || item.release_year || item.release_date || item.first_air_date || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
  const titleWithYear = year ? `${title} ${year}` : title;
  const queries = [
    `${titleWithYear} movie scene short`,
    `${titleWithYear} official clip`,
    `${title} movie clip`,
    `${title} scene`
  ];
  queries.push(`${title} trailer`);
  return queries;
}

async function youtubeCandidatesForItems(items = [], remainingBudget = 0, preferNonTrailers = true) {
  if (!YOUTUBE_API_KEY || remainingBudget <= 0) return { candidates: [], errors: YOUTUBE_API_KEY ? [] : ["Missing server-only YOUTUBE_API_KEY."] };
  const errors = [];
  const candidates = [];
  let searches = 0;
  for (const rawItem of items) {
    if (searches >= remainingBudget) break;
    const item = { ...rawItem, media_type: mediaType(rawItem) };
    for (const query of youtubeQueriesForEnrichment(item, preferNonTrailers)) {
      if (searches >= remainingBudget) break;
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
        if (!query.toLowerCase().includes("trailer")) params.set("videoDuration", "short");
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          errors.push(data?.error?.message || `YouTube ${response.status}`);
          if (isQuotaError(response.status, data?.error?.message)) return { candidates, errors, searches, quota: true };
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
            media_type: mediaType(item),
            tmdb_id: item.id,
            item_key: itemKeyOf(item),
            title: titleOf(item),
            video_title: videoTitle,
            channel_title: video.snippet?.channelTitle || "",
            creator_username: video.snippet?.channelTitle || "",
            thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || "",
            label: query.toLowerCase().includes("trailer") ? "Trailer" : query.toLowerCase().includes("teaser") ? "Teaser" : query.toLowerCase().includes("behind") ? "Behind the Scenes" : query.toLowerCase().includes("short") ? "Short" : query.toLowerCase().includes("scene") ? "Scene Edit" : "Clip",
            status: "pending",
            discovered_by: "admin_enrich_youtube"
          });
          candidates.push(scoreForItem(candidate, item));
        });
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  return { candidates: dedupeReelCandidates(candidates), errors, searches, quota: false };
}

function isTrailerLike(row = {}) {
  return /trailer/i.test(`${row.label || ""} ${row.video_title || ""} ${row.title || ""}`);
}

async function existingCacheCoverageByItem(client, items = []) {
  const itemKeys = items.map(itemKeyOf).filter(Boolean);
  const coverage = new Map(itemKeys.map((key) => [key, { cachedReels: 0, trailers: 0, nonTrailers: 0 }]));
  if (!client || !itemKeys.length) return coverage;
  const { data, error } = await client
    .from("reel_cache")
    .select("item_key,label,video_title,title")
    .in("item_key", itemKeys)
    .or("playable.eq.true,source_video_id.not.is.null,source_url.not.is.null,watch_url.not.is.null,embed_url.not.is.null");
  if (error) return coverage;
  (data || []).forEach((row) => {
    if (!coverage.has(row.item_key)) coverage.set(row.item_key, { cachedReels: 0, trailers: 0, nonTrailers: 0 });
    const entry = coverage.get(row.item_key);
    entry.cachedReels += 1;
    if (isTrailerLike(row)) entry.trailers += 1;
    else entry.nonTrailers += 1;
  });
  return coverage;
}

async function promoteHighConfidenceRows(client, candidates = []) {
  if (!client || !candidates.length) return { promoted: 0, skippedDuplicates: 0, errors: [] };
  let promoted = 0;
  let skippedDuplicates = 0;
  const promotedList = [];
  const errors = [];
  const safeCandidates = candidates
    .filter((candidate) => candidate.source === "youtube")
    .filter((candidate) => !candidate.rejection_reason)
    .filter((candidate) => Number(candidate.quality_score || 0) >= 145 && Number(candidate.match_score || 0) >= 45)
    .slice(0, 50);
  for (const candidate of safeCandidates) {
    const row = candidateToReelCacheRow({ ...candidate, status: "approved" });
    const duplicateFilters = [
      row.source_video_id ? `source_video_id.eq.${row.source_video_id}` : "",
      row.source_url ? `source_url.eq.${row.source_url}` : "",
      row.watch_url ? `watch_url.eq.${row.watch_url}` : "",
      row.embed_url ? `embed_url.eq.${row.embed_url}` : ""
    ].filter(Boolean);
    const duplicateResult = duplicateFilters.length
      ? await client.from("reel_cache").select("id", { count: "exact", head: true }).or(duplicateFilters.join(","))
      : { count: 0, error: null };
    if (duplicateResult.error) {
      errors.push(safeError(duplicateResult.error));
      continue;
    }
    if (duplicateResult.count) {
      skippedDuplicates += duplicateResult.count;
      continue;
    }
    const failureResult = row.source_video_id
      ? await client.from("reel_failures").select("id", { count: "exact", head: true }).eq("source_video_id", row.source_video_id)
      : { count: 0, error: null };
    if (failureResult.error && !isMissingTableError(failureResult.error)) {
      errors.push(safeError(failureResult.error));
      continue;
    }
    if (failureResult.count) continue;
    const { error } = await client.from("reel_cache").upsert(row, { onConflict: "source,source_video_id" });
    if (error) errors.push(safeError(error));
    else {
      promoted += 1;
      promotedList.push({
        title: row.title,
        video_title: row.video_title,
        source: row.source,
        item_key: row.item_key,
        format: candidate.content_format,
        aspect_mode: candidate.aspect_mode,
        score: candidate.quality_score
      });
    }
  }
  return { promoted, skippedDuplicates, errors, promotedList };
}

async function enrichLibraryReels(client, body = {}) {
  const targetPerItem = clampNumber(body.targetPerItem, 5, 10);
  const maxItems = clampNumber(body.maxItems, 50, 100);
  const preferNonTrailers = body.preferNonTrailers !== false;
  const dryRun = body.dryRun !== false;
  const items = (body.items || []).filter((item) => item?.id).slice(0, maxItems).map((item) => ({ ...item, media_type: mediaType(item) }));
  const firstTitles = items.slice(0, 5).map(titleOf);
  if (!items.length) {
    return {
      itemsSent: 0,
      firstTitles: [],
      checkedItems: 0,
      underfilledItems: 0,
      perItemCoverage: [],
      candidates: [],
      candidatesFound: 0,
      rejectedLowRelevance: 0,
      rejectedWrongSequel: 0,
      savedCandidates: 0,
      promotedToCache: 0,
      skippedDuplicates: 0,
      errors: ["No items supplied from client."],
      dryRun,
      youtubeSearches: 0,
      quota: false
    };
  }
  const existingCoverage = await existingCacheCoverageByItem(client, items);
  const perItemCoverage = items.map((item) => {
    const key = itemKeyOf(item);
    const coverage = existingCoverage.get(key) || { cachedReels: 0, trailers: 0, nonTrailers: 0 };
    return {
      title: titleOf(item),
      item_key: key,
      cachedReels: coverage.cachedReels || 0,
      trailers: coverage.trailers || 0,
      nonTrailers: coverage.nonTrailers || 0,
      needsMore: (coverage.cachedReels || 0) < targetPerItem
    };
  });
  const needs = items.filter((item) => perItemCoverage.find((entry) => entry.item_key === itemKeyOf(item))?.needsMore);
  const message = needs.length ? "" : `All ${items.length} supplied items already have at least ${targetPerItem} cached playable reels.`;
  const tmdb = await tmdbCandidatesForItems(needs, targetPerItem);
  const youtubeBudget = Math.min(ENRICH_SEARCH_LIMIT, Math.max(0, Number(body.youtubeSearchBudget || 5)));
  const youtube = await youtubeCandidatesForItems(needs, youtubeBudget, preferNonTrailers);
  const candidates = dedupeReelCandidates([...tmdb.candidates, ...youtube.candidates])
    .sort((a, b) => Number(b.quality_score || 0) - Number(a.quality_score || 0));
  const rejectedLowRelevance = candidates.filter((candidate) => candidate.rejection_reason || candidate.status === "rejected").length;
  const rejectedWrongSequel = candidates.filter((candidate) => candidate.rejection_reason === "wrong_sequel_or_year").length;
  const strictCandidates = candidates.filter((candidate) => !candidate.rejection_reason && candidate.status !== "rejected");
  const errors = [...tmdb.errors, ...youtube.errors];
  let savedCandidates = 0;
  let promotedToCache = 0;
  let skippedDuplicates = 0;
  let promotedList = [];
  if (!dryRun && client) {
    const saveResult = await saveCandidates(client, strictCandidates);
    savedCandidates = saveResult.saved;
    if (saveResult.error) errors.push(saveResult.error);
  }
  return {
    itemsSent: items.length,
    firstTitles,
    message,
    checkedItems: items.length,
    underfilledItems: needs.length,
    perItemCoverage,
    candidates,
    candidatesFound: candidates.length,
    rejectedLowRelevance,
    rejectedWrongSequel,
    savedCandidates,
    promotedToCache,
    promotedList,
    skippedDuplicates,
    errors,
    dryRun,
    youtubeSearches: youtube.searches || 0,
    quota: Boolean(youtube.quota)
  };
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
        candidates.push(scoreForItem(candidate, { title: query }));
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
      tmdb_id: raw.tmdb_id || raw.tmdbId || null,
      media_type: raw.media_type || raw.mediaType || undefined,
      item_key: raw.item_key || (raw.tmdb_id || raw.tmdbId ? `${raw.media_type || raw.mediaType || "movie"}:${raw.tmdb_id || raw.tmdbId}` : undefined),
      content_format: raw.content_format || raw.contentFormat || undefined,
      aspect_mode: raw.aspect_mode || raw.aspectMode || undefined,
      status: "pending",
      discovered_by: "admin_manual"
    });
    return scoreForItem(candidate, { title: raw.title || candidate.title });
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

  if (action === "list" || action === "list_pending") {
    const listed = await listCandidates(client, body?.status || "pending", target);
    return NextResponse.json({ checked: listed.candidates.length, candidates: listed.candidates, savedCandidates: 0, promotedToCache: 0, skippedDuplicates: 0, errors: listed.errors, dryRun: true });
  }

  if (action === "check_db") {
    const status = await checkDiscoveryDb(client);
    return NextResponse.json({ checked: 4, candidates: [], savedCandidates: 0, promotedToCache: 0, skippedDuplicates: 0, errors: status.errors, dryRun: true, discoveryReady: status.ready, tables: status.tables });
  }

  if (["enrich_watched_reels", "enrich_watchlist_reels", "enrich_favorite_reels", "enrich_friend_reels"].includes(action)) {
    const enrichment = await enrichLibraryReels(client, body);
    await saveDiscoveryJob(client, {
      job_type: action,
      status: enrichment.errors.length ? "failed" : "done",
      source: "admin",
      target_count: Number(body.targetPerItem || 5),
      checked_count: enrichment.checkedItems,
      saved_count: enrichment.savedCandidates,
      error_count: enrichment.errors.length,
      error_message: enrichment.errors.join("; ").slice(0, 500)
    });
    return NextResponse.json({
      itemsSent: enrichment.itemsSent,
      firstTitles: enrichment.firstTitles,
      message: enrichment.message,
      checked: enrichment.checkedItems,
      checkedItems: enrichment.checkedItems,
      underfilledItems: enrichment.underfilledItems,
      perItemCoverage: enrichment.perItemCoverage,
      candidates: enrichment.candidates,
      candidatesFound: enrichment.candidatesFound,
      rejectedLowRelevance: enrichment.rejectedLowRelevance,
      rejectedWrongSequel: enrichment.rejectedWrongSequel,
      savedCandidates: enrichment.savedCandidates,
      promotedToCache: enrichment.promotedToCache,
      promotedList: enrichment.promotedList,
      skippedDuplicates: enrichment.skippedDuplicates,
      errors: enrichment.errors,
      dryRun: enrichment.dryRun,
      youtubeSearches: enrichment.youtubeSearches,
      quota: enrichment.quota
    });
  }

  if (action === "approve" || action === "approve_selected" || action === "reject") {
    const updated = await updateCandidateStatus(client, body?.candidateId, action === "approve" ? "approved" : "rejected", body?.rejectionReason || "");
    return NextResponse.json({ checked: updated.candidate ? 1 : 0, candidates: updated.candidate ? [updated.candidate] : [], savedCandidates: 0, promotedToCache: 0, skippedDuplicates: 0, errors: updated.errors, dryRun: true });
  }

  if (action === "promote" || action === "promote_selected") {
    const promoted = await promoteCandidateById(client, body?.candidateId);
    await saveDiscoveryJob(client, { job_type: "candidate_promote", status: promoted.errors.length ? "failed" : "done", source: "admin", saved_count: promoted.promoted, error_count: promoted.errors.length, error_message: promoted.errors.join("; ") });
    return NextResponse.json({ checked: 1, candidates: [], savedCandidates: 0, promotedToCache: promoted.promoted, promotedList: promoted.promotedList || [], skippedDuplicates: promoted.skippedDuplicates, errors: promoted.errors, dryRun: false });
  }

  if (action === "promote_top" || action === "promote_top_safe") {
    const promoted = await promoteTopSafeCandidates(client, target);
    await saveDiscoveryJob(client, { job_type: "candidate_promote_top", status: promoted.errors.length ? "failed" : "done", source: "admin", saved_count: promoted.promoted, error_count: promoted.errors.length, error_message: promoted.errors.join("; ") });
    return NextResponse.json({ checked: target, candidates: [], savedCandidates: 0, promotedToCache: promoted.promoted, promotedList: promoted.promotedList || [], skippedDuplicates: promoted.skippedDuplicates, errors: promoted.errors, dryRun: false });
  }

  const source = ["tmdb", "youtube", "manual"].includes(body?.source) ? body.source : "tmdb";
  const result = await discoverCandidates(source, body, target);
  const relevant = result.candidates.filter((candidate) => {
    if (candidate.rejection_reason || candidate.status === "rejected") return false;
    if (!candidate.item_key && !candidate.tmdb_id) return true;
    return candidateLooksRelevant(candidate, { title: candidate.title, name: candidate.title, id: candidate.tmdb_id, media_type: candidate.media_type });
  });
  const rejectedLowRelevance = result.candidates.length - relevant.length;
  const rejectedWrongSequel = result.candidates.filter((candidate) => candidate.rejection_reason === "wrong_sequel_or_year").length;
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
    candidatesFound: relevant.length,
    savedCandidates,
    promotedToCache: 0,
    skippedDuplicates,
    rejectedLowRelevance,
    rejectedWrongSequel,
    youtubeSearches: result.searches || 0,
    errors,
    dryRun
  });
}
