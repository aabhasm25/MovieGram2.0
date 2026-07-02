import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const BING_SEARCH_API_KEY = process.env.BING_SEARCH_API_KEY;
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const DISCOVERY_BATCH_LIMIT = 20;
const QUERY_LIMIT_PER_TITLE = 3;
const RESULT_LIMIT_PER_QUERY = 5;
const TARGET_PLAYABLE_REELS = 500;
const INTERNAL_YOUTUBE_SEED_SEARCH_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export const officialCreatorSourceSeeds = [
  { platform: "youtube", source_name: "Marvel Entertainment", source_url: "https://www.youtube.com/@marvel", source_type: "official_channel", genres: ["superhero", "action"], keywords: ["marvel", "trailer", "clip"], quality_score: 95 },
  { platform: "youtube", source_name: "HBO", source_url: "https://www.youtube.com/@HBO", source_type: "official_channel", genres: ["drama", "prestige"], keywords: ["hbo", "max", "official"], quality_score: 94 },
  { platform: "youtube", source_name: "Warner Bros. Pictures", source_url: "https://www.youtube.com/@WarnerBrosPictures", source_type: "studio", genres: ["movie", "action"], keywords: ["warner bros", "trailer", "clip"], quality_score: 94 },
  { platform: "youtube", source_name: "Sony Pictures Entertainment", source_url: "https://www.youtube.com/@SonyPictures", source_type: "studio", genres: ["movie"], keywords: ["sony pictures", "official"], quality_score: 92 },
  { platform: "youtube", source_name: "Universal Pictures", source_url: "https://www.youtube.com/@UniversalPictures", source_type: "studio", genres: ["movie"], keywords: ["universal", "official"], quality_score: 92 },
  { platform: "youtube", source_name: "Netflix", source_url: "https://www.youtube.com/@Netflix", source_type: "ott", genres: ["series", "movie"], keywords: ["netflix", "clip", "trailer"], quality_score: 93 },
  { platform: "youtube", source_name: "Prime Video", source_url: "https://www.youtube.com/@PrimeVideo", source_type: "ott", genres: ["series", "movie"], keywords: ["prime video", "clip", "trailer"], quality_score: 91 },
  { platform: "youtube", source_name: "Disney", source_url: "https://www.youtube.com/@Disney", source_type: "studio", genres: ["family", "adventure"], keywords: ["disney", "official"], quality_score: 91 },
  { platform: "youtube", source_name: "Pixar", source_url: "https://www.youtube.com/@Pixar", source_type: "studio", genres: ["animation"], keywords: ["pixar", "official"], quality_score: 91 },
  { platform: "youtube", source_name: "A24", source_url: "https://www.youtube.com/@A24", source_type: "studio", genres: ["indie", "drama"], keywords: ["a24", "official"], quality_score: 90 },
  { platform: "youtube", source_name: "Rotten Tomatoes Trailers", source_url: "https://www.youtube.com/@RottenTomatoesTRAILERS", source_type: "creator", genres: ["movie"], keywords: ["trailer", "official"], quality_score: 86 },
  { platform: "youtube", source_name: "Movieclips", source_url: "https://www.youtube.com/@MOVIECLIPS", source_type: "creator", genres: ["movie"], keywords: ["clip", "scene"], quality_score: 84 },
  { platform: "youtube", source_name: "IGN", source_url: "https://www.youtube.com/@IGN", source_type: "creator", genres: ["movie", "tv"], keywords: ["clip", "trailer"], quality_score: 82 },
  { platform: "youtube", source_name: "KinoCheck", source_url: "https://www.youtube.com/@KinoCheck", source_type: "creator", genres: ["movie"], keywords: ["trailer", "clip"], quality_score: 80 },
  { platform: "instagram", source_name: "Marvel", source_url: "https://www.instagram.com/marvel/", source_type: "official_profile", genres: ["superhero", "action"], keywords: ["marvel"], quality_score: 94 },
  { platform: "instagram", source_name: "HBO", source_url: "https://www.instagram.com/hbo/", source_type: "official_profile", genres: ["drama", "prestige"], keywords: ["hbo"], quality_score: 92 },
  { platform: "instagram", source_name: "Netflix", source_url: "https://www.instagram.com/netflix/", source_type: "ott", genres: ["series", "movie"], keywords: ["netflix"], quality_score: 92 },
  { platform: "instagram", source_name: "Prime Video", source_url: "https://www.instagram.com/primevideo/", source_type: "ott", genres: ["series", "movie"], keywords: ["prime video"], quality_score: 90 },
  { platform: "instagram", source_name: "Disney", source_url: "https://www.instagram.com/disney/", source_type: "studio", genres: ["family", "adventure"], keywords: ["disney"], quality_score: 90 },
  { platform: "instagram", source_name: "Pixar", source_url: "https://www.instagram.com/pixar/", source_type: "studio", genres: ["animation"], keywords: ["pixar"], quality_score: 90 },
  { platform: "instagram", source_name: "A24", source_url: "https://www.instagram.com/a24/", source_type: "studio", genres: ["indie", "drama"], keywords: ["a24"], quality_score: 90 },
  { platform: "facebook", source_name: "Marvel", source_url: "https://www.facebook.com/Marvel/", source_type: "official_profile", genres: ["superhero", "action"], keywords: ["marvel"], quality_score: 90 },
  { platform: "facebook", source_name: "Netflix", source_url: "https://www.facebook.com/netflix/", source_type: "ott", genres: ["series", "movie"], keywords: ["netflix"], quality_score: 88 },
  { platform: "facebook", source_name: "Disney", source_url: "https://www.facebook.com/Disney/", source_type: "studio", genres: ["family", "adventure"], keywords: ["disney"], quality_score: 88 }
];

