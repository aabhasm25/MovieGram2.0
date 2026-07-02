import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  classifyReelSourceUrl,
  rejectUnsafeReelResult,
  scoreDiscoveredReelResult
} from "../../../lib/reelDiscovery.js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const BING_SEARCH_API_KEY = process.env.BING_SEARCH_API_KEY;
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const DAY_MS = 24 * 60 * 60 * 1000;

function serverSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function mediaType(item = {}) {
  return item.media_type || (item.first_air_date || item.name ? "tv" : "movie");
}

function titleOf(item = {}) {
  return item.title || item.name || "Untitled";
}

function itemKeyOf(item = {}) {
  return `${mediaType(item)}:${item.id}`;
}

function isQuotaError(status, message = "") {
  return status === 429 || /quota|rate limit|rate_limit|exceeded/i.test(message || "");
}

async function recentDiscoveryExists(client, provider, query) {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count } = await client
    .from("discovery_jobs")
    .select("id", { count: "exact", head: true })
    .eq("provider", provider)
    .eq("query", query)
    .gt("created_at", since);
  return Boolean(count);
}

async function saveDiscoveryJob(client, row) {
  await client.from("discovery_jobs").insert({
    ...row,
    updated_at: new Date().toISOString(),
    last_run_at: new Date().toISOString()
  });
}

async function searchWeb(query, provider) {
  if (provider === "google" && GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
    const params = new URLSearchParams({ key: GOOGLE_SEARCH_API_KEY, cx: GOOGLE_SEARCH_ENGINE_ID, q: query, num: "3" });
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data?.error?.message || `Google search ${response.status}`), { status: response.status });
    return (data.items || []).map((item) => ({ title: item.title, snippet: item.snippet, link: item.link, thumbnail_url: item.pagemap?.cse_thumbnail?.[0]?.src || "" }));
  }
  if (provider === "bing" && BING_SEARCH_API_KEY) {
    const params = new URLSearchParams({ q: query, count: "3" });
    const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params.toString()}`, { headers: { "Ocp-Apim-Subscription-Key": BING_SEARCH_API_KEY }, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data?.message || `Bing search ${response.status}`), { status: response.status });
    return (data.webPages?.value || []).map((item) => ({ title: item.name, snippet: item.snippet, link: item.url, thumbnail_url: "" }));
  }
  if (provider === "brave" && BRAVE_SEARCH_API_KEY) {
    const params = new URLSearchParams({ q: query, count: "3" });
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, { headers: { "X-Subscription-Token": BRAVE_SEARCH_API_KEY }, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data?.message || `Brave search ${response.status}`), { status: response.status });
    return (data.web?.results || []).map((item) => ({ title: item.title, snippet: item.description, link: item.url, thumbnail_url: item.thumbnail?.src || "" }));
  }
  return [];
}

async function upsertReelRows(client, rows) {
  if (!rows.length) return 0;
  const { error } = await client.from("reel_cache").upsert(rows, { onConflict: "source,source_video_id" });
  if (error) {
    console.error("MovieGram light reel_cache upsert failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return 0;
  }
  return rows.length;
}

async function runTinyWebDiscovery(client, candidates) {
  const providers = [
    GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID ? "google" : "",
    BING_SEARCH_API_KEY ? "bing" : "",
    BRAVE_SEARCH_API_KEY ? "brave" : ""
  ].filter(Boolean);
  let calls = 0;
  let saved = 0;
  let rateLimited = false;
  for (const candidate of candidates.slice(0, 2)) {
    if (calls >= 2 || rateLimited) break;
    const item = candidate.item || {};
    const title = titleOf(item);
    const query = `${title} edit site:instagram.com/reel OR site:facebook.com/reel OR site:youtube.com/shorts`;
    const provider = providers[calls % Math.max(1, providers.length)];
    if (!provider || await recentDiscoveryExists(client, provider, query)) continue;
    calls += 1;
    try {
      const results = await searchWeb(query, provider);
      const rows = results
        .filter((result) => !rejectUnsafeReelResult(result))
        .map((result) => {
          const classified = classifyReelSourceUrl(result.link || "", result);
          if (!classified) return null;
          const now = new Date().toISOString();
          return {
            ...classified,
            media_type: mediaType(item),
            tmdb_id: Number(item.id),
            item_key: itemKeyOf(item),
            title,
            video_title: result.title || title,
            channel_title: "",
            creator_username: "",
            thumbnail_url: result.thumbnail_url || item.backdrop_path || item.poster_path || "",
            reason: candidate.reason || `Discovered for ${title}`,
            source_context: "light_discovery",
            approved: true,
            playable: Boolean(classified.source_url || classified.watch_url || classified.embed_url),
            quality_score: scoreDiscoveredReelResult(result, title),
            last_checked_at: now,
            updated_at: now
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.quality_score - a.quality_score)
        .slice(0, 2);
      saved += await upsertReelRows(client, rows);
      await saveDiscoveryJob(client, { job_type: "reel_light_discovery", status: "done", provider, query, title, item_key: itemKeyOf(item), media_type: mediaType(item), tmdb_id: item.id, results_found: results.length, playable_saved: rows.length });
    } catch (error) {
      rateLimited = isQuotaError(error.status, error.message);
      await saveDiscoveryJob(client, { job_type: "reel_light_discovery", status: rateLimited ? "rate_limited" : "failed", provider, query, title, item_key: itemKeyOf(item), media_type: mediaType(item), tmdb_id: item.id, error_message: error.message });
    }
  }
  return { calls, saved, rateLimited };
}

async function runOneYouTubeSearch(client, candidates, youtubeCallsUsed, youtubeBlocked) {
  if (!YOUTUBE_API_KEY || youtubeBlocked || Number(youtubeCallsUsed || 0) >= 2) return { calls: 0, saved: 0, quota: false };
  const candidate = candidates[0];
  if (!candidate?.item?.id) return { calls: 0, saved: 0, quota: false };
  const item = candidate.item;
  const title = titleOf(item);
  const query = `${title} official clip`;
  if (await recentDiscoveryExists(client, "youtube", query)) return { calls: 0, saved: 0, quota: false };
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: "snippet",
    q: query,
    type: "video",
    videoEmbeddable: "true",
    videoDuration: "short",
    safeSearch: "moderate",
    maxResults: "5"
  });
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const quota = isQuotaError(response.status, data?.error?.message);
      await saveDiscoveryJob(client, { job_type: "reel_light_youtube", status: quota ? "rate_limited" : "failed", provider: "youtube", query, title, item_key: itemKeyOf(item), media_type: mediaType(item), tmdb_id: item.id, error_message: data?.error?.message || `YouTube ${response.status}` });
      return { calls: 1, saved: 0, quota };
    }
    const now = new Date().toISOString();
    const rows = (data.items || [])
      .map((video) => {
        const sourceVideoId = video.id?.videoId;
        if (!sourceVideoId) return null;
        return {
          source: "youtube",
          source_video_id: sourceVideoId,
          source_url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
          media_type: mediaType(item),
          tmdb_id: Number(item.id),
          item_key: itemKeyOf(item),
          title,
          video_title: video.snippet?.title || title,
          channel_title: video.snippet?.channelTitle || "",
          creator_username: video.snippet?.channelTitle || "",
          thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || "",
          embed_url: `https://www.youtube.com/embed/${sourceVideoId}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&enablejsapi=1`,
          watch_url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
          label: "Edit",
          reason: candidate.reason || `Because MovieGram picked ${title}`,
          source_context: "light_discovery",
          approved: true,
          playable: true,
          quality_score: 55,
          last_checked_at: now,
          updated_at: now
        };
      })
      .filter(Boolean)
      .slice(0, 1);
    const saved = await upsertReelRows(client, rows);
    await saveDiscoveryJob(client, { job_type: "reel_light_youtube", status: "done", provider: "youtube", query, title, item_key: itemKeyOf(item), media_type: mediaType(item), tmdb_id: item.id, results_found: data.items?.length || 0, playable_saved: saved });
    return { calls: 1, saved, quota: false };
  } catch (error) {
    const quota = isQuotaError(error.status, error.message);
    await saveDiscoveryJob(client, { job_type: "reel_light_youtube", status: quota ? "rate_limited" : "failed", provider: "youtube", query, title, item_key: itemKeyOf(item), media_type: mediaType(item), tmdb_id: item.id, error_message: error.message });
    return { calls: 1, saved: 0, quota };
  }
}

