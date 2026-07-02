#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const TMDB_BASE = "https://api.themoviedb.org/3";
const YOUTUBE_WATCH_BASE = "https://www.youtube.com/watch?v=";
const YOUTUBE_EMBED_BASE = "https://www.youtube-nocookie.com/embed/";
const MAX_TARGET = 300;
const MAX_PAGES = 20;
const DEFAULT_TARGET = 150;
const DEFAULT_PAGES = 10;
const MAX_ERRORS = 25;
const BATCH_SIZE = 25;

const TMDB_SECTIONS = [
  { mediaType: "movie", path: "movie/popular" },
  { mediaType: "movie", path: "movie/top_rated" },
  { mediaType: "movie", path: "movie/upcoming" },
  { mediaType: "movie", path: "movie/now_playing" },
  { mediaType: "tv", path: "tv/popular" },
  { mediaType: "tv", path: "tv/top_rated" },
  { mediaType: "tv", path: "tv/on_the_air" }
];

const TYPE_SCORE = {
  Clip: 100,
  Teaser: 85,
  Featurette: 78,
  "Behind the Scenes": 72,
  Trailer: 55
};

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

function argNumber(name, fallback, max) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const value = Number(raw || fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
}

function titleOf(item) {
  return item.title || item.name || item.original_title || item.original_name || "Untitled";
}

function itemKeyFor(mediaType, id) {
  return `${mediaType}:${id}`;
}

function youtubeEmbedUrl(videoId) {
  return `${YOUTUBE_EMBED_BASE}${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&enablejsapi=1`;
}

function qualityScore(video) {
  const base = TYPE_SCORE[video.type] || 0;
  const name = String(video.name || "").toLowerCase();
  let score = base;
  if (video.official === true) score += 10;
  if (name.includes("official clip")) score += 8;
  return score;
}

function sortVideos(a, b) {
  const scoreDelta = qualityScore(b) - qualityScore(a);
  if (scoreDelta) return scoreDelta;
  const officialDelta = Number(Boolean(b.official)) - Number(Boolean(a.official));
  if (officialDelta) return officialDelta;
  return String(b.published_at || "").localeCompare(String(a.published_at || ""));
}

async function tmdbFetch(endpoint, apiKey) {
  const joiner = endpoint.includes("?") ? "&" : "?";
  const response = await fetch(`${TMDB_BASE}/${endpoint}${joiner}api_key=${encodeURIComponent(apiKey)}`);
  if (!response.ok) {
    throw new Error(`TMDB ${response.status}: ${endpoint}`);
  }
  return response.json();
}

async function getPlayableCount(supabase) {
  const { count, error } = await supabase
    .from("reel_cache")
    .select("id", { count: "exact", head: true })
    .or("approved.is.null,approved.eq.true")
    .or("playable.eq.true,source_video_id.not.is.null,source_url.not.is.null,watch_url.not.is.null,embed_url.not.is.null");
  if (error) throw error;
  return count || 0;
}

async function getExistingYouTubeIds(supabase) {
  const ids = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("reel_cache")
      .select("source_video_id")
      .eq("source", "youtube")
      .not("source_video_id", "is", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    (data || []).forEach((row) => {
      if (row.source_video_id) ids.add(row.source_video_id);
    });
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function upsertRows(supabase, rows) {
  if (!rows.length) return { saved: 0, errors: 0 };
  let saved = 0;
  let errors = 0;
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await supabase
      .from("reel_cache")
      .upsert(batch, { onConflict: "source,source_video_id" });
    if (error) {
      errors += 1;
      console.error("Supabase reel_cache upsert failed", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    } else {
      saved += batch.length;
    }
  }
  return { saved, errors };
}

async function main() {
  loadDotEnvLocal();

  const target = argNumber("target", DEFAULT_TARGET, MAX_TARGET);
  const pages = argNumber("pages", DEFAULT_PAGES, MAX_PAGES);
  const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!tmdbKey) throw new Error("Missing NEXT_PUBLIC_TMDB_API_KEY in .env.local.");
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.");
  if (!supabaseKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const current = await getPlayableCount(supabase);
  console.info(`Reel cache backfill starting: current=${current}, target=${target}`);
  if (current >= target) {
    console.info(`Current playable count ${current} already meets target ${target}. Nothing to do.`);
    return;
  }

  const existingIds = await getExistingYouTubeIds(supabase);
  const needed = target - current;
  const rows = [];
  const seenIds = new Set(existingIds);
  const seenTitles = new Set();
  const stats = {
    pagesChecked: 0,
    titlesChecked: 0,
    videosFound: 0,
    saved: 0,
    skippedDuplicates: 0,
    errors: 0
  };

  outer:
  for (const section of TMDB_SECTIONS) {
    for (let page = 1; page <= pages; page += 1) {
      stats.pagesChecked += 1;
      let listing;
      try {
        listing = await tmdbFetch(`${section.path}?page=${page}`, tmdbKey);
      } catch (error) {
        stats.errors += 1;
        console.error("TMDB listing failed", { section: section.path, page, message: error.message });
        if (stats.errors >= MAX_ERRORS) break outer;
        continue;
      }

      for (const item of listing.results || []) {
        if (rows.length >= needed) break outer;
        const tmdbId = Number(item.id);
        if (!tmdbId) continue;
        const itemKey = itemKeyFor(section.mediaType, tmdbId);
        if (seenTitles.has(itemKey)) continue;
        seenTitles.add(itemKey);
        stats.titlesChecked += 1;

        let videos;
        try {
          const videoData = await tmdbFetch(`${section.mediaType}/${tmdbId}/videos`, tmdbKey);
          videos = (videoData.results || [])
            .filter((video) => video.site === "YouTube" && video.key && TYPE_SCORE[video.type])
            .sort(sortVideos)
            .slice(0, 3);
        } catch (error) {
          stats.errors += 1;
          console.error("TMDB videos failed", { itemKey, title: titleOf(item), message: error.message });
          if (stats.errors >= MAX_ERRORS) break outer;
          continue;
        }

        stats.videosFound += videos.length;
        for (const video of videos) {
          if (rows.length >= needed) break outer;
          if (seenIds.has(video.key)) {
            stats.skippedDuplicates += 1;
            continue;
          }
          seenIds.add(video.key);
          const now = new Date().toISOString();
          const watchUrl = `${YOUTUBE_WATCH_BASE}${video.key}`;
          rows.push({
            source: "youtube",
            source_video_id: video.key,
            source_url: watchUrl,
            watch_url: watchUrl,
            embed_url: youtubeEmbedUrl(video.key),
            media_type: section.mediaType,
            tmdb_id: tmdbId,
            item_key: itemKey,
            title: titleOf(item),
            video_title: video.name || titleOf(item),
            channel_title: "TMDB",
            creator_username: "TMDB",
            thumbnail_url: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
            label: video.type,
            reason: "Official video from TMDB",
            source_context: "tmdb_backfill",
            approved: true,
            playable: true,
            quality_score: qualityScore(video),
            last_checked_at: now,
            updated_at: now
          });
        }
      }
    }
  }

  const result = await upsertRows(supabase, rows);
  stats.saved = result.saved;
  stats.errors += result.errors;
  const finalCount = await getPlayableCount(supabase);

  console.info(`Checked pages=${stats.pagesChecked}, titles=${stats.titlesChecked}, videosFound=${stats.videosFound}, saved=${stats.saved}, skippedDuplicates=${stats.skippedDuplicates}, errors=${stats.errors}`);
  console.info(`Final playable count=${finalCount}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