function serverSupabase() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

function normalizeTitle(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function itemKeyOf(item = {}) {
  const type = item.media_type || (item.first_air_date || item.name ? "tv" : "movie");
  return item.id ? `${type}:${item.id}` : `title:${normalizeTitle(item.title || item.name || "untitled")}`;
}

function videoKindFromText(value = "") {
  const text = value.toLowerCase();
  if (text.includes("official trailer")) return "Official Trailer";
  if (text.includes("trailer")) return "Trailer";
  if (text.includes("scene")) return "Scene Edit";
  if (text.includes("short")) return "Short";
  if (text.includes("clip")) return "Clip";
  return "Edit";
}

export function buildYouTubeEmbedUrl(videoId = "") {
  const id = String(videoId || "").trim();
  if (!id) return "";
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&enablejsapi=1`;
}

export function detectContentFormat(candidate = {}) {
  const text = `${candidate.label || ""} ${candidate.content_format || ""} ${candidate.video_title || ""} ${candidate.title || ""} ${candidate.source_url || ""}`.toLowerCase();
  if (candidate.source === "instagram" || text.includes("instagram reel")) return "reel";
  if (candidate.source === "facebook" || text.includes("facebook reel")) return "reel";
  if (text.includes("/shorts/") || /\bshorts?\b/.test(text)) return "short";
  if (text.includes("scene") || text.includes("edit")) return "scene_edit";
  if (text.includes("clip")) return "clip";
  if (text.includes("teaser")) return "teaser";
  if (text.includes("featurette")) return "featurette";
  if (text.includes("behind the scenes") || text.includes("bts")) return "behind_the_scenes";
  if (text.includes("trailer")) return "trailer";
  return "unknown";
}

export function estimateAspectMode(candidate = {}) {
  const text = `${candidate.aspect_mode || ""} ${candidate.source_url || ""} ${candidate.embed_url || ""} ${candidate.video_title || ""} ${candidate.label || ""}`.toLowerCase();
  if (text.includes("vertical") || text.includes("/shorts/") || text.includes("reel")) return "vertical";
  if (text.includes("horizontal") || text.includes("trailer") || text.includes("featurette") || text.includes("behind the scenes")) return "horizontal";
  return "unknown";
}

export function normalizeReelCandidate(raw = {}) {
  const classified = raw.source_url ? classifyReelSourceUrl(raw.source_url, raw) : null;
  const source = raw.source || classified?.source || "web";
  const sourceVideoId = raw.source_video_id || classified?.source_video_id || null;
  const watchUrl = raw.watch_url || classified?.watch_url || raw.source_url || "";
  const embedUrl = raw.embed_url || classified?.embed_url || (source === "youtube" && sourceVideoId ? buildYouTubeEmbedUrl(sourceVideoId) : "");
  const label = raw.label || classified?.label || videoKindFromText(`${raw.video_title || ""} ${raw.title || ""}`);
  const normalized = {
    ...raw,
    source,
    source_video_id: sourceVideoId,
    source_url: raw.source_url || classified?.source_url || watchUrl,
    watch_url: watchUrl,
    embed_url: embedUrl,
    label,
    content_format: raw.content_format || detectContentFormat({ ...raw, source, label }),
    aspect_mode: raw.aspect_mode || estimateAspectMode({ ...raw, source, label }),
    status: raw.status || "pending"
  };
  return normalized;
}

export function candidateLooksRelevant(candidate = {}, item = {}) {
  const itemTitle = normalizeTitle(item.title || item.name || candidate.title || "");
  if (!itemTitle) return Boolean(candidate.source_url || candidate.watch_url || candidate.embed_url);
  const haystack = normalizeTitle(`${candidate.title || ""} ${candidate.video_title || ""} ${candidate.source_url || ""}`);
  if (haystack.includes(itemTitle)) return true;
  const words = itemTitle.split(" ").filter((word) => word.length > 2);
  return words.length ? words.filter((word) => haystack.includes(word)).length >= Math.min(2, words.length) : false;
}

export function scoreReelCandidate(candidate = {}, item = {}) {
  const normalized = normalizeReelCandidate(candidate);
  const formatScores = {
    short: 110,
    reel: 108,
    clip: 96,
    scene_edit: 94,
    teaser: 82,
    featurette: 74,
    behind_the_scenes: 68,
    trailer: 48,
    unknown: 20
  };
  let score = Number(normalized.quality_score || 0) + (formatScores[normalized.content_format] || 20);
  if (normalized.aspect_mode === "vertical") score += 24;
  if (normalized.aspect_mode === "horizontal") score -= 4;
  if (normalized.thumbnail_url) score += 8;
  if (candidateLooksRelevant(normalized, item)) score += 30;
  else score -= 80;
  return score;
}

export function isTrustedSource(candidate = {}, creatorSources = []) {
  const sourceUrl = (candidate.source_url || candidate.watch_url || "").replace(/\/+$/, "").toLowerCase();
  const sourceName = (candidate.channel_title || candidate.creator_username || "").toLowerCase();
  return creatorSources.some((source) => {
    if (!source?.approved) return false;
    const trustedUrl = (source.source_url || "").replace(/\/+$/, "").toLowerCase();
    const trustedName = (source.source_name || "").toLowerCase();
    return (trustedUrl && sourceUrl.startsWith(trustedUrl)) || (trustedName && sourceName.includes(trustedName));
  });
}

export function candidateToReelCacheRow(candidate = {}) {
  const normalized = normalizeReelCandidate(candidate);
  const now = new Date().toISOString();
  return {
    source: normalized.source,
    source_video_id: normalized.source_video_id || null,
    source_url: normalized.source_url || normalized.watch_url || "",
    watch_url: normalized.watch_url || normalized.source_url || "",
    embed_url: normalized.embed_url || "",
    media_type: normalized.media_type || "movie",
    tmdb_id: normalized.tmdb_id || null,
    item_key: normalized.item_key || null,
    title: normalized.title || normalized.video_title || "Untitled",
    video_title: normalized.video_title || normalized.title || "",
    channel_title: normalized.channel_title || "",
    creator_username: normalized.creator_username || "",
    thumbnail_url: normalized.thumbnail_url || "",
    label: normalized.label || videoKindFromText(normalized.video_title || normalized.title || ""),
    reason: normalized.reason || "From MovieGram reels",
    source_context: normalized.source_context || normalized.discovered_by || "discovery",
    approved: true,
    playable: Boolean(normalized.source_url || normalized.watch_url || normalized.embed_url || normalized.source_video_id),
    quality_score: Number(normalized.quality_score || normalized.match_score || scoreReelCandidate(normalized)),
    last_checked_at: normalized.last_checked_at || now,
    updated_at: now
  };
}

export function dedupeReelCandidates(candidates = []) {
  const seen = new Set();
  return candidates.map(normalizeReelCandidate).filter((candidate) => {
    const key = `${candidate.source}:${candidate.source_video_id || candidate.source_url || candidate.watch_url || candidate.embed_url}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function promoteCandidateToReelCache(candidate = {}, creatorSources = []) {
  const normalized = normalizeReelCandidate(candidate);
  const score = scoreReelCandidate(normalized);
  const trusted = isTrustedSource(normalized, creatorSources);
  if (!["approved"].includes(normalized.status) && !(trusted && score >= 110)) return null;
  if (!(normalized.source_video_id || normalized.source_url || normalized.watch_url || normalized.embed_url)) return null;
  if (rejectUnsafeReelResult({ title: normalized.video_title || normalized.title, link: normalized.source_url })) return null;
  return candidateToReelCacheRow({ ...normalized, quality_score: score + (trusted ? 20 : 0) });
}

export function classifyReelSourceUrl(rawUrl = "", metadata = {}) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  const title = metadata.title || metadata.video_title || "";
  const lower = `${title} ${rawUrl}`.toLowerCase();
  const label = lower.includes("official trailer") ? "Official Trailer"
    : lower.includes("trailer") ? "Trailer"
      : lower.includes("scene") ? "Scene Edit"
        : lower.includes("short") ? "Short"
          : lower.includes("reel") && host.includes("instagram") ? "Instagram Reel"
            : lower.includes("reel") && host.includes("facebook") ? "Facebook Reel"
              : lower.includes("clip") ? "Clip"
                : "Edit";

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    const sourceVideoId = host === "youtu.be"
      ? pathParts[0]
      : url.searchParams.get("v") || (pathParts[0] === "shorts" ? pathParts[1] : pathParts.at(-1));
    if (!sourceVideoId) return null;
    return {
      source: "youtube",
      source_video_id: sourceVideoId,
      source_url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
      watch_url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
      embed_url: `https://www.youtube.com/embed/${sourceVideoId}?playsinline=1&rel=0&modestbranding=1&autoplay=1&mute=1&enablejsapi=1`,
      label
    };
  }

  if (host.endsWith("instagram.com") && ["reel", "p", "tv"].some((part) => pathParts.includes(part))) {
    const markerIndex = pathParts.findIndex((part) => ["reel", "p", "tv"].includes(part));
    return {
      source: "instagram",
      source_video_id: pathParts[markerIndex + 1] || null,
      source_url: url.toString(),
      watch_url: url.toString(),
      embed_url: "",
      label: "Instagram Reel"
    };
  }

  if (host.endsWith("facebook.com") && (pathParts.includes("reel") || pathParts.includes("watch") || pathParts.includes("videos"))) {
    return {
      source: "facebook",
      source_video_id: url.searchParams.get("v") || pathParts.at(-1) || null,
      source_url: url.toString(),
      watch_url: url.toString(),
      embed_url: "",
      label: "Facebook Reel"
    };
  }

  return {
    source: "web",
    source_video_id: null,
    source_url: url.toString(),
    watch_url: url.toString(),
    embed_url: "",
    label: "Preview"
  };
}