export async function POST(request) {
  const client = serverSupabase();
  if (!client) return NextResponse.json({ saved: 0, disabled: true });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ saved: 0, error: "Invalid request." }, { status: 400 });
  }
  const candidates = (body?.candidates || [])
    .map((candidate) => ({ ...candidate, item: candidate.item || {} }))
    .filter((candidate) => candidate.item?.id)
    .slice(0, 2);
  if (!candidates.length) return NextResponse.json({ saved: 0 });

  const itemKeys = candidates.map((candidate) => itemKeyOf(candidate.item));
  const { count } = await client
    .from("reel_cache")
    .select("id", { count: "exact", head: true })
    .in("item_key", itemKeys)
    .eq("approved", true)
    .eq("playable", true);
  if ((count || 0) >= 3) return NextResponse.json({ saved: 0, skipped: "cache_sufficient" });

  const web = await runTinyWebDiscovery(client, candidates);
  const youtube = await runOneYouTubeSearch(client, candidates, body?.youtube_calls_used, body?.youtube_blocked || web.rateLimited);
  return NextResponse.json({
    saved: web.saved + youtube.saved,
    webCalls: web.calls,
    youtubeCalls: youtube.calls,
    youtubeQuota: youtube.quota,
    rateLimited: web.rateLimited || youtube.quota
  });
}
