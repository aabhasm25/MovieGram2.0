import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const DAILY_BUDGET = Math.max(1000, Number(process.env.YOUTUBE_DAILY_QUOTA_BUDGET || 10000));
const RESERVE_RATIO = Math.min(0.2, Math.max(0.05, Number(process.env.YOUTUBE_QUOTA_RESERVE_RATIO || 0.1)));
const PRE_RESET_START_HOUR = Math.min(23, Math.max(0, Number(process.env.YOUTUBE_PRE_RESET_START_HOUR || 22)));
const DAYTIME_SOURCE_LIMIT = Math.min(5, Math.max(1, Number(process.env.YOUTUBE_DAYTIME_SOURCE_LIMIT || 2)));
const PRE_RESET_SEARCH_LIMIT = Math.min(100, Math.max(0, Number(process.env.YOUTUBE_PRE_RESET_SEARCH_LIMIT || 80)));

function serverSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function pacificClock(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour || 0),
    minute: Number(parts.minute || 0)
  };
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/&amp;/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceHandle(sourceUrl = "") {
  try {
    const match = new URL(sourceUrl).pathname.match(/\/@([^/]+)/);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function isoDurationSeconds(value = "") {
  const match = String(value).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function videoLabel(title = "", duration = "") {
  const text = normalize(title);
  if (text.includes("reaction")) return "Reaction";
  if (text.includes("review")) return "Review";
  if (text.includes("breakdown") || text.includes("explained")) return "Breakdown";
  if (text.includes("interview")) return "Interview";
  if (text.includes("behind the scenes") || text.includes(" bts ")) return "Behind the Scenes";
  if (text.includes("clip") || text.includes("scene")) return "Clip";
  if (text.includes("short") || isoDurationSeconds(duration) <= 65) return "Short";
  if (text.includes("trailer")) return "Trailer";
  return "Edit";
}

function quotaFailure(payload = {}, status = 0) {
  const reason = payload?.error?.errors?.[0]?.reason || "";
  return status === 429 || ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(reason);
}

function exactKnownItem(videoTitle = "", items = []) {
  const haystack = ` ${normalize(videoTitle)} `;
  return items.find((item) => {
    const needle = normalize(item.title);
    if (needle.length < 4) return false;
    return haystack.includes(` ${needle} `);
  }) || null;
}

function reelRow(video = {}, item = {}, source = {}) {
  const snippet = video.snippet || {};
  const videoId = video.id?.videoId || video.id;
  const label = videoLabel(snippet.title, video.contentDetails?.duration);
  const now = new Date().toISOString();
  return {
    source: "youtube",
    source_video_id: videoId,
    source_url: `https://www.youtube.com/watch?v=${videoId}`,
    watch_url: `https://www.youtube.com/watch?v=${videoId}`,
    embed_url: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&enablejsapi=1`,
    media_type: item.media_type,
    tmdb_id: item.tmdb_id,
    item_key: item.item_key,
    title: item.title,
    poster_path: item.poster_path || "",
    video_title: snippet.title || item.title,
    channel_title: snippet.channelTitle || source.source_name || "",
    thumbnail_url: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || "",
    spoiler_level: "none",
    tags: [label.toLowerCase().replace(/\s+/g, "_")],
    active: true,
    approved: true,
    playable: true,
    quality_score: Number(source.quality_score || 70) + (label === "Short" ? 24 : label === "Clip" ? 18 : label === "Trailer" ? 4 : 12),
    source_context: "approved_youtube_channel",
    updated_at: now
  };
}

async function readLedger(client, pacificDate) {
  const { data, error } = await client.from("youtube_quota_ledger").select("pacific_date,estimated_units,daily_budget,reserve_units,updated_at").eq("pacific_date", pacificDate).maybeSingle();
  if (error) return { error };
  const reserve = Math.ceil(DAILY_BUDGET * RESERVE_RATIO);
  return {
    used: Number(data?.estimated_units || 0),
    dailyBudget: Number(data?.daily_budget || DAILY_BUDGET),
    reserve: Number(data?.reserve_units || reserve)
  };
}

async function saveLedger(client, pacificDate, ledger) {
  return client.from("youtube_quota_ledger").upsert({
    pacific_date: pacificDate,
    estimated_units: ledger.used,
    daily_budget: ledger.dailyBudget,
    reserve_units: ledger.reserve,
    updated_at: new Date().toISOString()
  }, { onConflict: "pacific_date" });
}

async function youtubeRequest(client, clock, ledger, resource, params, cost) {
  if (ledger.used + cost > ledger.dailyBudget - ledger.reserve) return { stopped: true, reason: "quota_reserve" };
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  Object.entries({ ...params, key: YOUTUBE_API_KEY }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { cache: "no-store" });
  ledger.used += cost;
  await saveLedger(client, clock.date, ledger);
  const payload = await response.json().catch(() => ({}));
  if (quotaFailure(payload, response.status)) return { stopped: true, reason: "youtube_quota", payload };
  if (!response.ok) return { error: payload?.error?.message || `YouTube ${response.status}`, payload };
  return { payload };
}

async function knownItems(client) {
  const { data, error } = await client.from("reel_cache").select("item_key,tmdb_id,media_type,title,poster_path").not("tmdb_id", "is", null).not("item_key", "is", null).order("updated_at", { ascending: false }).limit(700);
  if (error) return { items: [], error };
  const unique = new Map();
  (data || []).forEach((row) => {
    if (!unique.has(row.item_key) && row.title) unique.set(row.item_key, row);
  });
  return { items: [...unique.values()].sort((a, b) => normalize(b.title).length - normalize(a.title).length) };
}

async function resolveSource(client, clock, ledger, source) {
  if (source.uploads_playlist_id && (source.channel_id || source.source_id)) return { source };
  const handle = sourceHandle(source.source_url);
  const params = { part: "snippet,contentDetails", maxResults: 1 };
  if (source.channel_id || source.source_id) params.id = source.channel_id || source.source_id;
  else if (handle) params.forHandle = handle;
  else return { error: "approved_source_missing_channel_identity" };
  const result = await youtubeRequest(client, clock, ledger, "channels", params, 1);
  if (result.stopped || result.error) return result;
  const channel = result.payload?.items?.[0];
  if (!channel?.id) return { error: "youtube_channel_not_found" };
  const resolved = {
    ...source,
    channel_id: channel.id,
    source_id: channel.id,
    uploads_playlist_id: channel.contentDetails?.relatedPlaylists?.uploads || ""
  };
  const { error } = await client.from("creator_sources").update({
    channel_id: resolved.channel_id,
    source_id: resolved.source_id,
    uploads_playlist_id: resolved.uploads_playlist_id,
    updated_at: new Date().toISOString()
  }).eq("id", source.id);
  return error ? { error: error.message } : { source: resolved };
}

async function validateAndSave(client, clock, ledger, rawVideos, items, source) {
  const ids = [...new Set(rawVideos.map((video) => video.id?.videoId || video.contentDetails?.videoId || video.id).filter(Boolean))].slice(0, 50);
  if (!ids.length) return { saved: 0 };
  const validation = await youtubeRequest(client, clock, ledger, "videos", { part: "snippet,status,contentDetails", id: ids.join(",") }, 1);
  if (validation.stopped || validation.error) return validation;
  const rows = (validation.payload?.items || []).map((video) => {
    if (video.status?.privacyStatus !== "public" || video.status?.embeddable === false || video.status?.uploadStatus === "deleted") return null;
    const item = exactKnownItem(video.snippet?.title, items);
    return item ? reelRow(video, item, source) : null;
  }).filter(Boolean);
  if (!rows.length) return { saved: 0 };
  const { data: existing, error: lookupError } = await client.from("reel_cache").select("id,source_video_id").eq("source", "youtube").in("source_video_id", rows.map((row) => row.source_video_id));
  if (lookupError) return { saved: 0, error: lookupError.message };
  const existingByVideo = new Map((existing || []).map((row) => [row.source_video_id, row.id]));
  const inserts = rows.filter((row) => !existingByVideo.has(row.source_video_id));
  const updates = rows.filter((row) => existingByVideo.has(row.source_video_id));
  const writes = [];
  if (inserts.length) writes.push(client.from("reel_cache").insert(inserts));
  updates.forEach((row) => writes.push(client.from("reel_cache").update(row).eq("id", existingByVideo.get(row.source_video_id))));
  const results = await Promise.allSettled(writes);
  const failed = results.find((result) => result.status === "rejected" || result.value?.error);
  return failed ? { saved: 0, error: failed.reason?.message || failed.value?.error?.message || "reel_cache_write_failed" } : { saved: rows.length };
}

async function syncApprovedSource(client, clock, ledger, source, items) {
  const resolved = await resolveSource(client, clock, ledger, source);
  if (resolved.stopped || resolved.error) return resolved;
  const activeSource = resolved.source;
  if (!activeSource.uploads_playlist_id) return { error: "youtube_uploads_playlist_missing" };
  const listing = await youtubeRequest(client, clock, ledger, "playlistItems", {
    part: "snippet,contentDetails",
    playlistId: activeSource.uploads_playlist_id,
    maxResults: Math.min(50, Math.max(5, Number(activeSource.import_limit || 12)))
  }, 1);
  if (listing.stopped || listing.error) return listing;
  const cutoff = activeSource.last_video_published_at ? new Date(activeSource.last_video_published_at).getTime() : 0;
  const uploads = (listing.payload?.items || []).filter((entry) => new Date(entry.contentDetails?.videoPublishedAt || entry.snippet?.publishedAt || 0).getTime() > cutoff);
  const saved = await validateAndSave(client, clock, ledger, uploads, items, activeSource);
  if (saved.stopped) return saved;
  const newest = uploads.map((entry) => entry.contentDetails?.videoPublishedAt || entry.snippet?.publishedAt).filter(Boolean).sort().at(-1);
  await client.from("creator_sources").update({
    last_synced_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    last_video_published_at: newest || activeSource.last_video_published_at || null,
    updated_at: new Date().toISOString()
  }).eq("id", activeSource.id);
  return { saved: Number(saved.saved || 0), checked: uploads.length };
}

async function preResetExpansion(client, clock, ledger, items) {
  const { data: approvedSources, error: sourceError } = await client
    .from("creator_sources")
    .select("channel_id,source_id,source_name,quality_score")
    .eq("platform", "youtube")
    .eq("approved", true)
    .eq("enabled", true)
    .not("channel_id", "is", null)
    .order("quality_score", { ascending: false })
    .limit(25);
  if (sourceError || !approvedSources?.length) return { skipped: true, reason: sourceError?.message || "approved_channels_not_resolved" };
  let searches = 0;
  let saved = 0;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const source = approvedSources[index % approvedSources.length];
    if (searches >= PRE_RESET_SEARCH_LIMIT || ledger.used + 101 > ledger.dailyBudget - ledger.reserve) break;
    const query = `${item.title} official clip review reaction`;
    const result = await youtubeRequest(client, clock, ledger, "search", {
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 10,
      order: "relevance",
      channelId: source.channel_id || source.source_id,
      videoEmbeddable: "true",
      safeSearch: "moderate"
    }, 100);
    if (result.stopped) return { searches, saved, stopped: result.reason };
    if (result.error) continue;
    searches += 1;
    const stored = await validateAndSave(client, clock, ledger, result.payload?.items || [], [item], source);
    if (stored.stopped) return { searches, saved, stopped: stored.reason };
    saved += Number(stored.saved || 0);
  }
  return { searches, saved };
}

export async function runYouTubeReelAutomation() {
  const client = serverSupabase();
  if (!client || !YOUTUBE_API_KEY) return { disabled: true, reason: "server_credentials_missing" };
  const clock = pacificClock();
  const ledger = await readLedger(client, clock.date);
  if (ledger.error) return { disabled: true, reason: "quota_ledger_schema_required", error: ledger.error.message };
  const library = await knownItems(client);
  if (library.error) return { disabled: true, reason: "reel_cache_unavailable", error: library.error.message };

  const dueBefore = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: sources, error: sourcesError } = await client
    .from("creator_sources")
    .select("id,source_name,source_url,source_id,channel_id,uploads_playlist_id,enabled,approved,quality_score,last_synced_at,last_video_published_at,import_limit")
    .eq("platform", "youtube")
    .eq("approved", true)
    .eq("enabled", true)
    .or(`last_synced_at.is.null,last_synced_at.lt.${dueBefore}`)
    .order("quality_score", { ascending: false })
    .limit(DAYTIME_SOURCE_LIMIT);
  if (sourcesError) return { disabled: true, reason: "creator_source_schema_required", error: sourcesError.message };

  let saved = 0;
  let checked = 0;
  for (const source of sources || []) {
    const result = await syncApprovedSource(client, clock, ledger, source, library.items);
    if (result.stopped) return { saved, checked, stopped: result.reason, quota: ledger };
    saved += Number(result.saved || 0);
    checked += Number(result.checked || 0);
  }

  const preReset = clock.hour >= PRE_RESET_START_HOUR;
  const expansion = preReset ? await preResetExpansion(client, clock, ledger, library.items) : { skipped: true };
  return {
    pacificDate: clock.date,
    pacificHour: clock.hour,
    preReset,
    sourcesChecked: (sources || []).length,
    uploadsChecked: checked,
    saved: saved + Number(expansion.saved || 0),
    expansion,
    estimatedQuota: { used: ledger.used, budget: ledger.dailyBudget, reserve: ledger.reserve }
  };
}