export function rejectUnsafeReelResult(result = {}) {
  const text = `${result.title || ""} ${result.snippet || ""} ${result.link || result.url || ""}`.toLowerCase();
  return [
    "full movie",
    "full episode",
    "download",
    "free watch",
    "torrent",
    "telegram",
    "drive.google",
    "camrip",
    "cam rip",
    "leaked",
    "xxx"
  ].some((term) => text.includes(term));
}

export function scoreDiscoveredReelResult(result = {}, title = "", source = {}) {
  const text = normalizeTitle(`${result.title || ""} ${result.snippet || ""}`);
  const target = normalizeTitle(title);
  let score = Number(source.quality_score || 0);
  if (target && text.includes(target)) score += 45;
  if (/(edit|short|scene|cinematic|fan|clip)/i.test(text)) score += 25;
  if (/(official|teaser|trailer)/i.test(text)) score += 10;
  if (result.thumbnail_url) score += 8;
  if (/trailer/i.test(text) && !/edit|clip|scene|short/i.test(text)) score -= 8;
  if (rejectUnsafeReelResult(result)) score -= 500;
  return score;
}

export function buildLargeReelSeedTitlePool({ rows = {}, watchlist = {}, watched = {}, favorites = {}, ratings = {}, socialActivity = [] } = {}) {
  const ratedKeys = new Set(Object.entries(ratings || {}).filter(([, rating]) => Number(rating) >= 4).map(([key]) => key));
  const pool = [
    ...Object.values(watchlist || {}),
    ...Object.values(watched || {}),
    ...Object.values(favorites || {}),
    ...(socialActivity || []).map((event) => event.item).filter(Boolean),
    ...(rows.trending || []),
    ...(rows.movies || []),
    ...(rows.series || []),
    ...(rows.popular || []),
    ...(rows.topRated || [])
  ];
  const seen = new Set();
  return pool
    .filter((item) => item?.id)
    .map((item) => ({ ...item, media_type: item.media_type || (item.first_air_date || item.name ? "tv" : "movie") }))
    .sort((a, b) => (ratedKeys.has(itemKeyOf(b)) ? 1 : 0) - (ratedKeys.has(itemKeyOf(a)) ? 1 : 0))
    .filter((item) => {
      const key = itemKeyOf(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 275);
}

export async function seedCreatorSources() {
  const client = serverSupabase();
  if (!client) return { inserted: 0, error: "Supabase server client is not configured." };
  const rows = officialCreatorSourceSeeds.map((source) => ({
    ...source,
    approved: true,
    updated_at: new Date().toISOString()
  }));
  const { error } = await client.from("creator_sources").upsert(rows, { onConflict: "platform,source_url" });
  if (error) return { inserted: 0, error: error.message };
  return { inserted: rows.length };
}

function discoveryQueriesForTitle(title = "") {
  return [
    `${title} edit site:youtube.com/shorts`,
    `${title} scene edit site:instagram.com/reel`,
    `${title} video site:facebook.com/watch`
  ];
}

async function saveDiscoveryJob(client, row) {
  if (!client) return;
  await client.from("discovery_jobs").insert({
    ...row,
    updated_at: new Date().toISOString(),
    last_run_at: new Date().toISOString()
  });
}

async function searchProvider(query, provider) {
  if (provider === "google" && GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
    const params = new URLSearchParams({ key: GOOGLE_SEARCH_API_KEY, cx: GOOGLE_SEARCH_ENGINE_ID, q: query, num: String(RESULT_LIMIT_PER_QUERY) });
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    if (response.status === 429) throw Object.assign(new Error("Google search rate limited"), { rateLimited: true });
    if (!response.ok) throw new Error(`Google search ${response.status}`);
    const data = await response.json();
    return (data.items || []).map((item) => ({ title: item.title, snippet: item.snippet, link: item.link, thumbnail_url: item.pagemap?.cse_thumbnail?.[0]?.src || "" }));
  }
  if (provider === "bing" && BING_SEARCH_API_KEY) {
    const params = new URLSearchParams({ q: query, count: String(RESULT_LIMIT_PER_QUERY) });
    const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params.toString()}`, { headers: { "Ocp-Apim-Subscription-Key": BING_SEARCH_API_KEY } });
    if (response.status === 429) throw Object.assign(new Error("Bing search rate limited"), { rateLimited: true });
    if (!response.ok) throw new Error(`Bing search ${response.status}`);
    const data = await response.json();
    return (data.webPages?.value || []).map((item) => ({ title: item.name, snippet: item.snippet, link: item.url, thumbnail_url: "" }));
  }
  if (provider === "brave" && BRAVE_SEARCH_API_KEY) {
    const params = new URLSearchParams({ q: query, count: String(RESULT_LIMIT_PER_QUERY) });
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, { headers: { "X-Subscription-Token": BRAVE_SEARCH_API_KEY } });
    if (response.status === 429) throw Object.assign(new Error("Brave search rate limited"), { rateLimited: true });
    if (!response.ok) throw new Error(`Brave search ${response.status}`);
    const data = await response.json();
    return (data.web?.results || []).map((item) => ({ title: item.title, snippet: item.description, link: item.url, thumbnail_url: item.thumbnail?.src || "" }));
  }
  return [];
}

export async function runReelDiscoveryBatch(titles = [], provider = "google") {
  const client = serverSupabase();
  if (!client) return { saved: 0, error: "Supabase server client is not configured." };
  let playableSaved = 0;
  for (const item of titles.slice(0, DISCOVERY_BATCH_LIMIT)) {
    const title = item.title || item.name || "";
    const itemKey = itemKeyOf(item);
    const checkedSince = new Date(Date.now() - DAY_MS).toISOString();
    const { count } = await client
      .from("reel_cache")
      .select("id", { count: "exact", head: true })
      .eq("item_key", itemKey)
      .eq("approved", true)
      .eq("playable", true)
      .gt("last_checked_at", checkedSince);
    if (count && count >= 2) continue;

    for (const query of discoveryQueriesForTitle(title).slice(0, QUERY_LIMIT_PER_TITLE)) {
      try {
        const results = await searchProvider(query, provider);
        const rows = results
          .filter((result) => !rejectUnsafeReelResult(result))
          .map((result) => {
            const classified = classifyReelSourceUrl(result.link || result.url || "", result);
            if (!classified) return null;
            return {
              ...classified,
              media_type: item.media_type || (item.first_air_date || item.name ? "tv" : "movie"),
              tmdb_id: item.id || null,
              item_key: itemKey,
              title,
              video_title: result.title || title,
              channel_title: "",
              creator_username: "",
              thumbnail_url: result.thumbnail_url || "",
              reason: `Discovered for ${title}`,
              source_context: "web_discovery",
              approved: true,
              playable: Boolean(classified.source_url || classified.watch_url),
              quality_score: scoreDiscoveredReelResult(result, title),
              last_checked_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.quality_score - a.quality_score)
          .slice(0, 3);
        if (rows.length) {
          const { error } = await client.from("reel_cache").upsert(rows, { onConflict: "source,source_video_id" });
          if (!error) playableSaved += rows.length;
        }
        await saveDiscoveryJob(client, { job_type: "reel_discovery", status: "done", provider, query, title, item_key: itemKey, media_type: item.media_type, tmdb_id: item.id, results_found: results.length, playable_saved: rows.length });
      } catch (error) {
        await saveDiscoveryJob(client, { job_type: "reel_discovery", status: error.rateLimited ? "rate_limited" : "failed", provider, query, title, item_key: itemKey, media_type: item.media_type, tmdb_id: item.id, error_message: error.message });
        if (error.rateLimited) return { saved: playableSaved, rateLimited: true };
      }
    }
  }
  return { saved: playableSaved };
}

export async function getPlayableReelLibraryStats() {
  const client = serverSupabase();
  if (!client) return { total: 0, bySource: {}, error: "Supabase server client is not configured." };
  const { data, error } = await client.from("reel_cache").select("source,playable,approved,updated_at").eq("approved", true).eq("playable", true);
  if (error) return { total: 0, bySource: {}, error: error.message };
  const bySource = {};
  (data || []).forEach((row) => {
    bySource[row.source || "manual"] = (bySource[row.source || "manual"] || 0) + 1;
  });
  const { data: jobs } = await client.from("discovery_jobs").select("status,provider,updated_at,error_message").order("updated_at", { ascending: false }).limit(1);
  return { total: data.length, bySource, fallbackPreviewCount: 0, lastSeedJob: jobs?.[0] || null };
}

export async function seedFromOfficialYouTubeSources(titles = []) {
  const client = serverSupabase();
  if (!client || !YOUTUBE_API_KEY) return { saved: 0, disabled: true };
  const titleByNeedle = new Map(titles.map((item) => [normalizeTitle(item.title || item.name || ""), item]).filter(([title]) => title));
  const { data: sources, error } = await client
    .from("creator_sources")
    .select("*")
    .eq("platform", "youtube")
    .eq("approved", true)
    .not("source_id", "is", null)
    .order("quality_score", { ascending: false })
    .limit(10);
  if (error) return { saved: 0, error: error.message };

  let saved = 0;
  let searches = 0;
  for (const source of sources || []) {
    if (searches >= INTERNAL_YOUTUBE_SEED_SEARCH_LIMIT) break;
    const params = new URLSearchParams({
      key: YOUTUBE_API_KEY,
      part: "snippet",
      channelId: source.source_id,
      type: "video",
      order: "date",
      maxResults: "10",
      videoEmbeddable: "true",
      safeSearch: "moderate"
    });
    searches += 1;
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    if (response.status === 429) {
      await saveDiscoveryJob(client, { job_type: "youtube_creator_seed", status: "rate_limited", provider: "youtube", error_message: "YouTube quota/rate limit" });
      return { saved, rateLimited: true };
    }
    if (!response.ok) continue;
    const data = await response.json();
    const rows = (data.items || []).map((video) => {
      const videoTitle = video.snippet?.title || "";
      const matched = [...titleByNeedle.entries()].find(([title]) => normalizeTitle(videoTitle).includes(title));
      if (!matched) return null;
      const item = matched[1];
      const sourceVideoId = video.id?.videoId;
      if (!sourceVideoId) return null;
      return {
        source: "youtube",
        source_video_id: sourceVideoId,
        source_url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
        media_type: item.media_type || (item.first_air_date || item.name ? "tv" : "movie"),
        tmdb_id: item.id || null,
        item_key: itemKeyOf(item),
        title: item.title || item.name || videoTitle,
        video_title: videoTitle,
        channel_title: video.snippet?.channelTitle || source.source_name,
        creator_username: source.source_name,
        thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || "",
        embed_url: `https://www.youtube.com/embed/${sourceVideoId}?playsinline=1&rel=0&modestbranding=1&autoplay=1&mute=1&enablejsapi=1`,
        watch_url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
        label: videoKindFromText(videoTitle),
        reason: `From ${source.source_name}`,
        source_context: "official_youtube_source",
        approved: true,
        playable: true,
        quality_score: Number(source.quality_score || 0) + 20,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }).filter(Boolean);
    if (rows.length) {
      const { error: upsertError } = await client.from("reel_cache").upsert(rows, { onConflict: "source,source_video_id" });
      if (!upsertError) saved += rows.length;
    }
    await client.from("creator_sources").update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", source.id);
  }
  return { saved, searches };
}

export async function seedPlayableReelLibrary500({ titles = [], provider = "google" } = {}) {
  const stats = await getPlayableReelLibraryStats();
  if (stats.total >= TARGET_PLAYABLE_REELS) return { skipped: true, stats };
  await seedCreatorSources();
  const batchTitles = titles.slice(0, DISCOVERY_BATCH_LIMIT);
  if (!batchTitles.length) return { saved: 0, stats, message: "Provide a curated title batch from MovieGram/TMDB data." };
  const youtubeOfficial = await seedFromOfficialYouTubeSources(batchTitles);
  const web = await runReelDiscoveryBatch(batchTitles, provider);
  return {
    saved: Number(youtubeOfficial.saved || 0) + Number(web.saved || 0),
    youtubeOfficial,
    web,
    target: TARGET_PLAYABLE_REELS
  };
}
