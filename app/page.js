"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acceptFollowRequest,
  addToSupabaseWatchlist,
  addItemToList,
  createNotification,
  createUserList,
  createActivityEvent,
  declineFollowRequest,
  ensureUserProfile,
  followUser,
  isSupabaseConfigured,
  loadNotifications,
  loadProductStats,
  loadProductLibrary,
  loadRatingReviews,
  loadMovieGramRemoteState,
  loadRecentActivity,
  loadUserLists,
  markNotificationRead,
  markSupabaseWatched,
  removeFromSupabaseWatchlist,
  removeSupabaseWatched,
  saveMovieGramRemoteState,
  saveRatingReview,
  supabase,
  updateUserProfile
} from "../lib/supabaseClient";

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg width='500' height='750' viewBox='0 0 500 750' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='500' height='750' fill='%2311151b'/%3E%3Crect x='92' y='240' width='316' height='230' rx='18' fill='%23212731'/%3E%3Ccircle cx='184' cy='330' r='42' fill='%23394350'/%3E%3Cpath d='m122 440 86-92 62 70 50-48 66 70z' fill='%23394350'/%3E%3Ctext x='250' y='570' fill='%239aa3af' font-family='Arial' font-size='30' text-anchor='middle'%3ENo Poster%3C/text%3E%3C/svg%3E";
const BACKDROP_FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg width='1280' height='720' viewBox='0 0 1280 720' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23070a0f'/%3E%3Cstop offset='1' stop-color='%23252b38'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3Ctext x='640' y='380' fill='%239aa3af' font-family='Arial' font-size='48' text-anchor='middle'%3EMovieGram%3C/text%3E%3C/svg%3E";

const tabs = [
  { id: "home", label: "Home", icon: "home" },
  { id: "reels", label: "Reels", icon: "reels" },
  { id: "log", label: "Log", icon: "log" },
  { id: "explore", label: "Explore", icon: "search" },
  { id: "profile", label: "Profile", icon: "profile" }
];

const contentSections = [
  { id: "trending", title: "Trending", endpoint: "/trending/all/week" },
  { id: "movies", title: "Movies", endpoint: "/movie/popular" },
  { id: "series", title: "Web Series", endpoint: "/tv/popular" },
  { id: "anime", title: "Anime", endpoint: "/discover/tv", params: { with_genres: "16", with_origin_country: "JP", sort_by: "popularity.desc" } }
];

const exploreTabs = [
  { id: "trending", label: "Trending", endpoint: "/trending/all/week" },
  { id: "movies", label: "Movies", endpoint: "/movie/now_playing" },
  { id: "tv", label: "TV Shows", endpoint: "/tv/on_the_air" },
  { id: "top", label: "Top Rated", endpoint: "/movie/top_rated" },
  { id: "upcoming", label: "Upcoming", endpoint: "/movie/upcoming" }
];

const exploreHubSections = [
  { id: "today", title: "Trending Today", endpoint: "/trending/all/day" },
  { id: "week", title: "Trending This Week", endpoint: "/trending/all/week" },
  { id: "popularMovies", title: "Popular Movies", endpoint: "/movie/popular" },
  { id: "popularTv", title: "Popular TV Shows", endpoint: "/tv/popular" },
  { id: "topRated", title: "Top Rated", endpoint: "/movie/top_rated" },
  { id: "upcoming", title: "Upcoming", endpoint: "/movie/upcoming" }
];

const friends = [
  { id: "aabhas", name: "Aabhas", handle: "@aabhas_07", avatar: "avatar-one" },
  { id: "shruti", name: "Shruti", handle: "@shruti", avatar: "avatar-two" },
  { id: "rohan", name: "Rohan", handle: "@rohan99", avatar: "avatar-three" },
  { id: "arjun", name: "Arjun", handle: "@arjunfilms", avatar: "avatar-four" },
  { id: "meera", name: "Meera", handle: "@meera", avatar: "avatar-five" }
];

const conversations = [
  {
    id: "rohan",
    friend: friends[2],
    unread: 2,
    messages: [
      { id: 1, from: "them", text: "That ending in Dune still has me thinking.", time: "2:11 PM" },
      { id: 2, from: "me", text: "Same. The sound design carried the whole theater.", time: "2:14 PM" },
      { id: 3, from: "them", text: "Weekend rewatch?", time: "2:16 PM" }
    ]
  },
  {
    id: "shruti",
    friend: friends[1],
    unread: 1,
    messages: [
      { id: 1, from: "them", text: "Add The Batman to tonight's watch party?", time: "6:48 PM" },
      { id: 2, from: "me", text: "Yes. Dark, rainy, perfect.", time: "6:51 PM" }
    ]
  },
  {
    id: "arjun",
    friend: friends[3],
    unread: 0,
    messages: [
      { id: 1, from: "them", text: "Sent you a list: neo-noir favorites.", time: "Yesterday" },
      { id: 2, from: "me", text: "Saving it. Need more Fincher energy.", time: "Yesterday" }
    ]
  }
];

const feedSeeds = [
  { id: "feed-1", friend: friends[0], action: "watched", title: "Dune: Part Two", body: "Absolutely stunning. The visuals, the scale, the storytelling.", poster: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg", rating: "8.6", time: "2h" },
  { id: "feed-2", friend: friends[1], action: "rated", title: "Interstellar", body: "A perfect late-night rewatch.", poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", rating: "5.0", time: "5h" },
  { id: "feed-3", friend: friends[2], action: "reviewed", title: "Joker", body: "Dark, intense and absolutely brilliant.", poster: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg", rating: "4.5", time: "8h" },
  { id: "feed-4", friend: friends[3], action: "added", title: "The Batman", body: "Added to watchlist.", poster: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", rating: "", time: "12h" },
  { id: "feed-5", friend: friends[4], action: "watched", title: "Friends - S2 E14", body: "Comfort episode unlocked.", poster: "/f496cm9enuEsZkSPzCwnTESEK5s.jpg", rating: "", time: "16h" }
];

const socialFeedSeeds = [
  {
    id: "social-1",
    friend: friends[0],
    activity: "watched",
    title: "Dune: Part Two",
    poster: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    time: "18 min",
    caption: "The sandworm sequence still has my whole brain vibrating.",
    likes: 342,
    comments: 26
  },
  {
    id: "social-2",
    friend: friends[1],
    activity: "rated",
    title: "Interstellar",
    poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    time: "1h",
    caption: "Five stars for making me stare quietly at the ceiling again.",
    rating: "5.0",
    likes: 219,
    comments: 18
  },
  {
    id: "social-3",
    friend: friends[2],
    activity: "reviewed",
    title: "Joker",
    poster: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    time: "3h",
    caption: "Dark, intense, and absolutely brilliant. Joaquin is unreal here.",
    rating: "4.5",
    likes: 188,
    comments: 14
  }
];

const socialFriendProfiles = [
  { ...friends[1], bio: "Sci-fi, prestige drama, and ruthless five-star restraint.", match: 94, mutuals: 8, genres: ["Sci-Fi", "Drama", "Thriller"], activity: "Rated Interstellar 5.0", stats: ["312 watched", "48 lists"] },
  { ...friends[2], bio: "Neo-noir lists, comic book rewatches, and big theater energy.", match: 88, mutuals: 6, genres: ["Crime", "Action", "Noir"], activity: "Reviewed Joker", stats: ["526 watched", "132 reviews"] },
  { ...friends[3], bio: "Slow cinema on weekdays, superhero chaos on weekends.", match: 81, mutuals: 4, genres: ["Action", "Drama", "Fantasy"], activity: "Added The Batman", stats: ["204 watched", "37 lists"] },
  { ...friends[4], bio: "Comfort shows, sharp thrillers, and very serious watch parties.", match: 76, mutuals: 5, genres: ["Comedy", "Thriller", "TV"], activity: "Watched Friends", stats: ["188 watched", "21 reviews"] }
];

const blendSeeds = [
  { id: "shruti-blend", title: "Aabhas + Shruti", friends: [socialFriendProfiles[0]], match: 94, genres: ["Sci-Fi", "Drama", "Thriller"] },
  { id: "night-crew", title: "Night Crew Blend", friends: [socialFriendProfiles[0], socialFriendProfiles[1], socialFriendProfiles[2]], match: 87, genres: ["Crime", "Action", "Sci-Fi"] },
  { id: "comfort-club", title: "Comfort Club", friends: [socialFriendProfiles[2], socialFriendProfiles[3]], match: 79, genres: ["TV", "Comedy", "Fantasy"] }
];

const fallbackRows = {
  trending: [
    { id: 693134, media_type: "movie", title: "Dune: Part Two", poster_path: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg", backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg", vote_average: 8.2, release_date: "2024-02-27", overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge." },
    { id: 414906, media_type: "movie", title: "The Batman", poster_path: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", backdrop_path: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", vote_average: 7.7, release_date: "2022-03-01", overview: "Batman ventures into Gotham City's underworld when a killer leaves cryptic clues." },
    { id: 1396, media_type: "tv", name: "Breaking Bad", poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg", backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg", vote_average: 8.9, first_air_date: "2008-01-20", overview: "A chemistry teacher turns to manufacturing methamphetamine." }
  ],
  movies: [
    { id: 157336, media_type: "movie", title: "Interstellar", poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", backdrop_path: "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg", vote_average: 8.4, release_date: "2014-11-05", overview: "Explorers travel through a wormhole in space in an attempt to save humanity." },
    { id: 872585, media_type: "movie", title: "Oppenheimer", poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", backdrop_path: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg", vote_average: 8.1, release_date: "2023-07-19", overview: "The story of J. Robert Oppenheimer and the creation of the atomic bomb." },
    { id: 496243, media_type: "movie", title: "Parasite", poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", backdrop_path: "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg", vote_average: 8.5, release_date: "2019-05-30", overview: "Greed and class discrimination threaten a newly formed symbiotic relationship." }
  ],
  series: [
    { id: 1399, media_type: "tv", name: "Game of Thrones", poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg", vote_average: 8.5, first_air_date: "2011-04-17", overview: "Noble families vie for control of the Iron Throne." },
    { id: 94997, media_type: "tv", name: "House of the Dragon", poster_path: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg", backdrop_path: "/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg", vote_average: 8.4, first_air_date: "2022-08-21", overview: "The Targaryen dynasty faces a succession crisis." },
    { id: 76479, media_type: "tv", name: "The Boys", poster_path: "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg", backdrop_path: "/mGVrXeIjyecj6TKmwPVpHlscEmw.jpg", vote_average: 8.4, first_air_date: "2019-07-25", overview: "Vigilantes take on corrupt superheroes." }
  ],
  anime: [
    { id: 37854, media_type: "tv", name: "One Piece", poster_path: "/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg", backdrop_path: "/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg", vote_average: 8.7, first_air_date: "1999-10-20", overview: "Monkey D. Luffy sails with his crew in search of the ultimate treasure." },
    { id: 1429, media_type: "tv", name: "Attack on Titan", poster_path: "/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg", backdrop_path: "/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg", vote_average: 8.7, first_air_date: "2013-04-07", overview: "Humanity fights for survival against man-eating giants." },
    { id: 95479, media_type: "tv", name: "Jujutsu Kaisen", poster_path: "/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg", backdrop_path: "/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg", vote_average: 8.6, first_air_date: "2020-10-03", overview: "A student joins a secret organization of sorcerers." }
  ]
};

const genreSeeds = [
  { id: 28, name: "Action", tone: "violet" },
  { id: 878, name: "Sci-Fi", tone: "blue" },
  { id: 18, name: "Drama", tone: "rose" },
  { id: 53, name: "Thriller", tone: "amber" },
  { id: 16, name: "Anime", tone: "green" },
  { id: 35, name: "Comedy", tone: "purple" },
  { id: 80, name: "Crime", tone: "red" }
];

const collectionSeeds = [
  { id: "sci-fi", title: "Mind-Bending Sci-Fi", subtitle: "12 titles", items: [fallbackRows.movies[0], fallbackRows.trending[0]] },
  { id: "prestige", title: "Prestige TV Nights", subtitle: "8 shows", items: [fallbackRows.trending[2], fallbackRows.series[1]] },
  { id: "dark", title: "Dark & Gritty", subtitle: "15 picks", items: [fallbackRows.trending[1], fallbackRows.movies[1]] },
  { id: "anime", title: "Anime Starter Pack", subtitle: "10 shows", items: [fallbackRows.anime[0], fallbackRows.anime[1]] }
];

const actorFallbacks = [
  { id: 1, name: "Cillian Murphy", known_for_department: "Acting", profile_path: "/llkbyWKwpfowZ6C8peBjIV9jj99.jpg" },
  { id: 2, name: "Zendaya", known_for_department: "Acting", profile_path: "/3WdOloHpjtjL96uVOhFRRCcYSwq.jpg" },
  { id: 3, name: "Robert Pattinson", known_for_department: "Acting", profile_path: "/8A4PS5iG7GWEAVFftyqMZKl3qcr.jpg" },
  { id: 4, name: "Anya Taylor-Joy", known_for_department: "Acting", profile_path: "/6bX3q6o7Qf9LhEDPH1v3cV6ZJYz.jpg" }
];

const youtubeReelMemoryCache = new Map();
let youtubeReelLimitReached = false;
let youtubeQuotaErrorObserved = false;
const YOUTUBE_QUOTA_SESSION_KEY = "youtubeQuotaExceeded";
const YOUTUBE_REEL_REFRESH_PREFIX = "moviegram.youtubeReelRefresh.";
const YOUTUBE_REEL_TAB_COUNT_PREFIX = "moviegram.youtubeReelTabSearches.";
const REEL_LIGHT_DISCOVERY_SESSION_KEY = "moviegram.reelLightDiscovery.v1";
const REEL_CACHE_LOG_SESSION_KEY = "moviegram.reelCacheFirstLog.v1";
const TMDB_REEL_SEED_SESSION_KEY = "moviegram.tmdbReelSeedDone";
const YOUTUBE_SEARCH_STOPPED_SESSION_KEY = "moviegram.youtubeSearchStoppedAfter429";
const REEL_LIKES_STORAGE_KEY = "moviegram.reelLikes";
const REEL_COMMENTS_STORAGE_KEY = "moviegram.reelComments";
const MAX_YOUTUBE_SEARCHES_PER_TAB_SESSION = 2;
const REEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MOVIEGRAM_REEL_ADMIN_IDS = (process.env.NEXT_PUBLIC_MOVIEGRAM_REEL_ADMIN_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const REEL_RUNTIME_SESSION_ID = Math.random().toString(36).slice(2, 10);

function readYouTubeQuotaExceeded() {
  if (youtubeReelLimitReached) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(YOUTUBE_QUOTA_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function markYouTubeQuotaExceeded() {
  youtubeReelLimitReached = true;
  youtubeQuotaErrorObserved = true;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(YOUTUBE_QUOTA_SESSION_KEY, "true");
    window.sessionStorage.setItem(YOUTUBE_SEARCH_STOPPED_SESSION_KEY, "true");
  } catch {
    // Session storage can be unavailable in private contexts; the in-memory flag still protects this page session.
  }
}

function isYouTubeQuotaError(status, message = "") {
  return status === 429 || /quota|rate limit|rate_limit|exceeded/i.test(message || "");
}

function youtubeTabSearchCount(tab, userId) {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.sessionStorage.getItem(`${YOUTUBE_REEL_TAB_COUNT_PREFIX}${userId || "guest"}.${tab}`) || 0);
  } catch {
    return 0;
  }
}

function incrementYouTubeTabSearchCount(tab, userId) {
  if (typeof window === "undefined") return;
  try {
    const key = `${YOUTUBE_REEL_TAB_COUNT_PREFIX}${userId || "guest"}.${tab}`;
    window.sessionStorage.setItem(key, String(Number(window.sessionStorage.getItem(key) || 0) + 1));
  } catch {
    // Non-critical quota guard metadata.
  }
}

function recentYouTubeRefreshKey(tab, itemKey) {
  return `${YOUTUBE_REEL_REFRESH_PREFIX}${tab}.${itemKey}`;
}

function wasYouTubeTitleRefreshedRecently(tab, itemKey) {
  if (typeof window === "undefined") return false;
  try {
    const value = Number(window.localStorage.getItem(recentYouTubeRefreshKey(tab, itemKey)) || 0);
    return value && Date.now() - value < REEL_CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function markYouTubeTitleRefreshed(tab, itemKey) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(recentYouTubeRefreshKey(tab, itemKey), String(Date.now()));
  } catch {
    // Non-critical quota guard metadata.
  }
}

function readReelLightDiscoveryUsed() {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(REEL_LIGHT_DISCOVERY_SESSION_KEY) === "true";
  } catch {
    return true;
  }
}

function markReelLightDiscoveryUsed() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REEL_LIGHT_DISCOVERY_SESSION_KEY, "true");
  } catch {
    // Non-critical guard metadata.
  }
}

function logReelCacheFirstOnce({ cachedCount, fallbackCount, lightDiscoveryAllowed, youtubeCallsUsed }) {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(REEL_CACHE_LOG_SESSION_KEY) === "true") return;
    window.sessionStorage.setItem(REEL_CACHE_LOG_SESSION_KEY, "true");
  } catch {
    // The log itself is non-critical.
  }
  console.info(`Reels cache-first: ${cachedCount} playable cached, ${fallbackCount} fallbacks, light discovery allowed: ${Boolean(lightDiscoveryAllowed)}, YouTube UI calls used: ${youtubeCallsUsed}.`);
}

function readTmdbReelSeedDone() {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(TMDB_REEL_SEED_SESSION_KEY) === "true";
  } catch {
    return true;
  }
}

function markTmdbReelSeedDone() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TMDB_REEL_SEED_SESSION_KEY, "true");
  } catch {
    // Non-critical guard metadata.
  }
}

function readReelsMutedPreference() {
  if (typeof window === "undefined") return true;
  try {
    const value = window.localStorage.getItem("moviegram.reelsMuted");
    return value === null ? true : value !== "false";
  } catch {
    return true;
  }
}

function saveReelsMutedPreference(muted) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("moviegram.reelsMuted", muted ? "true" : "false");
  } catch {
    // Non-critical player preference.
  }
}

function readReelLikes() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(REEL_LIKES_STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveReelLikes(likes = {}) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REEL_LIKES_STORAGE_KEY, JSON.stringify(likes));
  } catch {
    // Reel likes stay local and should never interrupt playback.
  }
}

function readReelComments() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(REEL_COMMENTS_STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveReelComments(comments = {}) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REEL_COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  } catch {
    // Local comment drafts should never interrupt Reels.
  }
}

function parseExternalReelUrl(value = "") {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    const videoId = host === "youtu.be"
      ? pathParts[0]
      : url.searchParams.get("v") || (pathParts[0] === "shorts" ? pathParts[1] : pathParts.at(-1));
    if (!videoId) return null;
    return {
      source: "youtube",
      sourceVideoId: videoId,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&enablejsapi=1`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      label: "Short"
    };
  }
  if (host.endsWith("instagram.com")) {
    const shortcode = pathParts.find((part, index) => ["reel", "p", "tv"].includes(pathParts[index - 1])) || pathParts[1] || pathParts[0];
    const embedUrl = shortcode ? `https://www.instagram.com/reel/${shortcode}/embed` : "";
    return {
      source: "instagram",
      sourceVideoId: shortcode || null,
      sourceUrl: url.toString(),
      embedUrl,
      watchUrl: url.toString(),
      label: "Instagram Reel"
    };
  }
  if (host.endsWith("facebook.com") && (pathParts.includes("reel") || pathParts.includes("watch") || pathParts.includes("videos"))) {
    return {
      source: "facebook",
      sourceVideoId: url.searchParams.get("v") || pathParts.at(-1) || null,
      sourceUrl: url.toString(),
      embedUrl: buildFacebookEmbedUrl(url.toString()),
      watchUrl: url.toString(),
      label: "Facebook Reel"
    };
  }
  return {
    source: "manual",
    sourceVideoId: null,
    sourceUrl: url.toString(),
    embedUrl: "",
    watchUrl: url.toString(),
    label: "Edit"
  };
}

function buildFacebookEmbedUrl(sourceUrl = "") {
  if (!sourceUrl) return "";
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(sourceUrl)}&show_text=false&autoplay=true&mute=true&allowfullscreen=true`;
}

function reelSourceFromUrl(source = "", sourceUrl = "") {
  const normalizedSource = String(source || "").toLowerCase();
  if (normalizedSource === "fallback" || normalizedSource === "preview") return normalizedSource;
  if (normalizedSource && !["manual", "web"].includes(normalizedSource)) return normalizedSource;
  if (/youtu\.be|youtube(?:-nocookie)?\.com/i.test(sourceUrl)) return "youtube";
  if (/instagram\.com/i.test(sourceUrl)) return "instagram";
  if (/facebook\.com|fb\.watch/i.test(sourceUrl)) return "facebook";
  const parsed = parseExternalReelUrl(sourceUrl);
  return parsed?.source || normalizedSource || "manual";
}

function reelEmbedUrlForSource(source = "", sourceVideoId = "", sourceUrl = "", cachedEmbedUrl = "") {
  if (cachedEmbedUrl) return cachedEmbedUrl;
  if (source === "youtube" && sourceVideoId) {
    return buildYouTubeEmbedUrl(sourceVideoId);
  }
  if (source === "facebook" && sourceUrl) return buildFacebookEmbedUrl(sourceUrl);
  if (source === "instagram" && sourceUrl) return parseExternalReelUrl(sourceUrl)?.embedUrl || "";
  return "";
}

function buildYouTubeEmbedUrl(videoId = "", muted = true) {
  if (!videoId) return "";
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    playsinline: "1",
    rel: "0",
    controls: "0",
    modestbranding: "1",
    enablejsapi: "1"
  });
  if (typeof window !== "undefined" && window.location?.origin) params.set("origin", window.location.origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function getYouTubeVideoId(reel = {}) {
  const direct = reel.sourceVideoId || reel.source_video_id || reel.video_id || reel.youtube_key || (reel.source === "youtube" ? reel.id : "");
  if (direct && /^[A-Za-z0-9_-]{6,}$/.test(String(direct))) return String(direct).split(/[?&/#]/)[0];
  const values = [reel.embedUrl, reel.embed_url, reel.watchUrl, reel.watch_url, reel.sourceUrl, reel.source_url].filter(Boolean);
  for (const value of values) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const parts = url.pathname.split("/").filter(Boolean);
      if (host === "youtu.be" && parts[0]) return parts[0].split(/[?&/#]/)[0];
      if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        const fromQuery = url.searchParams.get("v");
        if (fromQuery) return fromQuery.split(/[?&/#]/)[0];
        const embedIndex = parts.findIndex((part) => part === "embed" || part === "shorts");
        if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1].split(/[?&/#]/)[0];
      }
    } catch {
      const match = String(value).match(/(?:embed\/|shorts\/|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{6,})/);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

function isYouTubeReel(reel = {}) {
  if ((reel.source || "").toLowerCase() === "youtube") return true;
  return [reel.embedUrl, reel.watchUrl, reel.sourceUrl, reel.embed_url, reel.watch_url, reel.source_url]
    .filter(Boolean)
    .some((value) => /youtu\.be|youtube(?:-nocookie)?\.com/i.test(value));
}

function reelTypeLabel(reel = {}) {
  const text = `${reel.label || ""} ${reel.kind || ""} ${reel.video_type || ""} ${reel.type || ""} ${reel.videoTitle || ""} ${reel.video_title || ""}`.toLowerCase();
  if (text.includes("official trailer")) return "Official Trailer";
  if (text.includes("trailer")) return "Trailer";
  if (text.includes("behind the scenes")) return "Behind the Scenes";
  if (text.includes("featurette")) return "Featurette";
  if (text.includes("teaser")) return "Teaser";
  if (text.includes("clip")) return "Clip";
  if (text.includes("scene edit")) return "Scene Edit";
  if (text.includes("instagram")) return "Instagram Reel";
  if (text.includes("facebook")) return "Facebook Reel";
  if (text.includes("short")) return "Short";
  return reel.kind || "";
}

function reelTypeRank(reel = {}) {
  const label = reelTypeLabel(reel).toLowerCase();
  if (label.includes("short") || label.includes("instagram") || label.includes("facebook")) return 90;
  if (label.includes("clip")) return 82;
  if (label.includes("scene edit")) return 78;
  if (label.includes("teaser")) return 68;
  if (label.includes("featurette")) return 58;
  if (label.includes("behind the scenes")) return 54;
  if (label.includes("trailer")) return 28;
  return 44;
}

function reelAspectRank(reel = {}) {
  const text = `${reel.aspectMode || ""} ${reel.aspect_mode || ""} ${reel.content_format || ""} ${reel.label || ""} ${reel.kind || ""} ${reel.sourceUrl || ""} ${reel.watchUrl || ""} ${reel.embedUrl || ""}`.toLowerCase();
  if (text.includes("vertical") || text.includes("/shorts/") || text.includes("reel")) return 32;
  if (text.includes("horizontal")) return -4;
  return 0;
}

function rankReelsForFeed(reels = []) {
  const titleTrailerCount = new Map();
  return [...reels]
    .map((reel) => {
      const itemKey = reel.item ? keyOf(reel.item) : "";
      const label = reelTypeLabel(reel).toLowerCase();
      const isTrailer = label.includes("trailer");
      const trailerCount = titleTrailerCount.get(itemKey) || 0;
      if (isTrailer) titleTrailerCount.set(itemKey, trailerCount + 1);
      return {
        ...reel,
        score: Number(reel.score || 0) + reelTypeRank(reel) + reelAspectRank(reel) - (isTrailer && trailerCount > 0 ? 120 : 0)
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function reelIdentity(reel = {}) {
  const source = reelSourceFromUrl(reel.source || "", reel.sourceUrl || reel.watchUrl || reel.embedUrl || "");
  return `${source}:${getYouTubeVideoId(reel) || reel.sourceVideoId || reel.id || reel.sourceUrl || reel.watchUrl || reel.embedUrl || keyOf(reel.item || {})}`;
}

function mergePlayableReels(primary = [], incoming = []) {
  const seen = new Set();
  return rankReelsForFeed([...primary, ...incoming].filter((reel) => {
    if (!reel || reel.isFallbackPreview) return false;
    const identity = reelIdentity(reel);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }));
}

function hasPlayableReels(list = []) {
  return Array.isArray(list) && list.some((reel) => {
    if (!reel || reel.isFallbackPreview) return false;
    return Boolean(
      reel.sourceVideoId
      || reel.source_video_id
      || reel.embedUrl
      || reel.embed_url
      || reel.watchUrl
      || reel.watch_url
      || reel.sourceUrl
      || reel.source_url
      || reel.id
    );
  });
}

function hashString(value = "") {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed, index) {
  const value = hashString(`${seed}:${index}`);
  return value / 4294967295;
}

function rotateAndDiversifyReels(reels = [], tab = "forYou", userId = "guest") {
  const playable = mergePlayableReels([], reels);
  if (playable.length <= 1) {
    const first = playable[0] ? (getYouTubeVideoId(playable[0]) || playable[0].id || "none") : "none";
    return { reels: playable, seedLabel: `${userId || "guest"}:${tab}:${REEL_RUNTIME_SESSION_ID}`, first, unique: playable.length };
  }

  const seedLabel = `${userId || "guest"}:${tab}:${new Date().toISOString().slice(0, 10)}:${REEL_RUNTIME_SESSION_ID}`;
  const weighted = playable
    .map((reel, index) => ({
      reel,
      index,
      itemKey: keyOf(reel.item || {}),
      score: Number(reel.score || 0),
      sortValue: (Number(reel.score || 0) * 0.72) + (seededUnit(seedLabel, index) * 90)
    }))
    .sort((a, b) => b.sortValue - a.sortValue);

  const output = [];
  while (weighted.length) {
    const lastItemKey = output.at(-1) ? keyOf(output.at(-1).item || {}) : "";
    const nextIndex = weighted.findIndex((entry) => entry.itemKey && entry.itemKey !== lastItemKey);
    const [picked] = weighted.splice(nextIndex >= 0 ? nextIndex : 0, 1);
    output.push(picked.reel);
  }

  const offset = hashString(seedLabel) % output.length;
  const rotated = [...output.slice(offset), ...output.slice(0, offset)];
  return {
    reels: rotated,
    seedLabel,
    first: getYouTubeVideoId(rotated[0]) || rotated[0]?.id || "none",
    unique: new Set(rotated.map(reelIdentity)).size
  };
}

function mediaType(item) {
  if (item.media_type) return item.media_type;
  return item.first_air_date || item.name ? "tv" : "movie";
}

function titleOf(item) {
  return item.title || item.name || item.original_title || item.original_name || "Untitled";
}

function dateOf(item) {
  return item.release_date || item.first_air_date || "";
}

function isReleased(item = {}) {
  const value = dateOf(item);
  if (value) {
    const releaseDate = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(releaseDate.getTime())) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return releaseDate <= todayStart;
    }
  }
  const year = Number(item.release_year || yearOf(item));
  if (Number.isFinite(year) && year > 0) return year <= new Date().getFullYear();
  return true;
}

function releaseMessage(item = {}) {
  const value = dateOf(item);
  if (value) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return `Releases on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return "You can mark this watched after release.";
}

function yearOf(item) {
  return dateOf(item)?.slice(0, 4) || "TBA";
}

function keyOf(item) {
  if (item?.id) return `${mediaType(item)}:${item.id}`;
  return `title:${titleOf(item).trim().toLowerCase()}:${yearOf(item)}`;
}

function fallbackKeyOf(item) {
  return `${titleOf(item).trim().toLowerCase()}:${yearOf(item)}`;
}

function itemMatches(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && mediaType(a) === mediaType(b)) return String(a.id) === String(b.id);
  if (a.id && b.id && (!a.media_type || !b.media_type)) return String(a.id) === String(b.id);
  return fallbackKeyOf(a) === fallbackKeyOf(b);
}

function hasStoredItem(item, collection = {}) {
  if (!item) return false;
  if (collection[keyOf(item)]) return true;
  if (item.id && (collection[`movie:${item.id}`] || collection[`tv:${item.id}`])) return true;
  return Object.values(collection).some((entry) => itemMatches(item, entry));
}

function ratingForItem(item, ratings = {}) {
  if (!item) return null;
  const raw = ratings[keyOf(item)] || (item.id ? ratings[`movie:${item.id}`] || ratings[`tv:${item.id}`] : null);
  return normalizeUserRating(raw);
}

function normalizeUserRating(value) {
  const numeric = Number(value || 0);
  if (!numeric) return null;
  const fivePoint = numeric > 5 ? numeric / 2 : numeric;
  const rounded = Math.round(fivePoint * 2) / 2;
  return rounded > 0 ? Math.min(5, rounded) : null;
}

function formatUserRating(value) {
  const rating = normalizeUserRating(value);
  if (!rating) return "";
  return `${Number.isInteger(rating) ? rating.toFixed(0) : rating.toFixed(1)}/5`;
}

function normalizeRatingsCollection(collection = {}) {
  return Object.entries(collection).reduce((next, [key, value]) => {
    const rating = normalizeUserRating(value);
    if (rating) next[key] = rating;
    return next;
  }, {});
}

function externalRatingCacheKey(item) {
  return `moviegram.externalRatings.${keyOf(item)}`;
}

function episodeKey(showId, seasonNumber, episodeNumber) {
  return `tv:${showId}:s${seasonNumber}:e${episodeNumber}`;
}

function parseEpisodeProgressKey(value = "") {
  const match = String(value).match(/^tv:(\d+):s(\d+):e(\d+)$/);
  if (!match) return null;
  return {
    showId: Number(match[1]),
    seasonNumber: Number(match[2]),
    episodeNumber: Number(match[3])
  };
}

function normalSeasonsOf(show = {}) {
  return (show.seasons || [])
    .filter((season) => season && season.season_number !== 0 && season.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number);
}

function providerSearchUrl(provider = {}, title = "") {
  const query = encodeURIComponent(title || "");
  if (!query) return "";
  const name = (provider.name || "").toLowerCase();
  if (name.includes("netflix")) return `https://www.netflix.com/search?q=${query}`;
  if (name.includes("prime")) return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
  if (name.includes("hotstar") || name.includes("disney")) return `https://www.hotstar.com/in/search?q=${query}`;
  if (name.includes("apple")) return `https://tv.apple.com/search?term=${query}`;
  if (name.includes("youtube")) return `https://www.youtube.com/results?search_query=${query}`;
  if (name.includes("google")) return `https://play.google.com/store/search?q=${query}&c=movies`;
  if (name.includes("zee")) return `https://www.zee5.com/search?q=${query}`;
  if (name.includes("sony")) return `https://www.sonyliv.com/search/${query}`;
  if (name.includes("jio")) return `https://www.jiocinema.com/search/${query}`;
  return "";
}

function parseOmdbRatings(data) {
  if (!data || data.Response === "False") return [];
  const ratings = [];
  if (data.imdbRating && data.imdbRating !== "N/A") ratings.push({ source: "IMDb", value: data.imdbRating });
  (data.Ratings || []).forEach((entry) => {
    if (entry.Source === "Rotten Tomatoes" && entry.Value && entry.Value !== "N/A") ratings.push({ source: "RT Critics", value: entry.Value });
  });
  return ratings;
}

function normalizedTrackingItem(item = {}) {
  return { ...item, media_type: mediaType(item) };
}

function compactStoredItem(item = {}) {
  if (!item) return null;
  const type = mediaType(item);
  const compact = {
    id: item.id,
    media_type: type,
    poster_path: item.poster_path || "",
    watchedAt: item.watchedAt || undefined,
    watchedDateUnknown: item.watchedDateUnknown || undefined,
    savedAt: item.savedAt || undefined,
    likedAt: item.likedAt || undefined,
    rating: item.rating || undefined,
    watch_asap: item.watch_asap || item.watchAsap || undefined,
    watchAsap: item.watchAsap || item.watch_asap || undefined,
    watch_asap_at: item.watch_asap_at || item.watchAsapAt || undefined
  };
  if (type === "tv") {
    compact.name = item.name || item.title || "";
    compact.first_air_date = item.first_air_date || item.release_date || "";
  } else {
    compact.title = item.title || item.name || "";
    compact.release_date = item.release_date || item.first_air_date || "";
  }
  return Object.fromEntries(Object.entries(compact).filter(([, value]) => value !== undefined && value !== ""));
}

function compactStoredCollection(collection = {}) {
  return Object.values(collection || {}).reduce((next, item) => {
    const compact = compactStoredItem(item);
    if (compact) next[keyOf(compact)] = compact;
    return next;
  }, {});
}

function normalizeTrackingCollection(collection = {}) {
  return Object.values(collection).reduce((next, item) => {
    if (!item) return next;
    const normalized = normalizedTrackingItem(item);
    next[keyOf(normalized)] = normalized;
    return next;
  }, {});
}

function mergeTrackingCollections(local = {}, remote = {}) {
  return normalizeTrackingCollection({ ...normalizeTrackingCollection(local), ...normalizeTrackingCollection(remote) });
}

function mergeRatingsCollections(local = {}, remote = {}) {
  return normalizeRatingsCollection({ ...local, ...remote });
}

function libraryIdentityKey(item = {}) {
  const normalized = normalizedTrackingItem(item);
  const explicit = normalized.item_key || normalized.itemKey || normalized.key;
  if (explicit) return String(explicit);
  if (normalized.id) return `${mediaType(normalized)}:${normalized.id}`;
  const year = normalized.release_year || yearOf(normalized);
  return `${mediaType(normalized)}:${titleOf(normalized).trim().toLowerCase()}:${year || ""}`;
}

function mergeLibraryCollection(...collections) {
  const entries = new Map();
  let duplicateRemoved = 0;
  collections.forEach((collection) => {
    Object.values(collection || {}).filter(Boolean).forEach((item) => {
      const normalized = normalizedTrackingItem(item);
      const keys = [
        libraryIdentityKey(normalized),
        normalized.id ? `${mediaType(normalized)}:${normalized.id}` : "",
        `${mediaType(normalized)}:${titleOf(normalized).trim().toLowerCase()}:${normalized.release_year || yearOf(normalized) || ""}`
      ].filter(Boolean);
      const existingKey = keys.find((key) => entries.has(key));
      const targetKey = existingKey || keys[0];
      const existing = entries.get(targetKey);
      if (existing) duplicateRemoved += 1;
      const merged = { ...(existing || {}), ...normalized };
      if (!merged.poster_path && existing?.poster_path) merged.poster_path = existing.poster_path;
      keys.forEach((key) => entries.set(key, merged));
    });
  });
  return {
    collection: normalizeTrackingCollection(Object.fromEntries([...new Set(entries.values())].map((item) => [keyOf(item), item]))),
    duplicateRemoved
  };
}

function mergeReviewCollections(...collections) {
  const entries = new Map();
  collections.forEach((collection) => {
    Object.values(collection || {}).filter(Boolean).forEach((review) => {
      const item = normalizedTrackingItem(review.item || review);
      const key = libraryIdentityKey(item);
      const existing = entries.get(key) || {};
      entries.set(key, {
        ...existing,
        ...review,
        item: { ...(existing.item || {}), ...item, poster_path: item.poster_path || existing.item?.poster_path || "" },
        text: review.text ?? review.review_text ?? existing.text ?? ""
      });
    });
  });
  return Object.fromEntries(Array.from(entries.values()).map((review) => [keyOf(review.item), review]));
}

function mergeLibrarySources({ current = {}, scoped = {}, legacy = {}, remote = {} } = {}) {
  const watchedMerge = mergeLibraryCollection(legacy.watched, scoped.watched, current.watched, remote.watched);
  const watchlistMerge = mergeLibraryCollection(legacy.watchlist, scoped.watchlist, current.watchlist, remote.watchlist);
  const watched = Object.fromEntries(Object.entries(watchedMerge.collection).filter(([, item]) => isReleased(item)));
  const watchlist = enforceWatchExclusivity(watchlistMerge.collection, watched);
  return {
    watchlist,
    watched,
    ratings: mergeRatingsCollections(legacy.ratings, scoped.ratings, current.ratings, remote.ratings),
    reviews: mergeReviewCollections(legacy.reviews, scoped.reviews, current.reviews, remote.reviews),
    favorites: mergeLibraryCollection(legacy.favorites, scoped.favorites, current.favorites, remote.favorites).collection,
    customLists: { ...(legacy.customLists || {}), ...(scoped.customLists || {}), ...(current.customLists || {}), ...(remote.customLists || {}) },
    duplicateRemoved: watchedMerge.duplicateRemoved + watchlistMerge.duplicateRemoved,
    sourceCounts: {
      localWatched: Object.keys({ ...(legacy.watched || {}), ...(scoped.watched || {}), ...(current.watched || {}) }).length,
      remoteWatched: Object.keys(remote.watched || {}).length,
      localWatchlist: Object.keys({ ...(legacy.watchlist || {}), ...(scoped.watchlist || {}), ...(current.watchlist || {}) }).length,
      remoteWatchlist: Object.keys(remote.watchlist || {}).length
    }
  };
}

function enforceWatchExclusivity(watchlist = {}, watched = {}) {
  const normalizedWatched = normalizeTrackingCollection(watched);
  return Object.entries(normalizeTrackingCollection(watchlist)).reduce((next, [key, item]) => {
    if (!hasStoredItem(item, normalizedWatched)) next[key] = item;
    return next;
  }, {});
}

function removeMatchingItem(collection = {}, item) {
  return Object.entries(collection).reduce((next, [key, value]) => {
    if (!itemMatches(item, value) && key !== keyOf(item)) next[key] = value;
    return next;
  }, {});
}

function posterUrl(path, size = "w500") {
  return path ? `${IMAGE_BASE}/${size}${path}` : POSTER_FALLBACK;
}

function backdropUrl(path, size = "w1280") {
  return path ? `${IMAGE_BASE}/${size}${path}` : BACKDROP_FALLBACK;
}

function normalize(items = []) {
  return items
    .filter((item) => item?.id && ["movie", "tv"].includes(mediaType(item)))
    .map((item) => ({ ...item, media_type: mediaType(item) }));
}

function normalizeSearch(items = []) {
  return items
    .filter((item) => item?.id && ["movie", "tv", "person"].includes(item.media_type || mediaType(item)))
    .map((item) => ({ ...item, media_type: item.media_type || mediaType(item) }));
}

function dedupe(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortResults(items = [], query = "") {
  const q = query.trim().toLowerCase();
  return [...items].sort((a, b) => {
    const at = titleOf(a).toLowerCase();
    const bt = titleOf(b).toLowerCase();
    const as = (at === q ? 100000 : 0) + (at.startsWith(q) ? 40000 : 0) + (at.includes(q) ? 12000 : 0) + (a.popularity || 0) * 12 + (a.vote_count || 0);
    const bs = (bt === q ? 100000 : 0) + (bt.startsWith(q) ? 40000 : 0) + (bt.includes(q) ? 12000 : 0) + (b.popularity || 0) * 12 + (b.vote_count || 0);
    return bs - as;
  });
}

function stored(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

const storageQuotaWarnings = new Set();

function compactForStorage(key, value) {
  if (!key?.startsWith("moviegram.")) return value;
  const baseKey = key
    .replace(/^moviegram\.guest\./, "moviegram.")
    .replace(/^moviegram\.user\.[^.]+\./, "moviegram.");
  if (["moviegram.watchlist", "moviegram.watched", "moviegram.favorites"].includes(baseKey)) {
    return compactStoredCollection(value || {});
  }
  if (baseKey === "moviegram.reviews") {
    return Object.entries(value || {}).reduce((next, [entryKey, review]) => {
      const text = review?.text || "";
      const compactItem = compactStoredItem(review?.item);
      if (text.trim() || compactItem) next[entryKey] = { item: compactItem, text, reviewedAt: review?.reviewedAt || undefined };
      return next;
    }, {});
  }
  if (baseKey === "moviegram.customLists") {
    return Object.fromEntries(Object.entries(value || {}).map(([listKey, list]) => [listKey, {
      id: list.id || listKey,
      title: list.title || "Untitled List",
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: (list.items || []).map(compactStoredItem).filter(Boolean)
    }]));
  }
  if (baseKey === "moviegram.continueWatching") {
    return (Array.isArray(value) ? value : []).map((entry) => ({ ...entry, item: compactStoredItem(entry.item || entry) }));
  }
  if (baseKey === "moviegram.profileActivity") {
    return Object.fromEntries(Object.entries(value || {}).map(([eventKey, event]) => [eventKey, {
      type: event?.type || "opened",
      item: compactStoredItem(event?.item),
      timestamp: event?.timestamp,
      source: event?.source || "app"
    }]).filter(([, event]) => event.item));
  }
  if (baseKey === "moviegram.blendLists") {
    return Object.fromEntries(Object.entries(value || {}).map(([listKey, list]) => [listKey, {
      ...list,
      items: (list.items || []).map(compactStoredItem).filter(Boolean)
    }]));
  }
  return value;
}

function persist(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(compactForStorage(key, value)));
  } catch (error) {
    try {
      localStorage.removeItem(key);
    } catch {}
    if (!storageQuotaWarnings.has(key)) {
      storageQuotaWarnings.add(key);
      console.warn("MovieGram local cache write skipped; cleared oversized key.", { key, message: error?.message });
    }
  }
}

const MOVIEGRAM_LOCAL_KEYS = {
  watchlist: "moviegram.watchlist",
  watched: "moviegram.watched",
  episodeProgress: "moviegram.episodeProgress",
  ratings: "moviegram.ratings",
  reviews: "moviegram.reviews",
  favorites: "moviegram.favorites",
  customLists: "moviegram.customLists",
  continueWatching: "moviegram.continueWatching",
  clickSignals: "moviegram.clickSignals",
  feedLikes: "moviegram.feedLikes",
  feedSaves: "moviegram.feedSaves",
  friendStates: "moviegram.friendStates",
  blendLists: "moviegram.blendLists",
  hiddenRecommendations: "moviegram.hiddenRecommendations",
  profileActivity: "moviegram.profileActivity"
};

const DEFAULT_LOCAL_STATE = {
  watchlist: {},
  watched: {},
  episodeProgress: {},
  ratings: {},
  reviews: {},
  favorites: {},
  customLists: {},
  continueWatching: [],
  clickSignals: {},
  feedLikes: {},
  feedSaves: {},
  friendStates: { shruti: "friends", rohan: "friends" },
  blendLists: {},
  hiddenRecommendations: {},
  profileActivity: {}
};

function ownerStorageKey(owner, legacyKey) {
  const suffix = legacyKey.replace(/^moviegram\./, "");
  return owner === "guest"
    ? `moviegram.guest.${suffix}`
    : `moviegram.user.${owner}.${suffix}`;
}

function hasOwnerStorage(owner) {
  if (typeof window === "undefined" || !owner) return false;
  return Object.values(MOVIEGRAM_LOCAL_KEYS).some((key) => localStorage.getItem(ownerStorageKey(owner, key)) !== null);
}

function hasSupabaseAuthToken() {
  if (typeof window === "undefined") return false;
  return Object.keys(localStorage).some((key) => key.startsWith("sb-") && key.includes("auth-token"));
}

function readOwnedValue(owner, name, fallbackToLegacy = false) {
  const legacyKey = MOVIEGRAM_LOCAL_KEYS[name];
  const fallback = DEFAULT_LOCAL_STATE[name];
  const scopedKey = ownerStorageKey(owner, legacyKey);
  if (typeof window === "undefined") return fallback;
  if (localStorage.getItem(scopedKey) !== null) return stored(scopedKey, fallback);
  return fallbackToLegacy ? stored(legacyKey, fallback) : fallback;
}

function normalizeLocalState(raw = {}) {
  const normalizedWatched = normalizeTrackingCollection(raw.watched || {});
  const normalizedWatchlist = enforceWatchExclusivity(normalizeTrackingCollection(raw.watchlist || {}), normalizedWatched);
  return {
    watchlist: normalizedWatchlist,
    watched: normalizedWatched,
    episodeProgress: raw.episodeProgress || {},
    ratings: normalizeRatingsCollection(raw.ratings || {}),
    reviews: raw.reviews || {},
    favorites: normalizeTrackingCollection(raw.favorites || {}),
    customLists: raw.customLists || {},
    continueWatching: Array.isArray(raw.continueWatching) ? raw.continueWatching : [],
    clickSignals: raw.clickSignals || {},
    feedLikes: raw.feedLikes || {},
    feedSaves: raw.feedSaves || {},
    friendStates: raw.friendStates || DEFAULT_LOCAL_STATE.friendStates,
    blendLists: raw.blendLists || {},
    hiddenRecommendations: raw.hiddenRecommendations || {},
    profileActivity: raw.profileActivity || {}
  };
}

function readOwnedLocalState(owner, { fallbackToLegacy = false } = {}) {
  const raw = Object.keys(MOVIEGRAM_LOCAL_KEYS).reduce((next, name) => {
    next[name] = readOwnedValue(owner, name, fallbackToLegacy);
    return next;
  }, {});
  return normalizeLocalState(raw);
}

function readLegacyLocalState() {
  const raw = Object.keys(MOVIEGRAM_LOCAL_KEYS).reduce((next, name) => {
    next[name] = stored(MOVIEGRAM_LOCAL_KEYS[name], DEFAULT_LOCAL_STATE[name]);
    return next;
  }, {});
  return normalizeLocalState(raw);
}

function persistOwnedLocalState(owner, state = {}, { writeLegacy = false } = {}) {
  if (typeof window === "undefined" || !owner) return;
  Object.entries(MOVIEGRAM_LOCAL_KEYS).forEach(([name, legacyKey]) => {
    const value = state[name] ?? DEFAULT_LOCAL_STATE[name];
    persist(ownerStorageKey(owner, legacyKey), value);
    if (writeLegacy) persist(legacyKey, value);
  });
}

function sanitizeUsername(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function defaultProfileForUser(user = null) {
  const emailPrefix = user?.email?.split("@")[0] || "moviegram";
  const username = sanitizeUsername(emailPrefix) || "moviegram";
  const metadata = user?.user_metadata || {};
  return {
    id: user?.id || "guest",
    email: user?.email || "",
    username,
    display_name: metadata.display_name || metadata.full_name || metadata.name || username,
    bio: "",
    avatar_url: metadata.avatar_url || metadata.picture || "",
    is_private: false,
    updated_at: new Date().toISOString()
  };
}

function validateProfileIdentity(profile = {}) {
  const username = sanitizeUsername(profile.username);
  if (!username) return { error: "Username is required." };
  if (username.length < 3 || username.length > 24) return { error: "Username must be 3-24 characters." };
  if (!/^[a-z0-9_]+$/.test(username)) return { error: "Use only lowercase letters, numbers, or underscore." };
  return {
    value: {
      username,
      display_name: (profile.display_name || username).trim().slice(0, 48),
      bio: (profile.bio || "").trim().slice(0, 180),
      avatar_url: (profile.avatar_url || "").trim(),
      is_private: Boolean(profile.is_private)
    }
  };
}

function guestProfileKey() {
  return "moviegram.guest.profile";
}

function readGuestProfile() {
  return { ...defaultProfileForUser(null), ...stored(guestProfileKey(), {}) };
}

function persistGuestProfile(profile) {
  persist(guestProfileKey(), { ...readGuestProfile(), ...profile, updated_at: new Date().toISOString() });
}

async function loadOrCreateSupabaseProfile(user) {
  if (!supabase || !user?.id) return defaultProfileForUser(user);
  const profile = await ensureUserProfile(user);
  return { ...defaultProfileForUser(user), ...(profile || {}), email: user.email || "" };
}

async function saveSupabaseProfile(user, profile) {
  if (!supabase || !user?.id) throw new Error("Sign in to sync profile changes.");
  const validation = validateProfileIdentity(profile);
  if (validation.error) throw new Error(validation.error);
  const saved = await ensureUserProfile(user);
  const updated = await updateUserProfile(user, { ...(saved || {}), ...validation.value });
  if (!updated) throw new Error("Profile table is unavailable.");
  return { ...defaultProfileForUser(user), ...updated, email: user.email || "" };
}

function publicProfileFromRow(row = {}) {
  return {
    id: row.id,
    username: row.username || "moviegram",
    display_name: row.display_name || row.username || "MovieGram user",
    bio: row.bio || "",
    avatar_url: row.avatar_url || "",
    is_private: Boolean(row.is_private)
  };
}

function publicProfileName(profile = {}) {
  return profile.display_name || profile.username || "MovieGram user";
}

function socialActivityCopy(action = "") {
  const labels = {
    watched: "watched",
    follow: "followed",
    follow_accept: "accepted a follow request",
    liked: "liked",
    rated: "rated",
    rating: "rated",
    reviewed: "reviewed",
    review: "reviewed",
    watchlist_add: "watchlisted",
    list_create: "created a list",
    list_add: "added to a list",
    reel_like: "liked a reel",
    reel_comment: "commented on a reel",
    season_completed: "completed a season of",
    show_completed: "completed",
    episode_watched: "watched an episode of"
  };
  return labels[action] || action.replaceAll("_", " ");
}

function publicActivityDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.round(diff / 86400000)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeSocialActivity(row = {}, profileMap = {}) {
  const item = row.item_data || {
    id: row.tmdb_id,
    media_type: row.media_type,
    title: row.title,
    name: row.media_type === "tv" ? row.title : undefined,
    poster_path: row.poster_path
  };
  const profile = profileMap[row.user_id] || { id: row.user_id, username: "moviegram", display_name: "MovieGram user" };
  const action = row.action || row.type || "";
  return {
    id: row.event_key || row.id || `${row.user_id}-${row.created_at}`,
    user_id: row.user_id,
    profile,
    action,
    actionLabel: socialActivityCopy(action),
    item: { ...item, media_type: mediaType(item) },
    title: titleOf(item),
    poster: item.poster_path || row.poster_path,
    metadata: row.metadata || {},
    created_at: row.created_at,
    time: publicActivityDate(row.created_at)
  };
}

async function countRows(table, column, value) {
  if (!supabase || !value) return 0;
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return count || 0;
}

async function countFollowRows(column, value, status = "accepted") {
  if (!supabase || !value) return 0;
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq(column, value)
    .eq("status", status);
  if (error) throw error;
  return count || 0;
}

async function searchPublicProfiles(query, currentUserId) {
  if (!supabase) return [];
  const safeQuery = query.trim().replace(/^@+/, "").replace(/[%(),]/g, "");
  const selectColumns = "id,username,display_name,bio,avatar_url,is_private";
  let request = supabase.schema("public").from("profiles").select(selectColumns).limit(20);
  if (safeQuery) request = request.or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`);
  let { data, error } = await request;
  if (error) console.error("MovieGram user search error", error);
  if (error && String(error.message || "").includes("is_private")) {
    let fallback = supabase.schema("public").from("profiles").select("id,username,display_name,bio,avatar_url").limit(20);
    if (safeQuery) fallback = fallback.or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`);
    const fallbackResult = await fallback;
    data = fallbackResult.data;
    error = fallbackResult.error;
    if (error) console.error("MovieGram user search fallback error", error);
  }
  if (error) throw error;
  return (data || [])
    .filter((row) => row.id !== currentUserId)
    .map(publicProfileFromRow);
}

async function loadSocialFoundation(userId) {
  if (!supabase || !userId) return { profiles: [], followerProfiles: [], followingProfiles: [], followingIds: [], pendingIds: [], followStatuses: {}, pendingRequests: [], activity: [], counts: { followers: 0, following: 0 } };
  const [{ data: followingRows, error: followingError }, { data: requestRows, error: requestError }, { data: followerRows, error: followerError }, followers, following] = await Promise.all([
    supabase.from("follows").select("following_id,status").eq("follower_id", userId),
    supabase.from("follows").select("follower_id,status").eq("following_id", userId).eq("status", "pending"),
    supabase.from("follows").select("follower_id,status").eq("following_id", userId).eq("status", "accepted"),
    countFollowRows("following_id", userId),
    countFollowRows("follower_id", userId)
  ]);
  if (followingError) throw followingError;
  if (requestError) throw requestError;
  if (followerError) throw followerError;
  const followStatuses = Object.fromEntries((followingRows || []).map((row) => [row.following_id, row.status || "accepted"]));
  const followingIds = (followingRows || []).filter((row) => (row.status || "accepted") === "accepted").map((row) => row.following_id).filter(Boolean);
  const pendingIds = (followingRows || []).filter((row) => row.status === "pending").map((row) => row.following_id).filter(Boolean);
  const requesterIds = (requestRows || []).map((row) => row.follower_id).filter(Boolean);
  const followerIds = (followerRows || []).map((row) => row.follower_id).filter(Boolean);
  const allProfileIds = [...new Set([...followingIds, ...pendingIds, ...requesterIds, ...followerIds])];
  if (!allProfileIds.length) return { profiles: [], followerProfiles: [], followingProfiles: [], followingIds, pendingIds, followStatuses, pendingRequests: [], activity: [], counts: { followers, following } };

  const [{ data: profilesData, error: profilesError }, activityResult] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_private").in("id", allProfileIds),
    followingIds.length
      ? supabase.from("activity_events").select("user_id,event_key,action,item_key,item_data,metadata,created_at").in("user_id", followingIds).order("created_at", { ascending: false }).limit(60)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (profilesError) throw profilesError;
  if (activityResult.error) throw activityResult.error;
  const profiles = (profilesData || []).map(publicProfileFromRow);
  const profileMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const pendingRequests = requesterIds.map((id) => profileMap[id]).filter(Boolean);
  const followerProfiles = followerIds.map((id) => profileMap[id]).filter(Boolean);
  const followingProfiles = followingIds.map((id) => profileMap[id]).filter(Boolean);
  return {
    profiles: profiles.filter((profile) => followingIds.includes(profile.id) || pendingIds.includes(profile.id)),
    followerProfiles,
    followingProfiles,
    followingIds,
    pendingIds,
    followStatuses,
    pendingRequests,
    activity: (activityResult.data || []).map((row) => normalizeSocialActivity(row, profileMap)),
    counts: { followers, following }
  };
}

async function loadPublicProfileBundle(profileId, viewerId) {
  if (!supabase || !profileId) return null;
  const [{ data: profileRow, error: profileError }, followers, following, relationResult] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_private").eq("id", profileId).maybeSingle(),
    countFollowRows("following_id", profileId),
    countFollowRows("follower_id", profileId),
    viewerId
      ? supabase.from("follows").select("status").eq("follower_id", viewerId).eq("following_id", profileId).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  if (profileError) throw profileError;
  if (relationResult.error) throw relationResult.error;
  const profile = publicProfileFromRow(profileRow || { id: profileId });
  const relationStatus = profileId === viewerId ? "owner" : relationResult.data?.status || "";
  const canViewActivity = !profile.is_private || relationStatus === "owner" || relationStatus === "accepted";
  const { data: activityRows, error: activityError } = canViewActivity
    ? await supabase.from("activity_events").select("user_id,event_key,action,item_key,item_data,metadata,created_at").eq("user_id", profileId).order("created_at", { ascending: false }).limit(30)
    : { data: [], error: null };
  if (activityError) throw activityError;
  const profileMap = { [profile.id]: profile };
  const activity = (activityRows || []).map((row) => normalizeSocialActivity(row, profileMap));
  let tracking = { watchlist: {}, watched: {}, favorites: {}, ratings: {}, reviews: {}, customLists: {} };
  if (canViewActivity) {
    try {
      const remote = await loadMovieGramRemoteState(profileId);
      tracking = remote || tracking;
    } catch (error) {
      console.error("MovieGram public profile tracking load error", error);
    }
  }
  const watchedCount = Object.keys(tracking.watched || {}).length || activity.filter((event) => ["watched", "episode_watched", "season_completed", "show_completed"].includes(event.action)).length;
  return {
    profile,
    stats: {
      followers,
      following,
      watched: canViewActivity ? watchedCount : 0,
      watchlist: Object.keys(tracking.watchlist || {}).length,
      reviews: Object.keys(tracking.reviews || {}).length
    },
    tracking,
    activity,
    relationStatus,
    canViewActivity
  };
}

function Icon({ name }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
    search: "M11 17a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm5-1 5 5",
    reels: "M4 5h16v16H4zM8 5l3 5m3-5 3 5M4 10h16m-8 4 4 2.5-4 2.5z",
    log: "M12 5v14M5 12h14M5 5h14v14H5z",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
    feed: "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4",
    list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
    chart: "M5 19V9M12 19V5M19 19v-8M3 19h18",
    book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H7a3 3 0 0 0-3 3zM4 5.5V23",
    chat: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
    bell: "M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16zM10 21h4",
    bookmark: "M6 4h12v17l-6-4-6 4z",
    check: "m5 12 4 4L19 6",
    clock: "M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    heart: "M12 21s-7-4.4-9-9a5 5 0 0 1 8-5 5 5 0 0 1 8 5c-2 4.6-9 9-9 9z",
    play: "m8 5 11 7-11 7z",
    pause: "M7 5h4v14H7zM13 5h4v14h-4z",
    volume: "M4 10v4h4l5 4V6l-5 4H4zM16 9a4 4 0 0 1 0 6",
    muted: "M4 10v4h4l5 4V6l-5 4H4zM17 9l4 4m0-4-4 4",
    send: "m3 11 18-8-8 18-2-8z",
    dots: "M5 12h.01M12 12h.01M19 12h.01",
    back: "M15 18 9 12l6-6"
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function Avatar({ friend, size = "" }) {
  return <span className={`mg2-avatar ${friend.avatar} ${size}`} aria-hidden="true" />;
}

function PublicAvatar({ profile, size = "" }) {
  if (profile?.avatar_url) {
    return <img className={`mg2-public-avatar ${size}`} src={profile.avatar_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />;
  }
  const initial = (publicProfileName(profile).trim()[0] || "M").toUpperCase();
  return <span className={`mg2-public-avatar fallback ${size}`} aria-hidden="true">{initial}</span>;
}

function PhoneShell({ activeTab, setActiveTab, title, children, onOpenMessages, onOpenNotifications, socialActive, onCloseSocial }) {
  function activateTab(tabId) {
    if (socialActive) onCloseSocial();
    setActiveTab(tabId);
  }

  return (
    <main className="mg2-app">
      <section className={`mg2-phone${socialActive ? " social-active" : ""}`}>
        <div className="mg2-status"><span>9:41</span><span>Wi-Fi</span></div>
        <header className="mg2-topbar">
          <div>
            {activeTab === "home" ? <h1 className="mg2-brand">Movie<span>Gram</span></h1> : <h1>{title}</h1>}
          </div>
          <div className="mg2-top-actions">
            <button type="button" aria-label="Messages" onClick={onOpenMessages}>
              <Icon name="chat" />
              <em>3</em>
            </button>
            <button type="button" aria-label="Notifications" onClick={onOpenNotifications}>
              <Icon name="bell" />
              <em>7</em>
            </button>
          </div>
        </header>
        <div className={`mg2-screen${socialActive ? " social-active" : ""}`}>{children}</div>
        {!socialActive && (
          <nav className="mg2-bottom" aria-label="Primary navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                type="button"
                onClick={() => activateTab(tab.id)}
                onPointerUp={() => activateTab(tab.id)}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        )}
      </section>
    </main>
  );
}

function Spinner() {
  return <span className="mg2-spinner" aria-label="Loading" />;
}

function SkeletonRow() {
  return (
    <div className="mg2-row">
      {Array.from({ length: 5 }, (_, index) => <div className="mg2-skeleton" key={index} />)}
    </div>
  );
}

function PosterCard({ item, onOpen, saved, watched, rating, favorite, compact = false, onQuickActions }) {
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const statusBadges = [
    watched && { key: "watched", icon: <Icon name="check" />, label: "Watched" },
    saved && { key: "watchlisted", icon: <Icon name="bookmark" />, label: "Watchlist" },
    rating && { key: "rated", text: rating, label: `Rated ${rating}` },
    favorite && { key: "favorite", icon: <Icon name="heart" />, label: "Favorite" }
  ].filter(Boolean);
  const startLongPress = () => {
    if (!onQuickActions) return;
    longPressFired.current = false;
    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onQuickActions(item);
    }, 520);
  };
  const cancelLongPress = () => window.clearTimeout(longPressTimer.current);
  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onOpen(item);
  };

  return (
    <button
      className={`mg2-poster ${compact ? "compact" : ""}`}
      type="button"
      onClick={handleClick}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(event) => {
        if (!onQuickActions) return;
        event.preventDefault();
        onQuickActions(item);
      }}
    >
      <img
        src={posterUrl(item.poster_path)}
        alt={titleOf(item)}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = POSTER_FALLBACK;
        }}
      />
      {statusBadges.length > 0 && (
        <span className="mg2-status-badges">
          {statusBadges.map((badge) => (
            <i key={badge.key} className={badge.key} aria-label={badge.label}>
              {badge.icon || badge.text}
            </i>
          ))}
        </span>
      )}
      <strong>{titleOf(item)}</strong>
      <small>{item.vote_average ? item.vote_average.toFixed(1) : "NR"} / {yearOf(item)}</small>
    </button>
  );
}

function ContentRow({ title, items, loading, onOpen, watchlist, watched = {}, ratings, favorites = {}, onQuickActions }) {
  return (
    <section className="mg2-section">
      <div className="mg2-section-head"><h2>{title}</h2><span>See All</span></div>
      {loading ? <SkeletonRow /> : (
        <div className="mg2-row">
          {items.map((item) => (
            <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} onQuickActions={onQuickActions} saved={hasStoredItem(item, watchlist)} watched={hasStoredItem(item, watched)} rating={ratingForItem(item, ratings)} favorite={hasStoredItem(item, favorites)} />
          ))}
        </div>
      )}
    </section>
  );
}

function PersonCard({ person, onOpenPerson }) {
  const knownFor = (person.known_for || [])
    .map((item) => titleOf(item))
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  return (
    <button className="mg2-person-result" type="button" onClick={() => onOpenPerson(person)}>
      <img src={posterUrl(person.profile_path, "w185")} alt={person.name} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
      <span>
        <strong>{person.name}</strong>
        <small>{person.known_for_department || "Person"}{knownFor ? ` - ${knownFor}` : ""}</small>
      </span>
    </button>
  );
}

function UserResultCard({ profile, onOpenPublicProfile }) {
  const username = profile.username ? `@${profile.username}` : "@moviegram";
  return (
    <button className="mg2-person-result" type="button" onClick={() => onOpenPublicProfile?.(profile)}>
      <PublicAvatar profile={profile} />
      <span>
        <strong>{publicProfileName(profile)}</strong>
        <small>{username}{profile.is_private ? " - Private" : ""}{profile.bio ? ` - ${profile.bio}` : ""}</small>
      </span>
    </button>
  );
}

function WatchedDateSheet({ action, onChoose, onCancel }) {
  const [picking, setPicking] = useState(false);
  const [pickedDate, setPickedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  if (!action) return null;
  const chooseDate = (mode) => {
    setError("");
    if (mode === "pick") {
      setPicking(true);
      return;
    }
    onChoose(mode);
  };
  const submitPicked = () => {
    if (pickedDate > new Date().toISOString().slice(0, 10)) {
      setError("You can't mark something watched in the future.");
      return;
    }
    onChoose("picked", pickedDate);
  };

  return (
    <div className="mg2-sheet-backdrop" onMouseDown={onCancel}>
      <section className="mg2-watch-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span />
        <h3>{action.title || "Mark watched"}</h3>
        <p>{action.message || `When did you watch ${titleOf(action.item)}?`}</p>
        {picking ? (
          <div className="mg2-date-picker">
            <input type="date" max={new Date().toISOString().slice(0, 10)} value={pickedDate} onChange={(event) => { setPickedDate(event.target.value); setError(""); }} />
            {error && <em>{error}</em>}
            <button type="button" onClick={submitPicked}>Save date</button>
            <button type="button" onClick={() => setPicking(false)}>Back</button>
          </div>
        ) : (
          <div className="mg2-sheet-actions">
            <button type="button" onClick={() => chooseDate("today")}>Today</button>
            <button type="button" onClick={() => chooseDate("yesterday")}>Yesterday</button>
            <button type="button" onClick={() => chooseDate("pick")}>Pick date</button>
            <button type="button" onClick={() => chooseDate("unknown")}>Unknown date</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}

function QuickActionSheet({ item, saved, watched, watchAsap, favorite, onClose, onWatched, onWatchlist, onWatchAsap, onFavorite, onOpen }) {
  if (!item) return null;
  const released = isReleased(item);
  return (
    <div className="mg2-sheet-backdrop" onMouseDown={onClose}>
      <section className="mg2-quick-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span />
        <div className="mg2-quick-title">
          <img src={posterUrl(item.poster_path, "w185")} alt="" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
          <div>
            <h3>{titleOf(item)}</h3>
            <p>{mediaType(item) === "tv" ? "TV Show" : "Movie"} - {yearOf(item)}</p>
          </div>
        </div>
        <button type="button" disabled={!watched && !released} onClick={() => { onWatched(item); onClose(); }}><Icon name="check" /> {watched ? "Mark unwatched" : released ? "Mark watched" : releaseMessage(item)}</button>
        <button type="button" onClick={() => { onWatchlist(item); onClose(); }}><Icon name="bookmark" /> {saved ? "Remove watchlist" : "Add watchlist"}</button>
        <button type="button" onClick={() => { onWatchAsap(item); onClose(); }}><Icon name="clock" /> {watchAsap ? "Remove Watch ASAP" : "Watch ASAP"}</button>
        <button type="button" onClick={() => { onFavorite(item); onClose(); }}><Icon name="heart" /> {favorite ? "Unlike" : "Like"}</button>
        <button type="button" onClick={() => { onOpen(item); onClose(); }}><Icon name="play" /> Open Details</button>
      </section>
    </div>
  );
}

function AuthSheet({ open, user, configured, loading, message, onClose, onSubmit, onLogout, onClearMessage }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setPassword("");
    onClearMessage?.();
  };
  if (!open) return null;
  const title = user ? "MovieGram Beta" : mode === "signup" ? "Create account" : mode === "reset" ? "Reset password" : "Log in";
  const submitDisabled = loading || !email || (mode !== "reset" && !password);
  return (
    <div className="mg2-sheet-backdrop" onMouseDown={onClose}>
      <section className="mg2-watch-sheet mg2-auth-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span />
        <h3>{title}</h3>
        {!configured ? (
          <p>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable cloud sync. Guest mode still works locally.</p>
        ) : user ? (
          <>
            <p>{user.email} is syncing supported tracking data with Supabase.</p>
            <div className="mg2-sheet-actions">
              <button type="button" onClick={onLogout} disabled={loading}>{loading ? "Logging out..." : "Logout"}</button>
              <button type="button" onClick={onClose} disabled={loading}>Done</button>
            </div>
          </>
        ) : (
          <>
            <p>{mode === "reset" ? "Enter your email and we will send a secure reset link." : "Use email/password for the private beta. Your local data will merge only after verified login."}</p>
            <div className="mg2-auth-fields">
              <input value={email} disabled={loading} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
              {mode !== "reset" && <input value={password} disabled={loading} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />}
            </div>
            {message && <em className="mg2-auth-message">{message}</em>}
            <div className="mg2-sheet-actions">
              <button type="button" disabled={submitDisabled} onClick={() => onSubmit(mode, email, password)}>{loading ? "Please wait..." : mode === "reset" ? "Send reset email" : mode === "login" ? "Login" : "Sign up"}</button>
              {mode === "login" && <button type="button" disabled={loading} onClick={() => switchMode("reset")}>Forgot password?</button>}
              <button type="button" disabled={loading} onClick={() => switchMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Have an account?" : "Need an account?"}</button>
              <button type="button" disabled={loading} onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function AuthOnboarding({ configured, loading, onGuest, onSession, onProfileSaved, onComplete }) {
  const [screen, setScreen] = useState("welcome");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileDraft, setProfileDraft] = useState({ username: "", display_name: "", bio: "" });
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const cleanEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const cleanOtp = otp.trim();
  const otpValid = /^[a-zA-Z0-9]{6,8}$/.test(cleanOtp);
  const resetFeedback = () => {
    setMessage("");
    setError("");
  };
  const go = (next) => {
    resetFeedback();
    setScreen(next);
  };
  const authErrorMessage = (authError) => {
    const raw = `${authError?.message || ""}`.toLowerCase();
    if (raw.includes("email not confirmed") || raw.includes("not confirmed")) return "Please verify your email before logging in.";
    if (raw.includes("invalid login") || raw.includes("invalid credentials") || raw.includes("user not found")) return "Incorrect email or password.";
    if (raw.includes("domain") || raw.includes("recipient") || raw.includes("resend") || raw.includes("sender")) return "Email sending is in test mode. Use the verified test email or configure a verified sender domain.";
    return authError?.message || "Authentication failed.";
  };
  const logAuthError = (action, authError) => {
    console.error(`MovieGram auth ${action} error`, {
      message: authError?.message,
      code: authError?.code,
      status: authError?.status,
      details: authError?.details,
      hint: authError?.hint,
      error: authError
    });
  };
  const readableAuthError = (authError, fallback = "Authentication failed.") => {
    const message = authErrorMessage(authError);
    return message === "Authentication failed." ? (authError?.message || fallback) : message;
  };
  const sendOtp = async () => {
    if (!supabase || !emailValid) return;
    setBusy(true);
    resetFeedback();
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: true }
      });
      if (otpError) throw otpError;
      setMessage("We sent a code to your email.");
      setScreen("verify");
    } catch (sendError) {
      logAuthError("send otp", sendError);
      setError(readableAuthError(sendError, "Could not send code."));
    } finally {
      setBusy(false);
    }
  };
  const continueWithGoogle = async () => {
    if (!supabase || typeof window === "undefined") return;
    setBusy(true);
    resetFeedback();
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (googleError) throw googleError;
    } catch (googleError) {
      logAuthError("google oauth", googleError);
      setError(readableAuthError(googleError, "Could not start Google sign-in."));
      setBusy(false);
    }
  };
  const verifyOtp = async () => {
    if (!supabase || !emailValid || !otpValid) return;
    setBusy(true);
    resetFeedback();
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanOtp, type: "email" });
      if (verifyError) throw verifyError;
      if (!data?.session?.user) throw new Error("Could not verify email. Request a new code and try again.");
      setVerifiedUser(data.session.user);
      onSession(data.session);
      const username = sanitizeUsername(cleanEmail.split("@")[0] || "moviegram");
      setProfileDraft((current) => ({ ...current, username, display_name: username }));
      setMessage("Email verified.");
      setScreen("profile");
    } catch (verifyError) {
      logAuthError("verify otp", verifyError);
      setError(readableAuthError(verifyError, "Invalid verification code."));
    } finally {
      setBusy(false);
    }
  };
  const saveProfileStep = async () => {
    const user = verifiedUser;
    const validation = validateProfileIdentity(profileDraft);
    if (!user) {
      setError("Verify your email first.");
      return;
    }
    if (validation.error) {
      setError(validation.error);
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const saved = await saveSupabaseProfile(user, validation.value);
      onProfileSaved(saved);
      setScreen("password");
    } catch (profileError) {
      setError(profileError.message?.includes("duplicate") || profileError.message?.includes("unique") ? "That username is already taken." : profileError.message || "Could not save profile.");
    } finally {
      setBusy(false);
    }
  };
  const savePasswordStep = async () => {
    if (!supabase) return;
    resetFeedback();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { data, error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      if (data?.user) setVerifiedUser(data.user);
      setMessage("Account ready.");
      onComplete();
    } catch (passwordError) {
      logAuthError("set password", passwordError);
      setError(readableAuthError(passwordError, "Could not save password."));
    } finally {
      setBusy(false);
    }
  };
  const login = async () => {
    if (!supabase || !emailValid || !password) return;
    setBusy(true);
    resetFeedback();
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (loginError) throw loginError;
      if (!data?.session?.user) throw new Error("Email verification is required before login.");
      onSession(data.session);
      onComplete();
    } catch (loginError) {
      logAuthError("login", loginError);
      setError(authErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };
  const sendReset = async () => {
    if (!supabase || !emailValid) return;
    setBusy(true);
    resetFeedback();
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (resetError) throw resetError;
      setMessage("If an account exists, reset instructions were sent.");
    } catch (resetError) {
      logAuthError("reset password", resetError);
      setMessage("If an account exists, reset instructions were sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mg2-auth-page">
      <section className="mg2-auth-card">
        <div className="mg2-auth-brand">
          <span>Movie<span>Gram</span></span>
          <small>Track, share, and discover what to watch next.</small>
        </div>
        {loading ? (
          <div className="mg2-auth-state">Checking your account...</div>
        ) : !configured ? (
          <>
            <div className="mg2-auth-state">Supabase is not configured. Guest mode is available locally.</div>
            <button type="button" onClick={onGuest}>Continue as guest</button>
          </>
        ) : screen === "welcome" ? (
          <>
            <div className="mg2-auth-hero-copy">
              <h1>Welcome to MovieGram</h1>
              <p>Your private beta movie and TV social tracker.</p>
            </div>
            <div className="mg2-auth-actions">
              <button className="mg2-google-auth" type="button" disabled={busy} onClick={continueWithGoogle}>Continue with Google</button>
              <button type="button" onClick={() => go("signup")}>Create account</button>
              <button type="button" onClick={() => go("login")}>Log in</button>
              <button type="button" onClick={onGuest}>Continue as guest</button>
            </div>
          </>
        ) : (
          <>
            <button className="mg2-auth-back" type="button" disabled={busy} onClick={() => go(screen === "verify" ? "signup" : screen === "profile" || screen === "password" ? "welcome" : "welcome")}><Icon name="back" /> Back</button>
            {screen === "signup" && (
              <div className="mg2-auth-step">
                <h1>Create account</h1>
                <p>Enter your email. We will send a verification code.</p>
                <button className="mg2-google-auth" type="button" disabled={busy} onClick={continueWithGoogle}>Continue with Google</button>
                <input value={email} disabled={busy} type="email" placeholder="Email" onChange={(event) => setEmail(event.target.value)} />
                <button type="button" disabled={busy || !emailValid} onClick={sendOtp}>{busy ? "Sending..." : "Send code"}</button>
              </div>
            )}
            {screen === "verify" && (
              <div className="mg2-auth-step">
                <h1>Verify email</h1>
                <p>We sent a code to {cleanEmail}.</p>
                <input value={otp} disabled={busy} inputMode="text" autoCapitalize="none" placeholder="Enter code" onChange={(event) => setOtp(event.target.value.replace(/\s/g, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8))} />
                <button type="button" disabled={busy || !otpValid} onClick={verifyOtp}>{busy ? "Verifying..." : "Verify code"}</button>
                <button type="button" disabled={busy || !emailValid} onClick={sendOtp}>Resend code</button>
              </div>
            )}
            {screen === "profile" && (
              <div className="mg2-auth-step">
                <h1>Create profile</h1>
                <p>Pick the public identity people will see. Your email stays private.</p>
                <input value={profileDraft.display_name || ""} disabled={busy} placeholder="Display name" onChange={(event) => setProfileDraft((current) => ({ ...current, display_name: event.target.value }))} />
                <input value={profileDraft.username || ""} disabled={busy} placeholder="username" onChange={(event) => setProfileDraft((current) => ({ ...current, username: sanitizeUsername(event.target.value) }))} />
                <textarea value={profileDraft.bio || ""} disabled={busy} placeholder="Bio (optional)" maxLength={180} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} />
                <button type="button" disabled={busy} onClick={saveProfileStep}>{busy ? "Saving..." : "Continue"}</button>
              </div>
            )}
            {screen === "password" && (
              <div className="mg2-auth-step">
                <h1>Create password</h1>
                <p>Use at least 8 characters. You will use this to log in next time.</p>
                <input value={password} disabled={busy} type="password" placeholder="Password" onChange={(event) => setPassword(event.target.value)} />
                <input value={confirmPassword} disabled={busy} type="password" placeholder="Confirm password" onChange={(event) => setConfirmPassword(event.target.value)} />
                <button type="button" disabled={busy || password.length < 8 || password !== confirmPassword} onClick={savePasswordStep}>{busy ? "Finishing..." : "Enter MovieGram"}</button>
              </div>
            )}
            {screen === "login" && (
              <div className="mg2-auth-step">
                <h1>Log in</h1>
                <p>Use your verified email and password.</p>
                <button className="mg2-google-auth" type="button" disabled={busy} onClick={continueWithGoogle}>Continue with Google</button>
                <input value={email} disabled={busy} type="email" placeholder="Email" onChange={(event) => setEmail(event.target.value)} />
                <input value={password} disabled={busy} type="password" placeholder="Password" onChange={(event) => setPassword(event.target.value)} />
                <button type="button" disabled={busy || !emailValid || !password} onClick={login}>{busy ? "Logging in..." : "Log in"}</button>
                <button type="button" disabled={busy} onClick={() => go("forgot")}>Forgot password?</button>
              </div>
            )}
            {screen === "forgot" && (
              <div className="mg2-auth-step">
                <h1>Reset password</h1>
                <p>Enter your email. We will send reset instructions if an account exists.</p>
                <input value={email} disabled={busy} type="email" placeholder="Email" onChange={(event) => setEmail(event.target.value)} />
                <button type="button" disabled={busy || !emailValid} onClick={sendReset}>{busy ? "Sending..." : "Send reset email"}</button>
              </div>
            )}
          </>
        )}
        {(message || error) && <div className={`mg2-auth-banner ${error ? "error" : ""}`}>{error || message}</div>}
      </section>
    </main>
  );
}

function ReviewSheet({ item, initialReview = "", initialRating = "", initialSpoiler = false, initialVisibility = "public", onSave, onDelete, onClose }) {
  const [text, setText] = useState(initialReview || "");
  const [rating, setRating] = useState(initialRating ? String(Math.round((normalizeUserRating(initialRating) || 0) * 2)) : "");
  const [spoiler, setSpoiler] = useState(Boolean(initialSpoiler));
  const [visibility, setVisibility] = useState(initialVisibility || "public");
  useEffect(() => {
    setText(initialReview || "");
    setRating(initialRating ? String(Math.round((normalizeUserRating(initialRating) || 0) * 2)) : "");
    setSpoiler(Boolean(initialSpoiler));
    setVisibility(initialVisibility || "public");
  }, [item ? keyOf(item) : "", initialReview, initialRating, initialSpoiler, initialVisibility]);
  if (!item) return null;
  const numericRating = Math.min(10, Math.max(0, Number(rating || 0)));
  return (
    <div className="mg2-sheet-backdrop" onMouseDown={onClose}>
      <section className="mg2-watch-sheet mg2-review-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span />
        <h3>{initialReview ? "Edit Review" : "Write Review"}</h3>
        <p>{titleOf(item)}</p>
        <label>
          <small>Rating 0-10</small>
          <input type="number" min="0" max="10" step="1" value={rating} onChange={(event) => setRating(event.target.value)} placeholder="8" />
        </label>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="What did you think?" />
        <label>
          <small>Visibility</small>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
        </label>
        <label className="mg2-review-spoiler">
          <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
          <small>Contains spoilers</small>
        </label>
        <div className="mg2-sheet-actions">
          <button type="button" onClick={() => onSave(item, text, { rating: numericRating, containsSpoiler: spoiler, visibility })}>Save Review</button>
          {initialReview && <button type="button" onClick={() => onDelete(item)}>Delete Review</button>}
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function CustomListSheet({ item, lists = {}, onCreate, onToggleItem, onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  if (!item) return null;
  const listEntries = Object.values(lists);
  return (
    <div className="mg2-sheet-backdrop" onMouseDown={onClose}>
      <section className="mg2-watch-sheet mg2-list-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span />
        <h3>Add to List</h3>
        <p>{titleOf(item)}</p>
        <div className="mg2-list-create">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New list name" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
          <button type="button" onClick={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            onCreate(trimmed, item, { description: description.trim(), visibility });
            setName("");
            setDescription("");
          }}>Create</button>
        </div>
        <div className="mg2-custom-list-options">
          {listEntries.map((list) => {
            const contains = (list.items || []).some((entry) => itemMatches(entry, item));
            return <button key={list.id} type="button" onClick={() => onToggleItem(list.id, item)}>{contains ? "✓" : "+"} {list.title}<small>{(list.items || []).length} titles</small></button>;
          })}
          {listEntries.length === 0 && <em>No custom lists yet. Create one above.</em>}
        </div>
        <button type="button" onClick={onClose}>Done</button>
      </section>
    </div>
  );
}

function PreferencesSheet({ open, onSave, onSkip }) {
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [privacy, setPrivacy] = useState("public");
  if (!open) return null;
  const genres = ["Action", "Comedy", "Drama", "Sci-Fi", "Thriller", "Animation", "Crime", "Fantasy"];
  const toggleGenre = (genre) => {
    setSelectedGenres((current) => current.includes(genre) ? current.filter((entry) => entry !== genre) : [...current, genre].slice(0, 5));
  };
  return (
    <div className="mg2-sheet-backdrop" onMouseDown={onSkip}>
      <section className="mg2-watch-sheet mg2-preferences-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span />
        <h3>Personalize MovieGram</h3>
        <p>Pick a few lanes so Home and Reels can start with better signals. You can skip this and keep guest mode.</p>
        <div className="mg2-preference-chips">
          {genres.map((genre) => (
            <button key={genre} className={selectedGenres.includes(genre) ? "active" : ""} type="button" onClick={() => toggleGenre(genre)}>{genre}</button>
          ))}
        </div>
        <label>
          <small>Profile default</small>
          <select value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <div className="mg2-sheet-actions">
          <button type="button" onClick={() => onSave({ genres: selectedGenres, privacy, savedAt: new Date().toISOString() })}>Save Preferences</button>
          <button type="button" onClick={onSkip}>Skip</button>
        </div>
      </section>
    </div>
  );
}

function PersonProfileModal({ person, apiFetch, watched = {}, watchlist = {}, ratings = {}, reviews = {}, onClose, onOpen }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filmFilter, setFilmFilter] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("all");
  useEffect(() => {
    async function loadPerson() {
      if (!person?.id || !apiFetch) return;
      setLoading(true);
      try {
        const data = await apiFetch(`/person/${person.id}`, { append_to_response: "combined_credits" });
        setDetails(data);
      } catch {
        setDetails(null);
      } finally {
        setLoading(false);
      }
    }
    loadPerson();
  }, [apiFetch, person?.id]);
  if (!person) return null;
  const shown = details || person;
  const credits = dedupe(normalize((shown.combined_credits?.cast || []).filter((item) => ["movie", "tv"].includes(item.media_type || mediaType(item)))))
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const filterCredits = (items, filter) => items.filter((credit) => filter === "all" || mediaType(credit) === filter);
  const filteredCredits = filterCredits(credits, filmFilter);
  const history = filterCredits(credits.filter((credit) => (
    hasStoredItem(credit, watched) ||
    hasStoredItem(credit, watchlist) ||
    Boolean(ratingForItem(credit, ratings)) ||
    Boolean(reviews[keyOf(credit)]?.text)
  )), historyFilter);
  const bio = shown.biography || "Biography unavailable.";
  const longBio = bio.length > 260;
  const birthday = shown.birthday ? new Date(shown.birthday) : null;
  const age = birthday ? Math.max(0, Math.floor((Date.now() - birthday.getTime()) / 31557600000)) : null;
  const bornLabel = birthday ? birthday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  const heroPortrait = shown.profile_path ? posterUrl(shown.profile_path, "w780") : "";
  const filterTabs = [
    { id: "all", label: "All" },
    { id: "movie", label: "Movies" },
    { id: "tv", label: "TV" }
  ];
  return (
    <div className="mg2-modal-backdrop" onMouseDown={onClose}>
      <section className="mg2-modal mg2-person-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="mg2-back" type="button" onClick={onClose}><Icon name="back" /> Back</button>
        {loading ? <div className="mg2-detail-skeleton"><div /><span /><span /><i /></div> : (
          <>
            <div className="mg2-person-hero">
              {heroPortrait && <img className="mg2-person-hero-bg" src={heroPortrait} alt="" aria-hidden="true" />}
              <img className="mg2-person-portrait" src={posterUrl(shown.profile_path, "w342")} alt={shown.name} onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
              <div>
                <span>{shown.known_for_department || "Acting"}</span>
                <h2>{shown.name}</h2>
                {bornLabel && <p>Born {bornLabel}</p>}
                {age !== null && <p>Age {age}</p>}
                {shown.place_of_birth && <p>{shown.place_of_birth}</p>}
              </div>
            </div>
            <section className="mg2-detail-panel">
              <h3>Biography</h3>
              <p className="mg2-overview">{longBio && !expanded ? `${bio.slice(0, 260).trim()}...` : bio}</p>
              {longBio && <button className="mg2-read-more" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "Show less" : "Read more"}</button>}
            </section>
            <section className="mg2-person-columns">
              <div className="mg2-person-column">
                <div className="mg2-detail-panel-head"><h3>From Your History</h3><span>{history.length}</span></div>
                <div className="mg2-person-filters">{filterTabs.map((tab) => <button key={tab.id} className={historyFilter === tab.id ? "active" : ""} type="button" onClick={() => setHistoryFilter(tab.id)}>{tab.label}</button>)}</div>
                {history.length ? (
                  <div className="mg2-person-film-grid history">
                    {history.slice(0, 16).map((credit) => <PosterCard key={keyOf(credit)} item={credit} onOpen={onOpen} saved={hasStoredItem(credit, watchlist)} watched={hasStoredItem(credit, watched)} rating={ratingForItem(credit, ratings)} compact />)}
                  </div>
                ) : <div className="mg2-empty">No local history with this actor yet.</div>}
              </div>
              <div className="mg2-person-column">
                <div className="mg2-detail-panel-head"><h3>Filmography</h3><span>{filteredCredits.length}</span></div>
                <div className="mg2-person-filters">{filterTabs.map((tab) => <button key={tab.id} className={filmFilter === tab.id ? "active" : ""} type="button" onClick={() => setFilmFilter(tab.id)}>{tab.label}</button>)}</div>
                <div className="mg2-person-film-grid">
                  {filteredCredits.slice(0, 40).map((credit) => <PosterCard key={keyOf(credit)} item={credit} onOpen={onOpen} saved={hasStoredItem(credit, watchlist)} watched={hasStoredItem(credit, watched)} rating={ratingForItem(credit, ratings)} compact />)}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </div>
  );
}

function PublicProfileScreen({ profile, bundle, currentUser, followStatuses = {}, followBusyIds = {}, onBack, onFollowToggle, onOpenItem }) {
  const [profileTab, setProfileTab] = useState("activity");
  const [selectedList, setSelectedList] = useState(null);
  if (!profile) return null;
  const shownProfile = bundle?.profile || profile;
  const stats = bundle?.stats || { followers: shownProfile.follower_count || 0, following: shownProfile.following_count || 0, watched: 0 };
  const activity = bundle?.activity || [];
  const tracking = bundle?.tracking || { watchlist: {}, watched: {}, ratings: {}, reviews: {}, customLists: {} };
  const relation = currentUser?.id === shownProfile.id ? "owner" : bundle?.relationStatus || followStatuses[shownProfile.id] || "";
  const canViewActivity = bundle?.canViewActivity ?? (!shownProfile.is_private || relation === "owner" || relation === "accepted");
  const buttonLabel = followBusyIds[shownProfile.id] ? "Working" : relation === "accepted" ? "Following" : relation === "pending" ? "Requested" : shownProfile.is_private ? "Follow" : "Follow";
  const watchedItems = Object.values(tracking.watched || {});
  const watchlistItems = Object.values(tracking.watchlist || {});
  const ratings = tracking.ratings || {};
  const reviews = tracking.reviews || {};
  const favorites = tracking.favorites || {};
  const allTrackedItems = dedupe([...watchedItems, ...watchlistItems, ...Object.values(favorites), ...Object.values(reviews).map((entry) => entry.item).filter(Boolean)]);
  const itemForKey = (key) => allTrackedItems.find((item) => keyOf(item) === key) || reviews[key]?.item || null;
  const reviewEntries = Object.entries({ ...ratings, ...reviews }).map(([key]) => {
    const item = itemForKey(key);
    if (!item) return null;
    const review = reviews[key];
    return {
      key,
      item,
      text: review?.text || "",
      rating: normalizeUserRating(ratings[key]) || null,
      date: review?.reviewedAt || item.watchedAt || item.likedAt || ""
    };
  }).filter(Boolean);
  const lists = [
    { id: "watchlist", title: "Watchlist", items: watchlistItems, isDefault: true },
    ...Object.values(tracking.customLists || {})
  ];
  const tabs = [
    { id: "activity", label: "Activity" },
    { id: "watched", label: "Watched" },
    { id: "watchlist", label: "Watchlist" },
    { id: "reviews", label: "Reviews" },
    { id: "lists", label: "Lists" }
  ];
  const profileItems = profileTab === "watched" ? watchedItems : profileTab === "watchlist" ? watchlistItems : [];
  const actionStatusFor = (action) => {
    if (action === "watched" || action === "episode_watched" || action === "season_completed" || action === "show_completed") return "watched";
    if (action === "watchlist_add") return "watchlisted";
    if (action === "rated" || action === "rating") return "rated";
    if (action === "liked") return "liked";
    if (action === "reviewed" || action === "review") return "reviewed";
    return action;
  };
  const activityMap = new Map();
  activity.forEach((event) => {
    if (!event.item?.id) return;
    const key = keyOf(event.item);
    const existing = activityMap.get(key) || { item: event.item, statuses: [], timestamp: event.created_at, rating: null, title: event.title };
    const status = actionStatusFor(event.action);
    if (!existing.statuses.includes(status)) existing.statuses.push(status);
    if (event.metadata?.rating) existing.rating = normalizeUserRating(event.metadata.rating);
    if (new Date(event.created_at || 0) > new Date(existing.timestamp || 0)) existing.timestamp = event.created_at;
    activityMap.set(key, existing);
  });
  watchedItems.forEach((item) => {
    const key = keyOf(item);
    if (!activityMap.has(key)) activityMap.set(key, { item, statuses: ["watched"], timestamp: item.watchedAt, rating: ratingForItem(item, ratings), title: titleOf(item) });
  });
  watchlistItems.forEach((item) => {
    const key = keyOf(item);
    const existing = activityMap.get(key) || { item, statuses: [], timestamp: item.savedAt || item.addedAt, rating: ratingForItem(item, ratings), title: titleOf(item) };
    if (!existing.statuses.includes("watchlisted")) existing.statuses.push("watchlisted");
    activityMap.set(key, existing);
  });
  Object.entries(favorites).forEach(([key, item]) => {
    const existing = activityMap.get(key) || { item, statuses: [], timestamp: item.likedAt, rating: ratingForItem(item, ratings), title: titleOf(item) };
    if (!existing.statuses.includes("liked")) existing.statuses.push("liked");
    activityMap.set(key, existing);
  });
  Object.entries(ratings).forEach(([key, rating]) => {
    const item = itemForKey(key);
    if (!item) return;
    const existing = activityMap.get(key) || { item, statuses: [], timestamp: item.watchedAt || item.likedAt, rating: null, title: titleOf(item) };
    if (!existing.statuses.includes("rated")) existing.statuses.push("rated");
    existing.rating = normalizeUserRating(rating);
    activityMap.set(key, existing);
  });
  Object.entries(reviews).forEach(([key, review]) => {
    const item = review.item || itemForKey(key);
    if (!item) return;
    const existing = activityMap.get(key) || { item, statuses: [], timestamp: review.reviewedAt, rating: ratingForItem(item, ratings), title: titleOf(item) };
    if (review.text?.trim() && !existing.statuses.includes("reviewed")) existing.statuses.push("reviewed");
    activityMap.set(key, existing);
  });
  const activityGridItems = Array.from(activityMap.values()).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  const activityDateLabel = (timestamp) => timestamp ? new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  const badgeIcon = (status, rating) => {
    if (status === "watched") return <Icon name="check" />;
    if (status === "watchlisted") return <Icon name="bookmark" />;
    if (status === "liked") return <Icon name="heart" />;
    if (status === "reviewed") return <Icon name="feed" />;
    if (status === "rated") return rating ? formatUserRating(rating) : "\u2605";
    return status.slice(0, 1).toUpperCase();
  };

  const renderEmpty = (label) => <div className="mg2-empty">{label}</div>;

  return (
    <section className="mg2-public-profile-screen">
      <div className="mg2-social-header">
        <button className="mg2-social-back" type="button" onClick={onBack}><Icon name="back" /></button>
        <h2>@{shownProfile.username}</h2>
      </div>
      <div className="mg2-public-profile-head">
        <PublicAvatar profile={shownProfile} />
        <div>
          <h3>{publicProfileName(shownProfile)}{shownProfile.is_private && <span>Private</span>}</h3>
          <p>@{shownProfile.username}</p>
          {shownProfile.bio && <small>{shownProfile.bio}</small>}
        </div>
      </div>
      <div className="mg2-public-profile-stats">
        <strong>{stats.watched || 0}<small>Watched</small></strong>
        <strong>{stats.followers || 0}<small>Followers</small></strong>
        <strong>{stats.following || 0}<small>Following</small></strong>
      </div>
      {relation !== "owner" && currentUser && (
        <button className={`mg2-public-follow ${relation || "follow"}`} type="button" disabled={Boolean(followBusyIds[shownProfile.id])} onClick={() => onFollowToggle(shownProfile)}>
          {buttonLabel}
        </button>
      )}
      {!currentUser && relation !== "owner" && <div className="mg2-empty">Sign in to follow MovieGram profiles.</div>}
      {!canViewActivity ? (
        <div className="mg2-private-profile-state">
          <Icon name="bookmark" />
          <strong>This account is private</strong>
          <small>Follow @{shownProfile.username} to see activity, lists, ratings, and reviews.</small>
        </div>
      ) : (
        <>
          <div className="mg2-profile-tabs public" aria-label="Public profile sections">
            {tabs.map((tab) => (
              <button key={tab.id} className={profileTab === tab.id ? "active" : ""} type="button" onClick={() => { setSelectedList(null); setProfileTab(tab.id); }}>{tab.label}</button>
            ))}
          </div>
          {profileTab === "activity" && (
            activityGridItems.length ? (
              <div className="mg2-profile-activity-grid public">
                {activityGridItems.map((event, index) => (
                  <button key={`${keyOf(event.item)}-${index}`} type="button" onClick={() => onOpenItem(event.item)}>
                    <img src={posterUrl(event.item.poster_path, "w185")} alt={titleOf(event.item)} loading="lazy" onError={(eventImage) => { eventImage.currentTarget.src = POSTER_FALLBACK; }} />
                    <span className="mg2-activity-badges">
                      {event.statuses.map((status) => (
                        <i key={status} className={`mg2-activity-badge ${status}`}>
                          {badgeIcon(status, event.rating)}
                        </i>
                      ))}
                    </span>
                    {activityDateLabel(event.timestamp) && <em>{activityDateLabel(event.timestamp)}</em>}
                    <strong>{titleOf(event.item)}</strong>
                  </button>
                ))}
              </div>
            ) : renderEmpty("No public activity yet.")
          )}
          {(profileTab === "watched" || profileTab === "watchlist") && (
            profileItems.length ? (
              <div className="mg2-profile-poster-grid">
                {profileItems.map((item) => <PosterCard key={keyOf(item)} item={item} onOpen={onOpenItem} saved={hasStoredItem(item, tracking.watchlist)} watched={hasStoredItem(item, tracking.watched)} rating={ratingForItem(item, ratings)} compact />)}
              </div>
            ) : renderEmpty(profileTab === "watched" ? "No watched titles visible yet." : "No watchlist titles visible yet.")
          )}
          {profileTab === "reviews" && (
            reviewEntries.length ? (
              <div className="mg2-profile-review-cards">
                {reviewEntries.map((entry) => {
                  const item = entry.item || {};
                  return (
                    <button key={entry.key || keyOf(item)} type="button" onClick={() => onOpenItem(item)}>
                      <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(eventImage) => { eventImage.currentTarget.src = POSTER_FALLBACK; }} />
                      <span>
                        <strong>{titleOf(item)}</strong>
                        <small>{entry.text || "Rating only"}</small>
                      </span>
                      {entry.rating && <em>{formatUserRating(entry.rating)}</em>}
                    </button>
                  );
                })}
              </div>
            ) : renderEmpty("No public reviews yet.")
          )}
          {profileTab === "lists" && (
            selectedList ? (
              <div className="mg2-profile-list-detail public">
                <button type="button" onClick={() => setSelectedList(null)}><Icon name="back" /> Lists</button>
                <h3>{selectedList.title}</h3>
                <small>{(selectedList.items || []).length} titles</small>
                {(selectedList.items || []).length ? (
                  <div className="mg2-profile-poster-grid">
                    {(selectedList.items || []).map((item) => <PosterCard key={keyOf(item)} item={item} onOpen={onOpenItem} saved={hasStoredItem(item, tracking.watchlist)} watched={hasStoredItem(item, tracking.watched)} rating={ratingForItem(item, ratings)} compact />)}
                  </div>
                ) : renderEmpty("This list is empty.")}
              </div>
            ) : lists.length ? (
              <div className="mg2-public-list-stack">
                {lists.map((list) => (
                  <button className="mg2-public-list-card" key={list.id || list.title} type="button" onClick={() => setSelectedList(list)}>
                    <div>
                      <strong>{list.title}</strong>
                      <small>{list.isDefault ? "Default list" : "Custom list"} - {(list.items || []).length} titles</small>
                    </div>
                    <span>
                      {(list.items || []).slice(0, 8).map((item) => (
                        <img key={keyOf(item)} src={posterUrl(item.poster_path, "w185")} alt="" loading="lazy" onError={(eventImage) => { eventImage.currentTarget.src = POSTER_FALLBACK; }} />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            ) : renderEmpty("No public lists yet.")
          )}
        </>
      )}
    </section>
  );
}

function RecommendationCard({ item, badge, onOpen, onWatchlist, onNotInterested, saved, hidden }) {
  if (hidden) return null;
  const type = mediaType(item) === "tv" ? "TV" : "Movie";
  const genre = type === "TV" ? "Series" : (titleOf(item).toLowerCase().includes("dune") ? "Sci-Fi" : "Drama");

  return (
    <article className="mg2-rec-card">
      <button className="mg2-rec-art" type="button" onClick={() => onOpen(item)} aria-label={`Open ${titleOf(item)}`}>
        <img src={posterUrl(item.poster_path, "w342")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
        {badge && <span>{badge}</span>}
      </button>
      <div className="mg2-rec-copy">
        <span className="mg2-rec-title">{titleOf(item)}</span>
        <small>{type} - {item.vote_average ? item.vote_average.toFixed(1) : "NR"} - {genre}</small>
      </div>
      <div className="mg2-rec-actions">
        <button className={saved ? "active" : ""} type="button" onClick={() => onWatchlist(item)} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><Icon name={saved ? "check" : "bookmark"} /></button>
        <button className="subtle" type="button" onClick={() => onNotInterested(item)} aria-label="Not interested">Hide</button>
      </div>
    </article>
  );
}

function RecommendationIntelligence({ rows, intelligenceRows, watchlist, hiddenRecs, onOpen, onWatchlist, onNotInterested }) {
  const labels = {
    breakingBad: { title: "Because you watched Breaking Bad", badge: "For You" },
    interstellar: { title: "Because you rated Interstellar highly", badge: "For You" },
    sciFi: { title: "Because you like Sci-Fi thrillers", badge: "Mood Pick" },
    friend: { title: "Popular with your friends", badge: "Friend Pick" },
    blend: { title: "High Blend match with Rohan", badge: "Blend Pick" },
    hidden: { title: "Hidden gems for your taste", badge: "Hidden Gem" }
  };
  const hasAny = Object.values(intelligenceRows).some((items) => items.length > 0);

  return (
    <section className="mg2-intelligence">
      <div className="mg2-section-head"><h2>Recommendation Intelligence</h2><span>Smart picks</span></div>
      {!hasAny && <div className="mg2-empty">Rate, save, or open a few titles to sharpen recommendations.</div>}
      {Object.entries(labels).filter(([id]) => (intelligenceRows[id] || []).length > 0).map(([id, meta]) => (
        <div key={id} className="mg2-intel-row">
          <h3>{meta.title}</h3>
          <div>
            {(intelligenceRows[id] || []).slice(0, 8).map((item) => (
              <RecommendationCard
                key={`${id}-${keyOf(item)}`}
                item={item}
                badge={meta.badge}
                onOpen={onOpen}
                onWatchlist={onWatchlist}
                onNotInterested={onNotInterested}
                saved={Boolean(watchlist[keyOf(item)])}
                hidden={Boolean(hiddenRecs[keyOf(item)])}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function GenreRow({ genres }) {
  return (
    <section className="mg2-section mg2-explore-section">
      <div className="mg2-section-head"><h2>Genres</h2><span>Browse</span></div>
      <div className="mg2-genre-row">
        {genres.map((genre) => (
          <button key={genre.id} className={`mg2-genre-card ${genre.tone}`} type="button">
            <strong>{genre.name}</strong>
            <span>Explore</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CollectionRow({ collections, onOpen }) {
  return (
    <section className="mg2-section mg2-explore-section">
      <div className="mg2-section-head"><h2>Collections</h2><span>Curated</span></div>
      <div className="mg2-collection-row">
        {collections.map((collection) => (
          <article className="mg2-collection-card" key={collection.id}>
            <div>
              {collection.items.map((item) => (
                <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
                  <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                </button>
              ))}
            </div>
            <strong>{collection.title}</strong>
            <span>{collection.subtitle}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActorRow({ actors, loading, onOpenPerson }) {
  return (
    <section className="mg2-section mg2-explore-section">
      <div className="mg2-section-head"><h2>Popular Actors & Directors</h2><span>Actors & Directors</span></div>
      {loading ? <SkeletonRow /> : (
        <div className="mg2-actor-row">
          {actors.map((actor) => (
            <button className="mg2-actor-card" key={actor.id} type="button" onClick={() => onOpenPerson(actor)}>
              <img src={posterUrl(actor.profile_path, "w185")} alt={actor.name} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
              <strong>{actor.name}</strong>
              <span>{actor.known_for_department || "Acting"}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function CastActorCard({ person, type, character, onOpenPerson }) {
  const startX = useRef(0);
  const moved = useRef(false);
  return (
    <button
      className="mg2-cast-card"
      type="button"
      onPointerDown={(event) => { startX.current = event.clientX; moved.current = false; }}
      onPointerMove={(event) => { if (Math.abs(event.clientX - startX.current) > 10) moved.current = true; }}
      onClick={(event) => {
        if (moved.current) {
          event.preventDefault();
          return;
        }
        onOpenPerson(person);
      }}
    >
      <i>
        <img src={posterUrl(person.profile_path, "w185")} alt={person.name} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
        {type === "tv" && person.total_episode_count ? <em>{person.total_episode_count} eps.</em> : null}
      </i>
      <strong>{person.name}</strong>
      <span>{character}</span>
    </button>
  );
}

function ContinueWatchingRow({ items, onOpen }) {
  const rowItems = items.filter((item) => mediaType(item) === "tv").slice(0, 8);

  return (
    <section className="mg2-section">
      <div className="mg2-section-head"><h2>Continue Watching</h2><span>See All</span></div>
      {rowItems.length ? (
        <div className="mg2-continue-row">
          {rowItems.map((item, index) => (
            <button key={`${keyOf(item)}-${index}`} type="button" onClick={() => onOpen(item)}>
              <img src={backdropUrl(item.backdrop_path || item.poster_path, "w780")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }} />
              <span><Icon name="play" /></span>
              <strong>Continue {titleOf(item)}</strong>
              <small>Open Details for your next episode</small>
              <i style={{ width: `${72 - index * 10}%` }} />
            </button>
          ))}
        </div>
      ) : <div className="mg2-empty">Start tracking TV episodes to build Continue Watching.</div>}
    </section>
  );
}

function ActivityCard({ item, onOpen, onOpenProfile }) {
  if (item.profile) {
    return (
      <article className="mg2-activity-card">
        <button className="mg2-public-avatar-button" type="button" onClick={() => onOpenProfile?.(item.profile)}>
          <PublicAvatar profile={item.profile} size="sm" />
        </button>
        <div>
          <p><strong>{publicProfileName(item.profile)}</strong> {item.actionLabel}</p>
          <button type="button" onClick={() => onOpen?.(item.item)}><h3>{item.title}</h3></button>
          {item.metadata?.rating && <small>Rated {formatUserRating(item.metadata.rating)}</small>}
          <time>{item.time}</time>
        </div>
        {item.item?.poster_path && <img src={posterUrl(item.item.poster_path, "w342")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />}
        <Icon name="dots" />
      </article>
    );
  }
  const hasStars = item.rating || item.action === "rated" || item.action === "reviewed";

  return (
    <article className="mg2-activity-card">
      <Avatar friend={item.friend} size="sm" />
      <div>
        <p><strong>{item.friend.name}</strong> {item.action}</p>
        <h3>{item.title} {hasStars && <span>*****</span>} {item.rating && <em>{item.rating}</em>}</h3>
        {item.body && item.action === "reviewed" && <small>{item.body}</small>}
        <time>{item.time}</time>
      </div>
      <img src={posterUrl(item.poster, "w342")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
      <Icon name="dots" />
    </article>
  );
}

function SocialFeedCard({ item, liked, onLike }) {
  if (item.profile) {
    return (
      <article className="mg2-social-card">
        <div className="mg2-social-head">
          <PublicAvatar profile={item.profile} size="sm" />
          <div>
            <strong>{publicProfileName(item.profile)}</strong>
            <span>{item.actionLabel} {item.title}</span>
          </div>
          <time>{item.time}</time>
        </div>
        <div className="mg2-social-poster">
          <img src={posterUrl(item.item?.poster_path, "w780")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
          {item.metadata?.rating && <em>{formatUserRating(item.metadata.rating)}</em>}
        </div>
        <p><strong>{publicProfileName(item.profile)}</strong> {item.actionLabel} {item.title}</p>
      </article>
    );
  }
  return (
    <article className="mg2-social-card">
      <div className="mg2-social-head">
        <Avatar friend={item.friend} size="sm" />
        <div>
          <strong>{item.friend.name}</strong>
          <span>{item.activity} {item.title}</span>
        </div>
        <time>{item.time}</time>
      </div>
      <div className="mg2-social-poster">
        <img src={posterUrl(item.poster, "w780")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
        {item.rating && <em>{item.rating}/5</em>}
      </div>
      <div className="mg2-social-actions">
        <button className={liked ? "active" : ""} type="button" onClick={() => onLike(item.id)} aria-label={`Like ${item.title}`}>
          <Icon name="heart" />
          <span>{liked ? item.likes + 1 : item.likes}</span>
        </button>
        <button type="button" aria-label={`Comment on ${item.title}`}>
          <Icon name="chat" />
          <span>{item.comments}</span>
        </button>
        <button type="button" aria-label={`Share ${item.title}`}>
          <Icon name="send" />
          <span>Share</span>
        </button>
      </div>
      <p><strong>{item.friend.name}</strong> {item.caption}</p>
    </article>
  );
}

function SocialHomeFeed({ likedFeed, toggleFeedLike, socialActivity = [], useMockFallback = true }) {
  const items = socialActivity.length ? socialActivity.slice(0, 6) : (useMockFallback ? socialFeedSeeds : []);
  return (
    <section className="mg2-social-feed" aria-label="Social activity feed">
      {items.length ? items.map((item) => (
        <SocialFeedCard key={item.id} item={item} liked={likedFeed[item.id]} onLike={toggleFeedLike} />
      )) : <div className="mg2-empty">Follow people to see real MovieGram activity here.</div>}
    </section>
  );
}

function SearchPanel({ query, setQuery, loading, results, userResults = [], userLoading = false, page, totalPages, loadNext, loadPrevious, onOpen, onOpenPerson, onOpenPublicProfile, watchlist, watched = {}, ratings, favorites = {}, sentinelRef, onQuickActions }) {
  const [searchFilter, setSearchFilter] = useState("all");
  const visibleResults = results.filter((item) => (
    searchFilter === "all" ||
    (searchFilter === "movie" && item.media_type === "movie") ||
    (searchFilter === "tv" && item.media_type === "tv") ||
    (searchFilter === "person" && item.media_type === "person")
  ));
  const visibleUserResults = (searchFilter === "all" || searchFilter === "user") ? userResults : [];
  const displayedUserResults = searchFilter === "all" ? visibleUserResults.slice(0, 3) : visibleUserResults;
  const hasVisibleResults = visibleResults.length > 0 || displayedUserResults.length > 0;
  return (
    <section className="mg2-search-panel">
      <div className="mg2-search">
        <Icon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} onInput={(event) => setQuery(event.target.value)} placeholder="Search movies, shows, people..." />
        {(loading || userLoading) && <Spinner />}
      </div>
      {query.trim() && (
        <>
          <div className="mg2-search-filters" aria-label="Search result filters">
            {[
              { id: "all", label: "All" },
              { id: "movie", label: "Movies" },
              { id: "tv", label: "TV Shows" },
              { id: "person", label: "Actors & Directors" },
              { id: "user", label: "Users" }
            ].map((filter) => (
              <button key={filter.id} className={searchFilter === filter.id ? "active" : ""} type="button" onClick={() => setSearchFilter(filter.id)}>{filter.label}</button>
            ))}
          </div>
          {displayedUserResults.length > 0 && (
            <>
              <div className="mg2-section-head"><h2>Users</h2><span>{searchFilter === "all" ? "Top matches" : displayedUserResults.length}</span></div>
              <div className="mg2-grid">
                {displayedUserResults.map((profile) => (
                  <UserResultCard key={`user:${profile.id}`} profile={profile} onOpenPublicProfile={onOpenPublicProfile} />
                ))}
              </div>
            </>
          )}
          {searchFilter !== "user" && (
            <>
              <div className="mg2-section-head"><h2>{searchFilter === "person" ? "Actors & Directors" : "Search Results"}</h2><span>Page {page} / {totalPages}</span></div>
              <div className="mg2-grid">
                {visibleResults.map((item) => {
                  if (item.media_type === "person") return <PersonCard key={`person:${item.id}`} person={item} onOpenPerson={onOpenPerson} />;
                  const userRating = ratingForItem(item, ratings);
                  return <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} onQuickActions={onQuickActions} saved={hasStoredItem(item, watchlist)} watched={hasStoredItem(item, watched)} rating={userRating} favorite={hasStoredItem(item, favorites)} compact />;
                })}
              </div>
              <div ref={sentinelRef} className="mg2-sentinel" />
              <div className="mg2-page-controls">
                <button type="button" disabled={page <= 1 || loading} onClick={loadPrevious}>Previous</button>
                <button type="button" disabled={page >= totalPages || loading} onClick={loadNext}>Next</button>
              </div>
            </>
          )}
          {!loading && !userLoading && !hasVisibleResults && <div className="mg2-empty">No matches yet. Try another title, username, or filter.</div>}
        </>
      )}
    </section>
  );
}

function HomeScreen({ rows, loading, user, onOpen, onOpenPublicProfile, watchlist, watched = {}, ratings, favorites = {}, continueWatching, recommended, intelligenceRows, hiddenRecs, feedItems, socialActivity = [], profileActivity = {}, toggleFeedLike, toggleFeedSave, likedFeed, savedFeed, onWatchlist, onNotInterested }) {
  const recentlyOpened = useMemo(() => Object.values(profileActivity || {})
    .filter((event) => event?.item && event.type === "opened")
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .map((event) => event.item)
    .filter((item) => item?.poster_path)
    .slice(0, 18), [profileActivity]);
  return (
    <>
      <div className="mg2-stories">
        {friends.map((friend, index) => (
          <div className="mg2-story" key={friend.id}>
            <Avatar friend={friend} />
            <span>{index === 0 ? "Your story" : friend.name}</span>
          </div>
        ))}
      </div>

      <SocialHomeFeed likedFeed={likedFeed} toggleFeedLike={toggleFeedLike} socialActivity={socialActivity} useMockFallback={!user} />

      <section className="mg2-section mg2-activity-section">
        <div className="mg2-section-head"><h2>Friend Activity</h2><span>See All</span></div>
        {feedItems.length ? feedItems.slice(0, 5).map((item) => <ActivityCard key={item.id} item={item} onOpen={onOpen} onOpenProfile={onOpenPublicProfile} />) : <div className="mg2-empty">No followed-user activity yet.</div>}
      </section>

      <ContinueWatchingRow items={continueWatching} onOpen={onOpen} />
      <ContentRow title="Recently Opened" items={recentlyOpened} loading={false} onOpen={onOpen} watchlist={watchlist} watched={watched} ratings={ratings} favorites={favorites} />
      <ContentRow title="Recommended for You" items={recommended} loading={loading && recommended.length === 0} onOpen={onOpen} watchlist={watchlist} watched={watched} ratings={ratings} favorites={favorites} />
      <RecommendationIntelligence rows={rows} intelligenceRows={intelligenceRows} watchlist={watchlist} hiddenRecs={hiddenRecs} onOpen={onOpen} onWatchlist={onWatchlist} onNotInterested={onNotInterested} />
      <ContentRow title="Trending This Week" items={rows.trending || []} loading={loading} onOpen={onOpen} watchlist={watchlist} watched={watched} ratings={ratings} favorites={favorites} />

      {contentSections.filter((section) => section.id !== "trending").map((section) => (
        <ContentRow key={section.id} title={section.title} items={rows[section.id] || []} loading={loading} onOpen={onOpen} watchlist={watchlist} watched={watched} ratings={ratings} favorites={favorites} />
      ))}
    </>
  );
}

function ExploreScreen({ activeExplore, setActiveExplore, queryProps, tabResults, tabLoading, hasMoreExplore, onLoadMoreExplore, exploreRows, exploreLoading, actors, actorsLoading, onOpen, onOpenPerson, onOpenPublicProfile, watchlist, watched = {}, ratings, favorites = {}, onQuickActions }) {
  const activeFilter = exploreTabs.find((tab) => tab.id === activeExplore);
  useEffect(() => {
    if (!hasMoreExplore) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking || tabLoading) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700;
        if (nearBottom) onLoadMoreExplore?.();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMoreExplore, onLoadMoreExplore, tabLoading]);

  return (
    <>
      <SearchPanel {...queryProps} onOpen={onOpen} onOpenPerson={onOpenPerson} onOpenPublicProfile={onOpenPublicProfile} onQuickActions={onQuickActions} watchlist={watchlist} watched={watched} ratings={ratings} favorites={favorites} />
      <section className="mg2-explore-hero">
        <span>Discovery Hub</span>
        <h2>Find your next obsession.</h2>
        <p>Discover movies, shows, and hidden gems worth watching next.</p>
      </section>
      <div className="mg2-chips">
        {exploreTabs.map((tab) => (
          <button key={tab.id} className={activeExplore === tab.id ? "active" : ""} type="button" onClick={() => setActiveExplore(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <ContentRow title={activeFilter ? activeFilter.label : "Featured Picks"} items={tabResults} loading={tabLoading} onOpen={onOpen} onQuickActions={onQuickActions} watchlist={watchlist} watched={watched} ratings={ratings} favorites={favorites} />
      {tabLoading && tabResults.length > 0 && <div className="mg2-empty compact">Loading more...</div>}
      {exploreHubSections.map((section) => (
        <ContentRow
          key={section.id}
          title={section.title}
          items={exploreRows[section.id] || []}
          loading={exploreLoading}
          onOpen={onOpen}
          onQuickActions={onQuickActions}
          watchlist={watchlist}
          watched={watched}
          ratings={ratings}
          favorites={favorites}
        />
      ))}
      <GenreRow genres={genreSeeds} />
      <CollectionRow collections={collectionSeeds} onOpen={onOpen} />
      <ActorRow actors={actors} loading={actorsLoading} onOpenPerson={onOpenPerson} />
    </>
  );
}

function FeedCard({ item, liked, saved, onLike, onSave }) {
  return (
    <article className="mg2-feed-card">
      <div className="mg2-feed-head">
        <Avatar friend={item.friend} size="sm" />
        <div><strong>{item.friend.name}</strong> {item.action}<small>{item.time}</small></div>
        <Icon name="dots" />
      </div>
      <img src={posterUrl(item.poster, "w780")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }} />
      <div className="mg2-stars">***** <span>{item.rating}/10</span></div>
      <p>{item.body}</p>
      <div className="mg2-feed-actions">
        <button className={liked ? "active" : ""} type="button" onClick={() => onLike(item.id)}><Icon name="heart" /> {liked ? 343 : 342}</button>
        <button type="button"><Icon name="chat" /> 26</button>
        <button className={saved ? "active" : ""} type="button" onClick={() => onSave(item.id)}><Icon name="bookmark" /> Save</button>
      </div>
    </article>
  );
}

function FeedScreen({ items, loadMore, likedFeed, savedFeed, toggleFeedLike, toggleFeedSave }) {
  return (
    <section className="mg2-feed-list">
      {items.map((item) => <FeedCard key={item.id} item={item} liked={likedFeed[item.id]} saved={savedFeed[item.id]} onLike={toggleFeedLike} onSave={toggleFeedSave} />)}
      <button className="mg2-wide-button" type="button" onClick={loadMore}>Load more activity</button>
    </section>
  );
}

function youtubeQueriesForItem(item, tab) {
  const title = titleOf(item);
  const editQueries = [`${title} edit`, `${title} shorts`, `${title} scene edit`, `${title} cinematic edit`, `${title} fan edit`];
  return tab === "watched" || tab === "friends" || tab === "forYou"
    ? [...editQueries, `${title} official trailer`, `${title} trailer`]
    : editQueries;
}

function videoKindFromTitle(videoTitle = "", query = "") {
  const text = `${videoTitle} ${query}`.toLowerCase();
  if (text.includes("official trailer")) return "Official Trailer";
  if (text.includes("trailer")) return "Trailer";
  if (text.includes("scene edit")) return "Scene Edit";
  if (text.includes("short")) return "Short";
  if (text.includes("edit")) return "Edit";
  return "Edit";
}

function scoreYouTubeVideo(video, item, query, tab, used = {}) {
  const title = titleOf(item).toLowerCase();
  const text = `${video.videoTitle || ""} ${query}`.toLowerCase();
  let score = 0;
  if (video.thumbnailUrl) score += 20;
  if (text.includes(title)) score += 22;
  if (text.includes("edit")) score += 18;
  if (text.includes("short")) score += 16;
  if (text.includes("scene edit")) score += 14;
  if (text.includes("cinematic")) score += 10;
  if (text.includes("official trailer")) score += tab === "forYou" || tab === "friends" || tab === "watched" ? -20 : 8;
  else if (text.includes("trailer")) score += -12;
  if (used.videoIds?.has(video.id)) score -= 1000;
  if ((used.itemKeys?.get(keyOf(item)) || 0) > 0) score -= 18;
  if ((used.channels?.get(video.channelTitle) || 0) > 1) score -= 12;
  const freshness = video.publishedAt ? Math.max(0, 8 - Math.floor((Date.now() - new Date(video.publishedAt).getTime()) / 31536000000)) : 0;
  return score + freshness;
}

function reelCacheRowToVideo(row, item, fallbackReason) {
  const sourceProbeUrl = row.source_url || row.watch_url || row.embed_url || "";
  const parsed = parseExternalReelUrl(sourceProbeUrl);
  const source = reelSourceFromUrl(row.source || "youtube", sourceProbeUrl);
  const videoId = row.source_video_id || parsed?.sourceVideoId || getYouTubeVideoId(row) || row.id;
  const watchUrl = row.watch_url || row.source_url || (source === "youtube" && row.source_video_id ? `https://www.youtube.com/watch?v=${row.source_video_id}` : "");
  if (!videoId && !watchUrl) return null;
  return {
    id: videoId || watchUrl,
    source,
    sourceVideoId: videoId || "",
    sourceUrl: row.source_url || "",
    embedHtml: row.embed_html || "",
    embedStatus: row.embed_status || "",
    item: { ...item, media_type: mediaType(item) },
    videoTitle: row.video_title || "",
    channelTitle: row.channel_title || row.creator_username || "",
    thumbnailUrl: row.thumbnail_url || "",
    embedUrl: reelEmbedUrlForSource(source, videoId, row.source_url || watchUrl, row.embed_url || parsed?.embedUrl || ""),
    watchUrl,
    kind: row.label || (source === "instagram" ? "Instagram Reel" : source === "facebook" ? "Facebook Reel" : videoKindFromTitle(row.video_title || "")),
    reason: row.reason || fallbackReason,
    playable: row.playable !== false && Boolean(watchUrl || row.embed_url || row.embed_html),
    score: Number(row.quality_score || 0),
    updatedAt: row.updated_at || row.created_at || "",
    lastEmbedCheckedAt: row.last_embed_checked_at || ""
  };
}

function reelCacheRowIsFresh(row) {
  const timestamp = new Date(row.updated_at || row.created_at || 0).getTime();
  return timestamp && Date.now() - timestamp < REEL_CACHE_TTL_MS;
}

function reelRowHasPlayableSource(row = {}) {
  return row.approved !== false && Boolean(row.playable || row.source_video_id || row.embed_url || row.watch_url || row.source_url);
}

const TMDB_REEL_VIDEO_SCORE = {
  Clip: 90,
  Teaser: 80,
  Featurette: 75,
  "Behind the Scenes": 70,
  Trailer: 60
};

function scoreTmdbVideo(video = {}) {
  return TMDB_REEL_VIDEO_SCORE[video.type] || 0;
}

function tmdbVideoLabel(video = {}) {
  return TMDB_REEL_VIDEO_SCORE[video.type] ? video.type : "Preview";
}

let tmdbReelSeedErrorLogged = false;

async function seedPlayableReelsFromTmdbVideos(seedItems = []) {
  if (!API_KEY || !seedItems.length) return { reels: [], checked: 0, created: 0 };
  const acceptedTypes = new Set(["Clip", "Teaser", "Trailer", "Featurette", "Behind the Scenes"]);
  const seenVideoIds = new Set();
  const rows = [];
  let checked = 0;

  for (const candidate of seedItems.slice(0, 15)) {
    const item = candidate.item || {};
    if (!item.id) continue;
    checked += 1;
    try {
      const type = mediaType(item);
      const response = await fetch(`${API_BASE}/${type}/${item.id}/videos?api_key=${API_KEY}`);
      if (!response.ok) continue;
      const data = await response.json();
      const videos = (data.results || [])
        .filter((video) => video.site === "YouTube" && video.key && acceptedTypes.has(video.type))
        .sort((a, b) => {
          const official = Number(Boolean(b.official)) - Number(Boolean(a.official));
          if (official) return official;
          return scoreTmdbVideo(b) - scoreTmdbVideo(a);
        })
        .slice(0, 3);
      videos.forEach((video) => {
        if (seenVideoIds.has(video.key)) return;
        seenVideoIds.add(video.key);
        const normalized = { ...item, media_type: type };
        const now = new Date().toISOString();
        rows.push({
          source: "youtube",
          source_video_id: video.key,
          source_url: `https://www.youtube.com/watch?v=${video.key}`,
          media_type: type,
          tmdb_id: Number(item.id),
          item_key: keyOf(normalized),
          title: titleOf(normalized),
          video_title: video.name || titleOf(normalized),
          channel_title: "TMDB",
          creator_username: "TMDB",
          thumbnail_url: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
          embed_url: `https://www.youtube.com/embed/${video.key}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&enablejsapi=1`,
          watch_url: `https://www.youtube.com/watch?v=${video.key}`,
          label: tmdbVideoLabel(video),
          reason: "Official video from TMDB",
          source_context: "tmdb_videos",
          approved: true,
          playable: true,
          quality_score: scoreTmdbVideo(video),
          last_checked_at: now,
          updated_at: now
        });
      });
    } catch {
      // A single title with unavailable TMDB videos should not block the rest of Reels.
    }
  }

  if (rows.length && supabase) {
    const { error } = await supabase.from("reel_cache").upsert(rows, { onConflict: "source,source_video_id" });
    if (error && !tmdbReelSeedErrorLogged) {
      tmdbReelSeedErrorLogged = true;
      console.error("MovieGram TMDB reel seed upsert failed", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
  }

  const reels = rows
    .map((row) => reelCacheRowToVideo(row, seedItems.find((candidate) => keyOf(candidate.item) === row.item_key)?.item || row, row.reason))
    .filter(Boolean)
    .map((reel) => ({ ...reel, score: Number(reel.score || 0) + 120 }));
  return { reels: rankReelsForFeed(reels), checked, created: rows.length };
}

async function loadReelCacheForSeeds(seedItems, tab) {
  if (!supabase || !seedItems.length) return { reels: [], freshKeys: new Set() };
  const reelCacheSelect = "id,source,source_video_id,source_url,media_type,tmdb_id,item_key,title,video_title,channel_title,creator_username,thumbnail_url,embed_html,embed_url,watch_url,label,reason,source_context,source_user_id,approved,quality_score,playable,last_checked_at,created_at,updated_at";
  const candidatesByKey = new Map(seedItems.map((candidate) => [keyOf(candidate.item), candidate]));
  const itemKeys = [...candidatesByKey.keys()];
  const { data, error } = await supabase
    .from("reel_cache")
    .select(reelCacheSelect)
    .in("item_key", itemKeys)
    .order("updated_at", { ascending: false })
    .limit(Math.max(30, itemKeys.length * 4));

  if (error) {
    console.error("MovieGram Supabase load failed for reel_cache", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return { reels: [], freshKeys: new Set() };
  }

  const playableSeedRows = (data || []).filter(reelRowHasPlayableSource);
  console.info(`Reel cache seed query: seedMatched=${playableSeedRows.length}`);

  let globalData = [];
  if (tab === "forYou" || playableSeedRows.length < 10) {
    const { data: fillData, error: fillError } = await supabase
      .from("reel_cache")
      .select(reelCacheSelect)
      .or("source_video_id.not.is.null,source_url.not.is.null,watch_url.not.is.null,embed_url.not.is.null")
      .order("quality_score", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(tab === "forYou" ? 80 : 50);

    if (fillError) {
      console.error("MovieGram Supabase global fill failed for reel_cache", {
        message: fillError.message,
        code: fillError.code,
        details: fillError.details,
        hint: fillError.hint
      });
    } else {
      globalData = (fillData || []).filter(reelRowHasPlayableSource);
    }
  }
  console.info(`Reel cache global fill: loaded=${globalData.length}`);

  const seenVideos = new Set();
  const itemCounts = new Map();
  const freshKeys = new Set();
  const reels = [];
  const rowItem = (row) => ({
    id: row.tmdb_id || row.id,
    media_type: row.media_type || "movie",
    title: row.title || row.video_title || "Untitled",
    name: row.media_type === "tv" ? row.title || row.video_title || "Untitled" : undefined
  });
  const rowsToMerge = [
    ...(data || []).map((row) => ({ row, seedMatched: candidatesByKey.has(row.item_key), globalFill: false })),
    ...globalData.map((row) => ({ row, seedMatched: candidatesByKey.has(row.item_key), globalFill: true }))
  ];

  const conversionStats = {
    raw: rowsToMerge.length,
    playable: 0,
    converted: 0
  };

  rowsToMerge.forEach(({ row, seedMatched, globalFill }) => {
    const candidate = candidatesByKey.get(row.item_key);
    if (!reelRowHasPlayableSource(row)) return;
    if (globalFill && tab !== "forYou" && !candidate) return;
    conversionStats.playable += 1;
    if (reelCacheRowIsFresh(row)) freshKeys.add(row.item_key);
    const source = reelSourceFromUrl(row.source || "", row.source_url || row.watch_url || row.embed_url || "");
    const dedupeKey = `${source}:${row.source_video_id || row.source_url || row.watch_url || row.embed_url || row.id}`;
    if (seenVideos.has(dedupeKey)) return;
    const itemKey = row.item_key || (candidate ? keyOf(candidate.item) : "");
    const itemCount = itemCounts.get(itemKey) || 0;
    if (itemKey && itemCount >= 3) return;
    const video = reelCacheRowToVideo(row, candidate?.item || rowItem(row), candidate?.reason || row.reason || "From MovieGram reels");
    if (!video) return;
    conversionStats.converted += 1;
    seenVideos.add(dedupeKey);
    if (itemKey) itemCounts.set(itemKey, itemCount + 1);
    const sourceBoost = ["youtube", "instagram", "facebook"].includes(video.source) ? 50 : 10;
    reels.push({
      ...video,
      reason: row.source_context === tab ? video.reason : candidate?.reason || video.reason,
      score: Number(candidate?.score || 0)
        + (seedMatched ? 120 : 0)
        + (globalFill ? 40 : 0)
        + (row.source_context === tab ? 20 : 0)
        + sourceBoost
        + Number(row.quality_score || 0)
    });
  });

  const rankedReels = rankReelsForFeed(reels);
  const finalReels = tab === "forYou" ? rankedReels.slice(0, 50) : rankedReels;
  console.info(`Reel cache conversion: raw=${conversionStats.raw}, playable=${conversionStats.playable}, converted=${conversionStats.converted}, final=${finalReels.length}.`);
  return { reels: finalReels, freshKeys };
}

async function saveReelCacheRow({ item, video, tab, reason, userId }) {
  if (!supabase || !item?.id || (!video?.id && !video?.watchUrl)) return;
  const normalized = { ...item, media_type: mediaType(item) };
  const itemKey = keyOf(normalized);
  const now = new Date().toISOString();
  const row = {
    source: video.source || "youtube",
    source_video_id: video.id || null,
    source_url: video.sourceUrl || video.watchUrl || "",
    media_type: mediaType(normalized),
    tmdb_id: Number(normalized.id),
    item_key: itemKey,
    title: titleOf(normalized),
    video_title: video.videoTitle || "",
    channel_title: video.channelTitle || "",
    creator_username: video.creatorUsername || video.channelTitle || "",
    thumbnail_url: video.thumbnailUrl || "",
    embed_html: video.embedHtml || "",
    embed_url: reelEmbedUrlForSource(video.source || "youtube", video.id, video.sourceUrl || video.watchUrl || "", video.embedUrl || ""),
    watch_url: video.watchUrl || `https://www.youtube.com/watch?v=${video.id}`,
    label: video.kind || videoKindFromTitle(video.videoTitle || ""),
    reason,
    source_context: tab,
    source_user_id: userId && userId !== "guest" ? userId : null,
    approved: true,
    playable: Boolean(video.watchUrl || video.embedUrl || video.sourceUrl),
    quality_score: Number(video._score || video.score || 0),
    last_checked_at: now,
    updated_at: now
  };
  const { error } = await supabase
    .from("reel_cache")
    .upsert(row, { onConflict: "source,source_video_id" });
  if (error) {
    console.error("MovieGram Supabase upsert failed for reel_cache", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
}

async function submitExternalReelLink({ item, url, reason, userId, approved }) {
  if (!supabase || !userId || userId === "guest" || !item?.id) {
    return { error: "Sign in to submit a reel link." };
  }
  const parsed = parseExternalReelUrl(url);
  if (!parsed) return { error: "Paste a valid Instagram, YouTube, or public reel URL." };
  const normalized = { ...item, media_type: mediaType(item) };
  const itemKey = keyOf(normalized);
  const now = new Date().toISOString();
  const sourceVideoId = parsed.sourceVideoId || `${parsed.source}:${itemKey}:${Date.now()}`;
  const row = {
    source: parsed.source,
    source_video_id: sourceVideoId,
    source_url: parsed.sourceUrl,
    media_type: mediaType(normalized),
    tmdb_id: Number(normalized.id),
    item_key: itemKey,
    title: titleOf(normalized),
    video_title: titleOf(normalized),
    channel_title: "",
    creator_username: "",
    thumbnail_url: "",
    embed_html: "",
    embed_url: parsed.embedUrl || "",
    watch_url: parsed.watchUrl || parsed.sourceUrl,
    label: parsed.source === "instagram" ? "Instagram Reel" : parsed.source === "facebook" ? "Facebook Reel" : parsed.label,
    reason: reason?.trim() || `Submitted for ${titleOf(normalized)}`,
    source_context: "manual_submission",
    source_user_id: userId,
    approved: Boolean(approved),
    playable: Boolean(parsed.sourceUrl || parsed.watchUrl),
    quality_score: parsed.source === "youtube" ? 50 : parsed.source === "instagram" || parsed.source === "facebook" ? 45 : 25,
    last_checked_at: now,
    updated_at: now
  };
  const { error } = await supabase
    .from("reel_cache")
    .upsert(row, { onConflict: "source,source_video_id" });
  if (error) {
    console.error("MovieGram Supabase submit failed for reel_cache", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return { error: error.message || "Could not save this reel link." };
  }
  return { success: approved ? "Reel link saved and approved." : "Reel link submitted for review." };
}

function ReelsScreen({ rows, watched = {}, watchlist = {}, ratings = {}, reviews = {}, favorites = {}, socialActivity = [], userId = "guest", detailsOpen = false, onOpen, onWatchlist, onWatched, onFavorite, onReelActivity }) {
  const [reelTab, setReelTab] = useState("forYou");
  const [reels, setReels] = useState([]);
  const [loadingReels, setLoadingReels] = useState(true);
  const [reelError, setReelError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageSize, setPageSize] = useState(7);
  const [speeding, setSpeeding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(() => readReelsMutedPreference());
  const [loadedPlayers, setLoadedPlayers] = useState({});
  const [reelAspectModes, setReelAspectModes] = useState({});
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitQuery, setSubmitQuery] = useState("");
  const [submitReason, setSubmitReason] = useState("");
  const [submitItemKey, setSubmitItemKey] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [submittingReel, setSubmittingReel] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [adminSource, setAdminSource] = useState("manual");
  const [adminInput, setAdminInput] = useState("");
  const [adminTarget, setAdminTarget] = useState(25);
  const [adminDryRun, setAdminDryRun] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminResult, setAdminResult] = useState(null);
  const [discoveryReady, setDiscoveryReady] = useState(null);
  const [failedEmbeds, setFailedEmbeds] = useState({});
  const [reelLikes, setReelLikes] = useState(() => readReelLikes());
  const [reelComments, setReelComments] = useState(() => readReelComments());
  const [commentReel, setCommentReel] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [heartBurst, setHeartBurst] = useState("");
  const reelRefs = useRef([]);
  const iframeRefs = useRef([]);
  const lastLoadedKeyRef = useRef("");
  const inFlightReelLoadsRef = useRef(new Set());
  const youtubeBlockedRef = useRef(readYouTubeQuotaExceeded());
  const embedEnrichmentRef = useRef(new Set());
  const controlLogRef = useRef(new Set());
  const activePlayerLogRef = useRef("");
  const reelLayoutLogRef = useRef("");
  const feedMixLogRef = useRef("");
  const coverageLogRef = useRef("");
  const reelOrderLogRef = useRef("");
  const reelSocialWarnedRef = useRef(new Set());
  const disabledReelSocialTablesRef = useRef(new Set());
  const seenReelIdsRef = useRef(new Set());
  const failedYouTubeVideoIdsRef = useRef(new Set());
  const baseReels = useMemo(() => dedupe([...(rows.trending || []), ...(rows.movies || []), ...(rows.series || []), ...(rows.anime || []), ...fallbackRows.trending, ...fallbackRows.movies, ...fallbackRows.series]), [rows]);
  const watchedReels = useMemo(() => Object.values(watched), [watched]);
  const watchlistReels = useMemo(() => Object.values(watchlist), [watchlist]);
  const favoriteReels = useMemo(() => Object.values(favorites), [favorites]);
  const ratedKeys = useMemo(() => Object.entries(ratings || {}).filter(([, rating]) => normalizeUserRating(rating) >= 4).map(([key]) => key), [ratings]);
  const reelsLibraryVersion = useMemo(() => {
    const parts = [
      `w:${Object.keys(watched || {}).sort().join(",")}`,
      `l:${Object.keys(watchlist || {}).sort().join(",")}`,
      `f:${Object.keys(favorites || {}).sort().join(",")}`,
      `r:${Object.keys(ratings || {}).filter((key) => normalizeUserRating(ratings[key]) >= 4).sort().join(",")}`,
      `v:${Object.keys(reviews || {}).sort().join(",")}`
    ];
    return String(hashString(parts.join("|")));
  }, [favorites, ratings, reviews, watched, watchlist]);
  const friendActivityItems = useMemo(() => dedupe((socialActivity || []).map((event) => event.item).filter(Boolean)), [socialActivity]);
  const isReelAdmin = userId && userId !== "guest" && MOVIEGRAM_REEL_ADMIN_IDS.includes(userId);
  const localReelAdminEnabled = typeof window !== "undefined" && ["true", "1", "yes"].includes(String(window.localStorage.getItem("moviegram_reels_admin") || window.localStorage.getItem("mg2_reels_admin") || "").toLowerCase());
  const canOpenReelAdmin = isReelAdmin || process.env.NODE_ENV !== "production" || localReelAdminEnabled;
  const canSubmitReels = isReelAdmin;
  const reelTabs = [
    { id: "forYou", label: "For You" },
    { id: "watched", label: "Watched" },
    { id: "friends", label: "Friends" }
  ];

  const reelCandidates = useMemo(() => {
    const watchedKeys = new Set(watchedReels.map(keyOf));
    const watchlistKeys = new Set(watchlistReels.map(keyOf));
    const favoriteKeys = new Set(favoriteReels.map(keyOf));
    const ratedKeySet = new Set(ratedKeys);
    const candidates = new Map();
    const addCandidate = (item, score, reason, friendLabel = "") => {
      if (!item?.id) return;
      const normalized = { ...item, media_type: mediaType(item) };
      const key = keyOf(normalized);
      const existing = candidates.get(key);
      const payload = { item: normalized, score, reason, friendLabel };
      if (!existing || payload.score > existing.score) candidates.set(key, payload);
    };

    if (reelTab === "watched") {
      watchedReels.forEach((item, index) => addCandidate(item, 200 - index, index % 2 ? "From your watched history" : "You watched this"));
      return [...candidates.values()].sort((a, b) => b.score - a.score);
    }

    if (reelTab === "friends") {
      (socialActivity || []).forEach((event, index) => {
        if (!event.item) return;
        const username = event.profile?.username || publicProfileName(event.profile || {}).replace(/\s+/g, "").toLowerCase() || "friend";
        const action = event.action || "";
        const rating = normalizeUserRating(event.metadata?.rating || event.rating);
        const label = action === "watchlisted" ? `${username} added this to watchlist`
          : action === "rated" && rating ? `${username} rated this ${formatUserRating(rating)}`
            : action === "reviewed" ? `${username} reviewed this`
              : action === "favorite" || action === "liked" ? `${username} liked this`
                : `${username} watched this`;
        addCandidate(event.item, 180 - index * 2 + (rating >= 4 ? 18 : 0), label, username);
      });
      if (socialActivity?.length) {
        friendActivityItems.forEach((item, index) => addCandidate(item, 110 - index, "Recommended from your friends' taste"));
      }
      return [...candidates.values()].sort((a, b) => b.score - a.score);
    }

    watchlistReels.forEach((item, index) => addCandidate(item, 170 - index * 2, "Because this is in your watchlist"));
    favoriteReels.forEach((item, index) => addCandidate(item, 160 - index * 2, "Based on your favorites"));
    baseReels.forEach((item, index) => {
      const key = keyOf(item);
      if (watchedKeys.has(key)) return;
      let score = 44 - index;
      let reason = "Trending now";
      if (watchlistKeys.has(key)) {
        score += 90;
        reason = "Because this is in your watchlist";
      }
      if (favoriteKeys.has(key) || ratedKeySet.has(key)) {
        score += 70;
        reason = "Based on your ratings";
      }
      const hasWatchedSameType = watchedReels.some((watchedItem) => mediaType(watchedItem) === mediaType(item));
      if (hasWatchedSameType) {
        score += 34;
        reason = `Similar to your watched ${mediaType(item) === "tv" ? "shows" : "movies"}`;
      }
      if (item.poster_path || item.backdrop_path) score += 12;
      addCandidate(item, score, reason);
    });
    return [...candidates.values()].sort((a, b) => b.score - a.score);
  }, [baseReels, favoriteReels, friendActivityItems, ratedKeys, reelTab, socialActivity, watchedReels, watchlistReels]);

  const seedItems = useMemo(() => reelCandidates.slice(0, pageSize), [pageSize, reelCandidates]);
  const currentReelCandidateKeys = useMemo(() => new Set(reelCandidates.map((candidate) => keyOf(candidate.item))), [reelCandidates]);
  const fallbackPreviewReels = useMemo(() => seedItems.slice(0, Math.min(pageSize, 10)).map((candidate, index) => ({
    item: candidate.item,
    id: `fallback-${keyOf(candidate.item)}-${index}`,
    source: "fallback",
    reason: candidate.reason,
    isFallbackPreview: true,
    kind: "Preview",
    score: candidate.score || 0
  })), [pageSize, seedItems]);
  const submitMatches = useMemo(() => {
    const source = dedupe([...watchlistReels, ...watchedReels, ...favoriteReels, ...baseReels]).slice(0, 80);
    const needle = submitQuery.trim().toLowerCase();
    return source
      .filter((item) => !needle || `${titleOf(item)} ${yearOf(item)}`.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [baseReels, favoriteReels, submitQuery, watchedReels, watchlistReels]);
  const selectedSubmitItem = useMemo(() => submitMatches.find((item) => keyOf(item) === submitItemKey) || submitMatches[0] || null, [submitItemKey, submitMatches]);
  const seedKey = useMemo(() => seedItems.map((candidate) => `${keyOf(candidate.item)}:${Math.round(candidate.score || 0)}:${candidate.reason}`).join("|"), [seedItems]);
  const loadKey = `${userId || "guest"}:${reelTab}:${pageSize}:${reelsLibraryVersion}:${seedKey}`;

  useEffect(() => {
    lastLoadedKeyRef.current = "";
    inFlightReelLoadsRef.current.clear();
    setPageSize(7);
    setActiveIndex(0);
    setReels([]);
    setLoadingReels(true);
    setReelError("");
    seenReelIdsRef.current = new Set();
  }, [reelTab, reelsLibraryVersion]);

  useEffect(() => {
    console.info(`Reels library sync: tab=${reelTab}, libraryVersion=${reelsLibraryVersion}, seedItems=${seedItems.length}, currentReels=${reels.length}.`);
  }, [loadKey]);

  function orderPlayableForDisplay(list = []) {
    const ordered = rotateAndDiversifyReels(list, reelTab, userId);
    const logKey = `${reelTab}:${ordered.seedLabel}:${ordered.first}:${ordered.reels.length}`;
    if (reelOrderLogRef.current !== logKey) {
      reelOrderLogRef.current = logKey;
      console.info(`Reels order: total=${ordered.reels.length}, unique=${ordered.unique}, first=${ordered.first}, seed=${ordered.seedLabel}.`);
    }
    return ordered.reels;
  }

  useEffect(() => {
    const observers = reelRefs.current.filter(Boolean);
    if (!observers.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.dataset?.index) setActiveIndex(Number(visible.target.dataset.index));
    }, { threshold: [0.55, 0.75] });
    observers.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [reels]);

  useEffect(() => {
    let alive = true;
    const stableSeeds = reelTab === "watched" || reelTab === "friends"
      ? reelCandidates.slice(0, 50)
      : seedItems.slice(0, Math.min(pageSize, 10));
    const fallbackReels = () => fallbackPreviewReels;

    async function loadYouTubeReels() {
      if (lastLoadedKeyRef.current === loadKey || inFlightReelLoadsRef.current.has(loadKey)) return;
      lastLoadedKeyRef.current = loadKey;
      inFlightReelLoadsRef.current.add(loadKey);
      setActiveIndex(0);
      setLoadingReels(true);
      iframeRefs.current = [];

      if (!stableSeeds.length) {
        if (alive) {
          setReels([]);
          setReelError("");
          setLoadingReels(false);
        }
        inFlightReelLoadsRef.current.delete(loadKey);
        return;
      }

      const cached = await loadReelCacheForSeeds(stableSeeds, reelTab);
      const playableReels = Array.isArray(cached?.reels) ? cached.reels : [];
      console.info(`Reel cache returned to effect: reels=${playableReels.length}.`);
      if (alive && playableReels.length > 0) {
        setReels(() => orderPlayableForDisplay(playableReels));
        setReelError("");
        setLoadingReels(false);
      } else if (alive) {
        setReels((current) => hasPlayableReels(current) ? current : fallbackReels());
        setReelError("Finding playable reels. Showing previews for now.");
      }
      if (playableReels.length < 20 && !readTmdbReelSeedDone()) {
        markTmdbReelSeedDone();
        seedPlayableReelsFromTmdbVideos(reelCandidates.slice(0, 25)).then((tmdbSeed) => {
          if (!alive) return;
          const merged = mergePlayableReels(playableReels, tmdbSeed.reels);
          if (merged.length) {
            setReels((current) => orderPlayableForDisplay(mergePlayableReels(current.length ? current : playableReels, tmdbSeed.reels)));
            setReelError("");
          }
          console.info(`TMDB reel seed: checked ${tmdbSeed.checked} titles, created ${tmdbSeed.created} playable rows, using ${merged.length} playable total.`);
        });
      }
      const lightDiscoveryAllowed = !readReelLightDiscoveryUsed()
        && !readYouTubeQuotaExceeded()
        && playableReels.length < 20
        && stableSeeds.length > 0;
      logReelCacheFirstOnce({
        cachedCount: cached.reels.length,
        fallbackCount: fallbackReels().length,
        lightDiscoveryAllowed,
        youtubeCallsUsed: youtubeTabSearchCount(reelTab, userId)
      });

      if (!isReelAdmin && lightDiscoveryAllowed) {
        markReelLightDiscoveryUsed();
        fetch("/api/reel-light-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tab: reelTab,
            user_id: userId || "guest",
            youtube_blocked: readYouTubeQuotaExceeded(),
            youtube_calls_used: youtubeTabSearchCount(reelTab, userId),
            candidates: stableSeeds.slice(0, 2).map((candidate) => ({
              item: {
                id: candidate.item.id,
                media_type: mediaType(candidate.item),
                title: candidate.item.title || candidate.item.name || "",
                name: candidate.item.name || "",
                poster_path: candidate.item.poster_path || "",
                backdrop_path: candidate.item.backdrop_path || "",
                release_date: candidate.item.release_date || "",
                first_air_date: candidate.item.first_air_date || "",
                vote_average: candidate.item.vote_average || null
              },
              reason: candidate.reason,
              score: candidate.score || 0
            }))
          })
        })
          .then((response) => response.ok ? response.json() : null)
          .then((result) => {
            if (result?.youtubeCalls) {
              Array.from({ length: Number(result.youtubeCalls || 0) }).forEach(() => incrementYouTubeTabSearchCount(reelTab, userId));
            }
            if (result) console.info(`YouTube light fill: callsUsed=${youtubeTabSearchCount(reelTab, userId)}, saved=${result.saved || 0}, stoppedForQuota=${Boolean(result.youtubeQuota)}.`);
            if (alive && result?.saved) {
              loadReelCacheForSeeds(stableSeeds, reelTab).then((latest) => {
                if (alive && latest.reels.length) setReels((current) => orderPlayableForDisplay(mergePlayableReels(current, latest.reels)));
              });
            }
            if (result?.youtubeQuota) {
              youtubeBlockedRef.current = true;
              markYouTubeQuotaExceeded();
              if (alive && !cached.reels.length) setReelError("YouTube limit reached. Showing title previews for now.");
            }
          })
          .catch(() => {
            // Light fill is opportunistic; cache/fallback reels remain usable.
          });
      }
      const refreshableSeeds = stableSeeds
        .filter((candidate) => !cached.freshKeys.has(keyOf(candidate.item)))
        .filter((candidate) => !wasYouTubeTitleRefreshedRecently(reelTab, keyOf(candidate.item)));

      if (!isReelAdmin) {
        if (alive) {
          if (!playableReels.length) setReels((current) => hasPlayableReels(current) ? current : fallbackReels());
          setReelError(playableReels.length ? "" : "Finding playable reels. Showing previews for now.");
          setLoadingReels(false);
        }
        inFlightReelLoadsRef.current.delete(loadKey);
        return;
      }

      if (!YOUTUBE_API_KEY) {
        if (alive) {
          if (!cached.reels.length) setReels((current) => hasPlayableReels(current) ? current : fallbackReels());
          setReelError(playableReels.length ? "" : "YouTube discovery unavailable.");
          setLoadingReels(false);
        }
        inFlightReelLoadsRef.current.delete(loadKey);
        return;
      }

      if (youtubeBlockedRef.current || readYouTubeQuotaExceeded()) {
        youtubeBlockedRef.current = true;
        if (alive) {
          if (!cached.reels.length) setReels((current) => hasPlayableReels(current) ? current : fallbackReels());
          setReelError(youtubeQuotaErrorObserved && !playableReels.length ? "YouTube limit reached. Showing title previews for now." : "");
          setLoadingReels(false);
        }
        inFlightReelLoadsRef.current.delete(loadKey);
        return;
      }

      if (!refreshableSeeds.length || youtubeTabSearchCount(reelTab, userId) >= MAX_YOUTUBE_SEARCHES_PER_TAB_SESSION) {
        if (alive) {
          if (!playableReels.length) setReels((current) => hasPlayableReels(current) ? current : fallbackReels());
          setReelError("");
          setLoadingReels(false);
        }
        inFlightReelLoadsRef.current.delete(loadKey);
        return;
      }

      setLoadingReels(true);
      setReelError("");
      try {
        const seenVideos = new Set();
        const next = [...playableReels];
        const used = { videoIds: seenVideos, itemKeys: new Map(), channels: new Map() };
        cached.reels.forEach((video) => {
          if (video.id) seenVideos.add(video.id);
          if (video.item) used.itemKeys.set(keyOf(video.item), (used.itemKeys.get(keyOf(video.item)) || 0) + 1);
          if (video.channelTitle) used.channels.set(video.channelTitle, (used.channels.get(video.channelTitle) || 0) + 1);
        });
        const youtubeOrigin = typeof window !== "undefined" ? `&origin=${encodeURIComponent(window.location.origin)}` : "";
        for (const candidate of refreshableSeeds) {
          if (youtubeBlockedRef.current || readYouTubeQuotaExceeded()) break;
          const item = candidate.item;
          const queries = youtubeQueriesForItem(item, reelTab);
          markYouTubeTitleRefreshed(reelTab, keyOf(item));
          for (const query of queries) {
            if (youtubeBlockedRef.current || readYouTubeQuotaExceeded()) break;
            if (youtubeTabSearchCount(reelTab, userId) >= MAX_YOUTUBE_SEARCHES_PER_TAB_SESSION) break;
            const queryType = query.toLowerCase().includes("trailer") ? "trailer" : "edit";
            const cacheKey = `${reelTab}:${userId || "guest"}:${keyOf(item)}:${queryType}:${query}`;
            let videos = youtubeReelMemoryCache.get(cacheKey);
            if (!videos) {
              incrementYouTubeTabSearchCount(reelTab, userId);
              const params = new URLSearchParams({
                key: YOUTUBE_API_KEY,
                part: "snippet",
                q: query,
                type: "video",
                videoEmbeddable: "true",
                safeSearch: "moderate",
                maxResults: "4"
              });
              if (queryType !== "trailer") params.set("videoDuration", "short");
              const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
              if (!response.ok) {
                let details = null;
                try {
                  details = await response.json();
                } catch {
                  details = null;
                }
                const error = new Error(`YouTube ${response.status}`);
                error.status = response.status;
                error.details = details?.error?.message || "";
                if (isYouTubeQuotaError(response.status, error.details)) {
                  youtubeBlockedRef.current = true;
                  markYouTubeQuotaExceeded();
                }
                throw error;
              }
              const data = await response.json();
              videos = (data.items || [])
                .map((video) => ({
                  id: video.id?.videoId,
                  videoTitle: video.snippet?.title || "",
                  channelTitle: video.snippet?.channelTitle || "",
                  thumbnailUrl: video.snippet?.thumbnails?.maxres?.url || video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || "",
                  publishedAt: video.snippet?.publishedAt || ""
                }))
                .filter((video) => video.id && video.thumbnailUrl);
              youtubeReelMemoryCache.set(cacheKey, videos);
            }
            const video = [...videos]
              .map((entry) => ({ ...entry, _score: scoreYouTubeVideo(entry, item, query, reelTab, used), kind: videoKindFromTitle(entry.videoTitle, query) }))
              .sort((a, b) => b._score - a._score)[0];
            if (video) {
              seenVideos.add(video.id);
              used.itemKeys.set(keyOf(item), (used.itemKeys.get(keyOf(item)) || 0) + 1);
              used.channels.set(video.channelTitle, (used.channels.get(video.channelTitle) || 0) + 1);
              const reel = {
                ...video,
                item: { ...item, media_type: mediaType(item) },
                id: video.id,
                embedUrl: `https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&enablejsapi=1${youtubeOrigin}`,
                watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
                reason: candidate.reason,
                score: candidate.score + video._score
              };
              next.push(reel);
              saveReelCacheRow({ item, video: reel, tab: reelTab, reason: candidate.reason, userId });
              break;
            }
          }
        }
        if (!alive) return;
        const mergedNext = mergePlayableReels(playableReels, next);
        setReels((current) => current.length ? orderPlayableForDisplay(mergePlayableReels(current, mergedNext)) : (mergedNext.length ? orderPlayableForDisplay(mergedNext) : fallbackReels()));
        setReelError(mergedNext.length ? "" : "Could not load YouTube reels right now. Showing title previews.");
      } catch (error) {
        if (!isYouTubeQuotaError(error?.status, error?.details || error?.message)) {
          console.error("MovieGram YouTube reels load error", {
            message: error?.message,
            status: error?.status,
            details: error?.details
          });
        }
        if (alive) {
          setReels((current) => playableReels.length ? playableReels : (hasPlayableReels(current) ? current : fallbackReels()));
          setReelError(isYouTubeQuotaError(error?.status, error?.details || error?.message) ? "YouTube limit reached. Showing title previews for now." : "Could not load YouTube reels right now. Showing title previews.");
        }
      } finally {
        inFlightReelLoadsRef.current.delete(loadKey);
        if (alive) setLoadingReels(false);
      }
    }
    loadYouTubeReels();
    return () => { alive = false; };
  }, [isReelAdmin, loadKey, pageSize, reelTab, userId]);

  function sendYouTubeCommand(index, func, args = []) {
    const frame = iframeRefs.current[index];
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }

  function youtubePlayerKey(videoId = "") {
    return `youtube-${videoId}`;
  }

  function reelEmptyMessage() {
    if (reelTab === "watched") return "Mark movies or shows watched to see edits here.";
    if (reelTab === "friends") return "Follow friends to see their movie reels. Try For You while your friend feed warms up.";
    return "Reels will appear when MovieGram has titles to show.";
  }

  const eligibleReels = useMemo(() => {
    if (!reels.length || reelTab === "forYou") return reels;
    return reels.filter((reel) => currentReelCandidateKeys.has(keyOf(reel.item || {})));
  }, [currentReelCandidateKeys, reelTab, reels]);
  const missingCandidateFallbacks = useMemo(() => {
    if (reelTab === "forYou") return [];
    const representedKeys = new Set(eligibleReels.map((reel) => keyOf(reel.item || {})));
    return reelCandidates
      .filter((candidate) => !representedKeys.has(keyOf(candidate.item)))
      .slice(0, 50)
      .map((candidate, index) => ({
        item: candidate.item,
        id: `fallback-${reelTab}-${keyOf(candidate.item)}-${index}`,
        source: "fallback",
        reason: candidate.reason,
        isFallbackPreview: true,
        kind: "Preview",
        score: candidate.score || 0
      }));
  }, [eligibleReels, reelCandidates, reelTab]);
  const visibleReels = useMemo(() => (
    eligibleReels.length
      ? [...eligibleReels, ...missingCandidateFallbacks]
      : (loadingReels ? [] : fallbackPreviewReels)
  ), [eligibleReels, fallbackPreviewReels, loadingReels, missingCandidateFallbacks]);
  const sourceWatermarkLabel = (source = "") => source === "instagram" ? "Instagram"
    : source === "facebook" ? "Facebook"
      : source === "web" ? "Web"
        : source === "manual" ? "Open"
          : "YouTube";

  useEffect(() => {
    const activeReel = visibleReels[activeIndex];
    if (activeReel && !activeReel.isFallbackPreview) {
      seenReelIdsRef.current.add(reelIdentity(activeReel));
      if (seenReelIdsRef.current.size >= visibleReels.filter((reel) => !reel.isFallbackPreview).length) {
        seenReelIdsRef.current = new Set([reelIdentity(activeReel)]);
      }
    }
    if (visibleReels.length && activeIndex >= visibleReels.length - 2 && reelCandidates.length > pageSize) {
      setPageSize((current) => Math.min(current + 5, reelCandidates.length));
    }
  }, [activeIndex, pageSize, reelCandidates.length, visibleReels]);

  useEffect(() => {
    if (loadingReels && visibleReels.length === 0) return;
    const mix = visibleReels.reduce((acc, reel) => {
      const source = reel.isFallbackPreview
        ? "fallback"
        : reelSourceFromUrl(reel.source || "", reel.sourceUrl || reel.watchUrl || reel.embedUrl || "");
      if (source === "instagram") acc.instagram += 1;
      else if (source === "facebook") acc.facebook += 1;
      else if (source === "fallback" || source === "preview") acc.fallback += 1;
      else if (source === "web" || source === "manual") acc.web += 1;
      else if (source === "youtube") acc.youtube += 1;
      const isTrailer = reelTypeLabel(reel).toLowerCase().includes("trailer");
      if (isTrailer) acc.trailers += 1;
      else acc.nonTrailers += 1;
      const youtubeVideoId = getYouTubeVideoId(reel);
      const aspectMode = youtubeVideoId ? estimateReelAspectMode(reel, youtubeVideoId) : "unknown-contain";
      if (aspectMode.includes("vertical")) acc.vertical += 1;
      else if (aspectMode.includes("horizontal")) acc.horizontal += 1;
      else acc.unknown += 1;
      return acc;
    }, { youtube: 0, instagram: 0, facebook: 0, web: 0, fallback: 0, vertical: 0, horizontal: 0, unknown: 0, trailers: 0, nonTrailers: 0 });
    const signature = JSON.stringify(mix);
    if (feedMixLogRef.current === signature) return;
    feedMixLogRef.current = signature;
    console.info(`Reels feed mix: youtube=${mix.youtube}, instagram=${mix.instagram}, facebook=${mix.facebook}, web=${mix.web}, fallback=${mix.fallback}, vertical=${mix.vertical}, horizontal=${mix.horizontal}, unknown=${mix.unknown}, trailers=${mix.trailers}, nonTrailers=${mix.nonTrailers}.`);
  }, [visibleReels]);

  useEffect(() => {
    if (loadingReels && visibleReels.length === 0) return;
    if (reelTab === "watched") {
      const watchedKeys = new Set(watchedReels.map(keyOf));
      const matchedKeys = new Set(visibleReels.filter((reel) => !reel.isFallbackPreview && watchedKeys.has(keyOf(reel.item || {}))).map((reel) => keyOf(reel.item || {})));
      const fallbackItems = visibleReels.filter((reel) => reel.isFallbackPreview).length;
      const trailers = visibleReels.filter((reel) => reelTypeLabel(reel).toLowerCase().includes("trailer")).length;
      const nonTrailers = visibleReels.length - trailers;
      const signature = `watched:${watchedReels.length}:${matchedKeys.size}:${visibleReels.length}:${fallbackItems}:${trailers}:${nonTrailers}`;
      if (coverageLogRef.current !== signature) {
        coverageLogRef.current = signature;
        console.info(`Watched reels coverage: watchedItems=${watchedReels.length}, matchedItems=${matchedKeys.size}, reels=${visibleReels.length}, fallbackItems=${fallbackItems}, trailers=${trailers}, nonTrailers=${nonTrailers}.`);
      }
    }
    if (reelTab === "friends") {
      const friendKeys = new Set(reelCandidates.map((candidate) => keyOf(candidate.item)));
      const friendReels = visibleReels.filter((reel) => !reel.isFallbackPreview && friendKeys.has(keyOf(reel.item || {}))).length;
      const previewMode = userId === "guest" && friendKeys.size === 0 && visibleReels.length > 0;
      const signature = `friends:${socialActivity.length}:${friendKeys.size}:${friendReels}:${previewMode}`;
      if (coverageLogRef.current !== signature) {
        coverageLogRef.current = signature;
        console.info(`Friends reels coverage: friends=${socialActivity.length ? "active" : 0}, friendItems=${friendKeys.size}, reels=${friendReels}, previewMode=${previewMode}.`);
      }
    }
  }, [loadingReels, reelCandidates, reelTab, socialActivity.length, userId, visibleReels, watchedReels]);

  useEffect(() => {
    reels.forEach((reel, index) => {
      if (!isYouTubeReel(reel)) return;
      sendYouTubeCommand(index, index === activeIndex && isPlaying && !detailsOpen ? "playVideo" : "pauseVideo");
      if (index !== activeIndex) sendYouTubeCommand(index, "setPlaybackRate", [1]);
      if (index === activeIndex) sendYouTubeCommand(index, isMuted ? "mute" : "unMute");
    });
    setSpeeding(false);
  }, [activeIndex, detailsOpen, isMuted, isPlaying, reels]);

  useEffect(() => {
    if (!detailsOpen) return;
    setIsPlaying(false);
    iframeRefs.current.forEach((_, index) => sendYouTubeCommand(index, "pauseVideo"));
  }, [detailsOpen]);

  useEffect(() => {
    setIsPlaying(true);
    const preferredMuted = readReelsMutedPreference();
    setIsMuted(preferredMuted);
    setSpeeding(false);
    sendYouTubeCommand(activeIndex, "setPlaybackRate", [1]);
    sendYouTubeCommand(activeIndex, preferredMuted ? "mute" : "unMute");
  }, [activeIndex]);

  useEffect(() => {
    function handleYouTubeMessage(event) {
      if (!/youtube(?:-nocookie)?\.com$/.test(String(event.origin || "").replace(/^https?:\/\/(www\.)?/, ""))) return;
      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (payload?.event !== "onError") return;
      const reel = visibleReels[activeIndex];
      const videoId = getYouTubeVideoId(reel);
      if (!videoId) return;
      markYouTubeEmbedFailed(videoId, reelFailureKey(reel));
    }
    window.addEventListener("message", handleYouTubeMessage);
    return () => window.removeEventListener("message", handleYouTubeMessage);
  }, [activeIndex, visibleReels]);

  useEffect(() => {
    const reel = visibleReels[activeIndex];
    const source = reelSourceFromUrl(reel?.source || "", reel?.sourceUrl || reel?.watchUrl || reel?.embedUrl || "");
    const sourceUrl = reel?.sourceUrl || reel?.watchUrl || "";
    if (!reel || !["instagram", "facebook"].includes(source) || !sourceUrl) return;
    if (reel.embedUrl || reel.embedHtml || ["failed", "unsupported", "token_missing"].includes(reel.embedStatus)) return;
    const requestKey = `${source}:${sourceUrl}`;
    if (embedEnrichmentRef.current.has(requestKey)) return;
    embedEnrichmentRef.current.add(requestKey);

    let alive = true;
    fetch("/api/reel-oembed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, source_url: sourceUrl })
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!alive || !data || (!data.embed_url && !data.embed_html && !data.thumbnail_url)) return;
        setReels((current) => current.map((entry) => {
          const sameSource = (entry.sourceUrl || entry.watchUrl) === sourceUrl;
          if (!sameSource) return entry;
          return {
            ...entry,
            embedUrl: data.embed_url || entry.embedUrl,
            embedHtml: data.embed_html || entry.embedHtml,
            thumbnailUrl: data.thumbnail_url || entry.thumbnailUrl,
            videoTitle: data.title || entry.videoTitle,
            channelTitle: data.author_name || entry.channelTitle,
            embedStatus: data.embed_status || entry.embedStatus
          };
        }));
      })
      .catch(() => {
        // The existing poster/source preview remains the fallback when oEmbed is unavailable.
      });
    return () => { alive = false; };
  }, [activeIndex, visibleReels]);

  useEffect(() => {
    const reel = visibleReels[activeIndex];
    if (reel?.source !== "instagram" || !reel.embedHtml || typeof window === "undefined") return;
    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
      return;
    }
    if (document.querySelector("script[data-moviegram-instagram-embed]")) return;
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.dataset.moviegramInstagramEmbed = "true";
    document.body.appendChild(script);
  }, [activeIndex, visibleReels]);

  function logPlayerControl(action, muted = isMuted) {
    if (controlLogRef.current.has(action)) return;
    controlLogRef.current.add(action);
    console.info(`Player control: action=${action}, globalMuted=${Boolean(muted)}.`);
  }

  function stopPlayerEvent(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function togglePlayPause(event, index) {
    if (event?.target?.closest?.(".mg2-reel-actions, .mg2-youtube-watermark, .mg2-reel-controls, .mg2-reel-head, .mg2-bottom")) return;
    if (index !== activeIndex) return;
    setIsPlaying((current) => {
      const next = !current;
      sendYouTubeCommand(index, next ? "playVideo" : "pauseVideo");
      logPlayerControl(next ? "play" : "pause");
      return next;
    });
  }

  function toggleMute(event, index) {
    stopPlayerEvent(event);
    if (index !== activeIndex) return;
    setIsMuted((current) => {
      const next = !current;
      sendYouTubeCommand(index, next ? "mute" : "unMute");
      saveReelsMutedPreference(next);
      logPlayerControl(next ? "mute" : "unmute", next);
      return next;
    });
  }

  function togglePlayButton(event, index) {
    stopPlayerEvent(event);
    if (index !== activeIndex) return;
    togglePlayPause(null, index);
  }

  function beginFastPlayback(event, index) {
    stopPlayerEvent(event);
    if (index !== activeIndex) return;
    setSpeeding(true);
    sendYouTubeCommand(index, "setPlaybackRate", [2]);
    logPlayerControl("2x-start");
  }

  function endFastPlayback(event, index) {
    if (event) stopPlayerEvent(event);
    if (index !== activeIndex) return;
    setSpeeding(false);
    sendYouTubeCommand(index, "setPlaybackRate", [1]);
    logPlayerControl("2x-end");
  }

  function reelSocialPayload(reel, item, extra = {}) {
    const videoId = getYouTubeVideoId(reel);
    return {
      user_id: userId,
      reel_key: reelIdentity(reel),
      item_key: keyOf(item),
      media_type: mediaType(item),
      tmdb_id: item?.id || null,
      title: titleOf(item),
      source: reel.source || reelSourceFromUrl("", reel.sourceUrl || reel.watchUrl || reel.embedUrl || "") || "youtube",
      source_video_id: videoId || reel.sourceVideoId || reel.source_video_id || null,
      source_url: reel.sourceUrl || reel.source_url || reel.watchUrl || reel.watch_url || reel.embedUrl || reel.embed_url || "",
      created_at: new Date().toISOString(),
      ...extra
    };
  }

  async function saveReelSocialRemote(table, payload, actionLabel) {
    if (!supabase || !userId || userId === "guest" || disabledReelSocialTablesRef.current.has(table)) return;
    try {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    } catch (error) {
      if (["404", "PGRST205", "PGRST202"].includes(String(error?.code || "")) || /not found|schema cache|does not exist/i.test(String(error?.message || ""))) {
        disabledReelSocialTablesRef.current.add(table);
      }
      const key = `${table}:${error?.code || error?.message || "unknown"}`;
      if (!reelSocialWarnedRef.current.has(key)) {
        reelSocialWarnedRef.current.add(key);
        console.warn("MovieGram reel social save skipped", {
          table,
          action: actionLabel,
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint
        });
      }
    }
  }

  function toggleReelLike(event, reel, item) {
    stopPlayerEvent(event);
    const identity = reelIdentity(reel);
    const wasLiked = Boolean(reelLikes[identity]);
    setReelLikes((current) => {
      const next = { ...current };
      if (next[identity]) {
        delete next[identity];
      } else {
        next[identity] = { likedAt: new Date().toISOString(), item_key: keyOf(item), source: reel.source || "youtube" };
      }
      saveReelLikes(next);
      return next;
    });
    if (!wasLiked) {
      setHeartBurst(identity);
      if (typeof window !== "undefined") window.setTimeout(() => setHeartBurst((value) => value === identity ? "" : value), 700);
      onReelActivity?.("reel_liked", item, { reelId: identity, source: reel.source || "youtube" });
      saveReelSocialRemote("reel_likes", reelSocialPayload(reel, item), "reel_liked");
    }
  }

  function shareReel(event, reel, item) {
    stopPlayerEvent(event);
    const url = reel.watchUrl || reel.sourceUrl || (typeof window !== "undefined" ? window.location.href : "");
    const title = `${titleOf(item)} on MovieGram`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard && url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    onReelActivity?.("reel_shared", item, { reelId: reelIdentity(reel), source: reel.source || "youtube" });
    saveReelSocialRemote("reel_shares", reelSocialPayload(reel, item, { share_url: url }), "reel_shared");
  }

  function openReelComments(event, reel, item) {
    stopPlayerEvent(event);
    setCommentReel({ reel, item });
    setCommentText("");
  }

  function openReelDetails(event, reel, item) {
    stopPlayerEvent(event);
    setIsPlaying(false);
    sendYouTubeCommand(activeIndex, "pauseVideo");
    onReelActivity?.("details_open", item, {
      reelId: reelIdentity(reel),
      source: reel.source || reelSourceFromUrl("", reel.sourceUrl || reel.watchUrl || reel.embedUrl || "") || "youtube",
      poster_path: item?.poster_path || "",
      item_key: keyOf(item)
    });
    onOpen?.(item, { source: "reels", reelId: reelIdentity(reel) });
  }

  function submitReelComment(event) {
    event.preventDefault();
    if (!commentReel || !commentText.trim()) return;
    const identity = reelIdentity(commentReel.reel);
    const nextComment = {
      id: `${identity}:${Date.now()}`,
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    };
    setReelComments((current) => {
      const next = { ...current, [identity]: [...(current[identity] || []), nextComment].slice(-50) };
      saveReelComments(next);
      return next;
    });
    onReelActivity?.("reel_commented", commentReel.item, { reelId: identity, source: commentReel.reel.source || "youtube" });
    saveReelSocialRemote("reel_comments", reelSocialPayload(commentReel.reel, commentReel.item, {
      comment_text: nextComment.text,
      body: nextComment.text
    }), "reel_commented");
    setCommentText("");
  }

  function markYouTubeEmbedFailed(videoId, failureKey) {
    if (!videoId || failedYouTubeVideoIdsRef.current.has(videoId)) return;
    failedYouTubeVideoIdsRef.current.add(videoId);
    console.warn(`YouTube embed failed/unavailable: videoId=${videoId}, skipping.`);
    setFailedEmbeds((current) => ({ ...current, [failureKey]: true }));
    setReels((current) => current.filter((entry) => getYouTubeVideoId(entry) !== videoId));
    setActiveIndex((current) => Math.max(0, Math.min(current, Math.max(0, visibleReels.length - 2))));
  }

  function reelFailureKey(reel = {}) {
    const source = reelSourceFromUrl(reel.source || "", reel.sourceUrl || reel.watchUrl || reel.embedUrl || "");
    return `${source}:${reel.sourceUrl || reel.watchUrl || reel.embedUrl || reel.id}`;
  }

  function strongVerticalReelSignal(reel = {}) {
    const explicitMode = String(reel.aspectMode || reel.aspect_mode || "").toLowerCase();
    if (explicitMode.includes("vertical")) return { strong: true, reason: "manual/metadata vertical" };
    const text = `${reel.contentFormat || ""} ${reel.content_format || ""} ${reel.kind || ""} ${reel.label || ""} ${reel.videoTitle || ""} ${reel.video_title || ""} ${reel.sourceUrl || ""} ${reel.watchUrl || ""} ${reel.embedUrl || ""}`.toLowerCase();
    if (text.includes("/shorts/")) return { strong: true, reason: "shorts url" };
    if (text.includes("#shorts") || text.includes("#reels")) return { strong: true, reason: "hashtag" };
    const format = reelContentFormat(reel);
    if (["short", "reel"].includes(format)) return { strong: true, reason: "content format" };
    if (/\bshorts?\b/.test(text) || /\breels?\b/.test(text)) return { strong: true, reason: "title/label" };
    return { strong: false, reason: "" };
  }

  function resolveReelLayout(reel = {}, videoId = "") {
    const explicitMode = String(reel.aspectMode || reel.aspect_mode || "").toLowerCase();
    if (explicitMode.includes("vertical")) return { mode: "vertical-cover", reason: "manual/metadata vertical", strongVertical: true };
    if (explicitMode.includes("horizontal")) return { mode: "horizontal-contain", reason: "manual/metadata horizontal", strongVertical: false };
    if (explicitMode.includes("unknown")) return { mode: "unknown-contain", reason: "manual/metadata unknown", strongVertical: false };
    const strongVertical = strongVerticalReelSignal(reel);
    if (strongVertical.strong) return { mode: "vertical-cover", reason: strongVertical.reason, strongVertical: true };
    const remembered = reelAspectModes[videoId];
    const rememberedMode = typeof remembered === "string" ? remembered : remembered?.mode;
    if (rememberedMode) return { mode: rememberedMode, reason: "thumbnail dimensions", strongVertical: rememberedMode.includes("vertical") };
    const format = reelContentFormat(reel);
    if (["teaser", "featurette", "behind_the_scenes", "trailer"].includes(format)) return { mode: "horizontal-contain", reason: "format", strongVertical: false };
    return { mode: "unknown-contain", reason: "safe unknown", strongVertical: false };
  }

  function estimateReelAspectMode(reel = {}, videoId = "") {
    return resolveReelLayout(reel, videoId).mode;
  }

  function reelContentFormat(reel = {}) {
    const text = `${reel.contentFormat || ""} ${reel.content_format || ""} ${reel.kind || ""} ${reel.label || ""} ${reel.videoTitle || ""} ${reel.video_title || ""} ${reel.sourceUrl || ""} ${reel.watchUrl || ""}`.toLowerCase();
    if (text.includes("/shorts/") || /\bshorts?\b/.test(text)) return "short";
    if (text.includes("instagram reel") || text.includes("facebook reel") || /\breels?\b/.test(text)) return "reel";
    if (text.includes("scene") || text.includes("edit")) return "scene_edit";
    if (text.includes("clip")) return "clip";
    if (text.includes("teaser")) return "teaser";
    if (text.includes("featurette")) return "featurette";
    if (text.includes("behind the scenes") || text.includes("bts")) return "behind_the_scenes";
    if (text.includes("trailer")) return "trailer";
    return "unknown";
  }

  function reelAspectReason(reel = {}, aspectMode = "") {
    const format = reelContentFormat(reel);
    if (reel.aspectMode || reel.aspect_mode) return "metadata";
    const layoutReason = resolveReelLayout(reel, getYouTubeVideoId(reel)).reason;
    if (layoutReason) return layoutReason;
    if (reelAspectModes[getYouTubeVideoId(reel)]) return "thumbnail";
    if (["short", "reel"].includes(format)) return "short/reel signal";
    if (format !== "unknown") return "format";
    return "safe unknown";
  }

  function aspectModeForReel(reel = {}) {
    const videoId = getYouTubeVideoId(reel);
    return videoId ? estimateReelAspectMode(reel, videoId) : "unknown-contain";
  }

  function aspectModeClassForReel(reel = {}) {
    return aspectModeForReel(reel).replace("-cover", "").replace("-contain", "");
  }

  function aspectModeLabelForReel(reel = {}) {
    const mode = aspectModeForReel(reel);
    if (mode.includes("vertical")) return "VERTICAL";
    if (mode.includes("horizontal")) return "HORIZONTAL";
    return "UNKNOWN";
  }

  function rememberThumbnailAspect(videoId, event) {
    if (!videoId) return;
    const image = event.currentTarget;
    if (!image.naturalWidth || !image.naturalHeight) return;
    const activeReel = visibleReels.find((entry) => getYouTubeVideoId(entry) === videoId);
    const nextMode = strongVerticalReelSignal(activeReel).strong ? "vertical-cover" : (image.naturalHeight > image.naturalWidth ? "vertical-cover" : "horizontal-contain");
    const natural = `${image.naturalWidth}x${image.naturalHeight}`;
    setReelAspectModes((current) => {
      const existing = current[videoId];
      if (existing?.mode === nextMode && existing?.natural === natural) return current;
      return { ...current, [videoId]: { mode: nextMode, natural } };
    });
  }

  function renderReelMedia(reel, item, index, active) {
    const source = reelSourceFromUrl(reel.source || "", reel.sourceUrl || reel.watchUrl || reel.embedUrl || "");
    const youtubeVideoId = getYouTubeVideoId(reel);
    const isYouTube = isYouTubeReel(reel) && youtubeVideoId;
    const failureKey = reelFailureKey(reel);
    const aspectMode = isYouTube ? estimateReelAspectMode(reel, youtubeVideoId) : "vertical-cover";
    const aspectFormat = reelContentFormat(reel);
    const aspectReason = reelAspectReason(reel, aspectMode);
    const thumbnail = isYouTube
      ? (reel.thumbnailUrl || `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`)
      : (reel.thumbnailUrl || backdropUrl(item.backdrop_path || item.poster_path));
    if (active && isYouTube) {
      const rememberedAspect = reelAspectModes[youtubeVideoId];
      const natural = typeof rememberedAspect === "object" ? rememberedAspect.natural : "unknown";
      const strongVertical = resolveReelLayout(reel, youtubeVideoId).strongVertical;
      const layoutLogKey = `${youtubeVideoId}:${aspectMode}:${aspectFormat}:${aspectReason}:${natural}:${strongVertical}`;
      if (reelLayoutLogRef.current !== layoutLogKey) {
        reelLayoutLogRef.current = layoutLogKey;
        console.info(`Reel layout final: videoId=${youtubeVideoId}, mode=${aspectMode}, strongVertical=${strongVertical}, reason=${aspectReason}, thumbnail=${natural}.`);
      }
    }
    const preview = (
      <img
        className={`mg2-reel-bg${["horizontal-contain", "unknown-contain"].includes(aspectMode) ? " blurred" : ""}`}
        src={thumbnail}
        alt=""
        loading={index <= activeIndex + 2 ? "eager" : "lazy"}
        onLoad={(event) => { if (isYouTube) rememberThumbnailAspect(youtubeVideoId, event); }}
        onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }}
      />
    );
    if (detailsOpen || !active || reel.isFallbackPreview || failedEmbeds[failureKey] || (youtubeVideoId && failedYouTubeVideoIdsRef.current.has(youtubeVideoId))) return preview;

    if (isYouTube) {
      const src = buildYouTubeEmbedUrl(youtubeVideoId, isMuted);
      const playerKey = youtubePlayerKey(youtubeVideoId);
      const loaded = Boolean(loadedPlayers[playerKey]);
      const rendering = loaded ? "YOUTUBE" : "YOUTUBE_LOADING";
      const logKey = `${source}:${youtubeVideoId}:${rendering}`;
      if (activePlayerLogRef.current !== logKey) {
        activePlayerLogRef.current = logKey;
        console.info(`Active reel player: source=youtube, videoId=${youtubeVideoId}, rendering=${rendering}.`);
      }
      return (
        <>
          {preview}
          <div className={`mg2-reel-player-frame ${aspectMode}`}>
            <iframe
              key={playerKey}
              ref={(node) => { iframeRefs.current[index] = node; }}
              className={`mg2-reel-player mg2-reel-player-youtube${loaded ? " loaded" : ""}`}
              src={src}
              title={reel.videoTitle || titleOf(item)}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading={index === 0 ? "eager" : "lazy"}
              onLoad={() => {
                setLoadedPlayers((current) => ({ ...current, [playerKey]: true }));
                sendYouTubeCommand(index, isPlaying ? "playVideo" : "pauseVideo");
                sendYouTubeCommand(index, isMuted ? "mute" : "unMute");
                sendYouTubeCommand(index, "setPlaybackRate", [speeding ? 2 : 1]);
              }}
              onError={() => markYouTubeEmbedFailed(youtubeVideoId, failureKey)}
            />
          </div>
        </>
      );
    }

    if ((source === "facebook" || source === "instagram") && reel.embedUrl) {
      return (
        <iframe
          className={`mg2-reel-player mg2-reel-player-${source}`}
          src={reel.embedUrl}
          title={reel.videoTitle || titleOf(item)}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading={index === 0 ? "eager" : "lazy"}
          onError={() => setFailedEmbeds((current) => ({ ...current, [failureKey]: true }))}
        />
      );
    }

    if (source === "instagram" && reel.embedHtml) {
      return <div className="mg2-reel-embed-html" dangerouslySetInnerHTML={{ __html: reel.embedHtml }} />;
    }

    return preview;
  }

  async function handleSubmitReelLink(event) {
    event.preventDefault();
    if (!canSubmitReels) {
      setSubmitStatus("Sign in to submit a reel link.");
      return;
    }
    if (!selectedSubmitItem) {
      setSubmitStatus("Select a movie or show for this reel.");
      return;
    }
    setSubmittingReel(true);
    setSubmitStatus("");
    const result = await submitExternalReelLink({
      item: selectedSubmitItem,
      url: submitUrl,
      reason: submitReason,
      userId,
      approved: isReelAdmin
    });
    setSubmittingReel(false);
    setSubmitStatus(result.error || result.success || "Saved.");
    if (!result.error) {
      setSubmitUrl("");
      setSubmitReason("");
      setSubmitQuery("");
      setSubmitItemKey("");
    }
  }

  async function runAdminDiscovery(action = "discover", candidateId = "") {
    if (!canOpenReelAdmin) return;
    setAdminLoading(true);
    setAdminResult(null);
    const lines = adminInput.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const body = {
      action,
      source: adminSource,
      target: Number(adminTarget) || 25,
      dryRun: adminDryRun
    };
    if (candidateId) body.candidateId = candidateId;
    if (adminSource === "manual") body.urls = lines.map((line) => {
      const [url, title, tmdbId, mediaTypeValue, contentFormat, aspectMode, label] = line.split("|").map((part) => part.trim());
      return title || tmdbId || mediaTypeValue || contentFormat || aspectMode || label
        ? { url, title, tmdb_id: tmdbId ? Number(tmdbId) : undefined, media_type: mediaTypeValue || undefined, content_format: contentFormat || undefined, aspect_mode: aspectMode || undefined, label: label || undefined }
        : url;
    });
    if (adminSource === "youtube") body.queries = lines;
    if (action.startsWith("enrich_")) {
      body.items = adminItemsForAction(action);
      body.targetPerItem = 5;
      body.maxItems = 100;
      body.preferNonTrailers = true;
      body.youtubeSearchBudget = 5;
    }
    try {
      const response = await fetch("/api/admin/reel-discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret
        },
        body: JSON.stringify(body)
      });
      const result = await response.json().catch(() => ({}));
      setAdminResult({
        ...result,
        ok: response.ok,
        status: response.status,
        message: response.ok ? "" : result.error || "Admin discovery request failed."
      });
      if (Object.prototype.hasOwnProperty.call(result, "discoveryReady")) setDiscoveryReady(Boolean(result.discoveryReady));
    } catch (error) {
      setAdminResult({ ok: false, errors: [error.message || "Admin discovery request failed."] });
    } finally {
      setAdminLoading(false);
    }
  }

  function adminItemsForAction(action) {
    const compact = (item) => {
      const normalized = { ...item, media_type: mediaType(item) };
      return {
        id: normalized.id,
        tmdb_id: normalized.id,
        media_type: normalized.media_type,
        item_key: keyOf(normalized),
        title: normalized.title || "",
        name: normalized.name || "",
        poster_path: normalized.poster_path || "",
        backdrop_path: normalized.backdrop_path || "",
        release_date: normalized.release_date || "",
        first_air_date: normalized.first_air_date || "",
        year: yearOf(normalized),
        vote_average: normalized.vote_average || null
      };
    };
    if (action === "enrich_watched_reels") return watchedReels.map(compact);
    if (action === "enrich_watchlist_reels") return watchlistReels.map(compact);
    if (action === "enrich_favorite_reels") return favoriteReels.map(compact);
    if (action === "enrich_friend_reels") return friendActivityItems.map(compact);
    return [];
  }

  async function runAdminCandidateAction(action, candidateId, extra = {}) {
    if (!candidateId) return;
    setAdminLoading(true);
    try {
      const response = await fetch("/api/admin/reel-discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret
        },
        body: JSON.stringify({ action, candidateId, dryRun: true, ...extra })
      });
      const result = await response.json().catch(() => ({}));
      setAdminResult({ ...result, ok: response.ok, status: response.status });
    } catch (error) {
      setAdminResult({ ok: false, errors: [error.message || "Candidate action failed."] });
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <section className="mg2-reel-screen">
      <div className={`mg2-reel-head${activeIndex > 0 ? " hidden" : ""}`}>
        <h2>Reels</h2>
        <div className="mg2-reel-tabs" aria-label="Reel feed filters">
          {reelTabs.map((tab) => <button key={tab.id} className={reelTab === tab.id ? "active" : ""} type="button" onClick={() => setReelTab(tab.id)}>{tab.label}</button>)}
        </div>
      </div>
      {canOpenReelAdmin && (
        <div className="mg2-reel-admin-entry">
          <button className="mg2-reel-add-link" type="button" onClick={() => setAdminOpen(true)}>Reels Admin</button>
        </div>
      )}
      {reelError && <div className="mg2-reel-notice">{reelError}</div>}
      {loadingReels && visibleReels.length === 0 ? (
        <div className="mg2-reel-empty">Loading reels...</div>
      ) : visibleReels.length === 0 ? (
        <div className="mg2-reel-empty">{reelEmptyMessage()}</div>
      ) : (
        <div className="mg2-reel-stack">
          {visibleReels.map((reel, index) => {
            const item = { ...reel.item, media_type: mediaType(reel.item) };
            const itemKey = keyOf(item);
            const saved = Boolean(watchlist[itemKey]);
            const watchedTitle = Boolean(watched[itemKey]);
            const reelLiked = Boolean(reelLikes[reelIdentity(reel)]);
            const active = activeIndex === index;
            const youtubeVideoId = getYouTubeVideoId(reel);
            const isPlayableYouTube = Boolean(active && isYouTubeReel(reel) && youtubeVideoId && !reel.isFallbackPreview);
            const typeCapsule = reelTypeLabel(reel);
            return (
              <article
                key={`${reel.id}-${itemKey}`}
                className="mg2-reel-card"
                data-index={index}
                ref={(node) => { reelRefs.current[index] = node; }}
                onClick={(event) => togglePlayPause(event, index)}
              >
                {renderReelMedia(reel, item, index, active)}
                {heartBurst === reelIdentity(reel) && <span className="mg2-reel-heart-burst"><Icon name="heart" /></span>}
                {speeding && index === activeIndex && <span className="mg2-reel-speed">2x</span>}
                {isPlayableYouTube && (
                  <div className={`mg2-reel-controls ${isPlaying ? "playing" : "paused"}`} onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={(event) => toggleMute(event, index)} aria-label={isMuted ? "Unmute reel" : "Mute reel"}><Icon name={isMuted ? "muted" : "volume"} /></button>
                    <button type="button" onClick={(event) => togglePlayButton(event, index)} aria-label={isPlaying ? "Pause reel" : "Play reel"}><Icon name={isPlaying ? "pause" : "play"} /></button>
                    <button
                      type="button"
                      className={`mg2-reel-speed-hold${speeding ? " active" : ""}`}
                      onPointerDown={(event) => beginFastPlayback(event, index)}
                      onPointerUp={(event) => endFastPlayback(event, index)}
                      onPointerCancel={(event) => endFastPlayback(event, index)}
                      onPointerLeave={(event) => endFastPlayback(event, index)}
                      onTouchStart={(event) => beginFastPlayback(event, index)}
                      onTouchEnd={(event) => endFastPlayback(event, index)}
                      onTouchCancel={(event) => endFastPlayback(event, index)}
                      aria-label="Hold for 2x playback"
                    >2x</button>
                  </div>
                )}
                <div className="mg2-reel-actions">
                  <button className={reelLiked ? "active liked" : ""} type="button" onClick={(event) => toggleReelLike(event, reel, item)} aria-label={reelLiked ? "Unlike reel" : "Like reel"}><Icon name="heart" /></button><span>{reelLiked ? "Liked" : "Like"}</span>
                  <button className={saved ? "active" : ""} type="button" onClick={(event) => { stopPlayerEvent(event); onWatchlist(item); }} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><Icon name="bookmark" /></button><span>{saved ? "Saved" : "List"}</span>
                  <button className={watchedTitle ? "active" : ""} type="button" disabled={!watchedTitle && !isReleased(item)} onClick={(event) => { stopPlayerEvent(event); onWatched?.(item); }} aria-label={watchedTitle ? "Mark unwatched" : isReleased(item) ? "Mark watched" : releaseMessage(item)}><Icon name="check" /></button><span>{watchedTitle ? "Seen" : isReleased(item) ? "Watch" : "Soon"}</span>
                  <button className="mg2-reel-details-button" type="button" onClick={(event) => openReelDetails(event, reel, item)} aria-label={`Open details for ${titleOf(item)}`}><Icon name="play" /></button><span>Details</span>
                  <button type="button" onClick={(event) => openReelComments(event, reel, item)} aria-label={`Open reel comments for ${titleOf(item)}`}><Icon name="chat" /></button><span>Reviews</span>
                  <button type="button" onClick={(event) => shareReel(event, reel, item)} aria-label="Share placeholder"><Icon name="send" /></button><span>Share</span>
                </div>
                {reel.watchUrl && <a className={`mg2-youtube-watermark ${reel.source || "youtube"}`} href={reel.watchUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} aria-label={`Open on ${sourceWatermarkLabel(reel.source)}`}>{sourceWatermarkLabel(reel.source)}</a>}
                <div className="mg2-reel-copy">
                  <b>{reel.reason}</b>
                  {typeCapsule && <em className={typeCapsule.toLowerCase().includes("trailer") ? "trailer" : ""}>{typeCapsule}</em>}
                  <h2>{titleOf(item)}</h2>
                  <p><Avatar friend={friends[index % friends.length]} size="sm" /> <strong>{reel.channelTitle || sourceWatermarkLabel(reel.source)}</strong></p>
                  <div className="mg2-reel-meta">
                    <span>{mediaType(item) === "tv" ? "TV Show" : "Movie"}</span>
                    <span>{item.vote_average ? item.vote_average.toFixed(1) : "NR"}/10</span>
                    <span>{yearOf(item)}</span>
                  </div>
                  <small>{reel.videoTitle || (reel.isFallbackPreview ? (reelError || "Title preview from MovieGram.") : "Title preview from MovieGram.")}</small>
                </div>
              </article>
            );
          })}
          {reelCandidates.length > pageSize && (
            <article className="mg2-reel-card mg2-reel-load-more">
              <button type="button" onClick={() => setPageSize((current) => current + 5)}>Load more reels</button>
            </article>
          )}
        </div>
      )}
      {commentReel && (
        <div className="mg2-reel-comments-sheet" role="dialog" aria-modal="true" aria-label="Reel comments" onClick={(event) => event.stopPropagation()}>
          <div>
            <strong>Comments</strong>
            <button type="button" onClick={() => setCommentReel(null)}>Close</button>
          </div>
          <div className="mg2-reel-comments-list">
            {(reelComments[reelIdentity(commentReel.reel)] || []).length ? (
              reelComments[reelIdentity(commentReel.reel)].map((comment) => (
                <article key={comment.id}>
                  <Avatar friend={friends[0]} size="sm" />
                  <span><b>You</b><small>{comment.text}</small></span>
                </article>
              ))
            ) : <p>No comments yet. Start the conversation.</p>}
          </div>
          <form onSubmit={submitReelComment}>
            <input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment..." />
            <button type="submit" disabled={!commentText.trim()}>Post</button>
          </form>
        </div>
      )}
      {submitOpen && (
        <div className="mg2-reel-submit" role="dialog" aria-modal="true" aria-label="Add reel link">
          <form onSubmit={handleSubmitReelLink}>
            <div>
              <strong>Add Reel Link</strong>
              <button type="button" onClick={() => setSubmitOpen(false)} aria-label="Close add reel link">Close</button>
            </div>
            <input value={submitUrl} onChange={(event) => setSubmitUrl(event.target.value)} placeholder="Paste Instagram or YouTube URL" />
            <input value={submitQuery} onChange={(event) => { setSubmitQuery(event.target.value); setSubmitItemKey(""); }} placeholder="Search linked movie or show" />
            <div className="mg2-reel-submit-results">
              {submitMatches.map((item) => (
                <button key={keyOf(item)} className={keyOf(item) === keyOf(selectedSubmitItem || {}) ? "active" : ""} type="button" onClick={() => setSubmitItemKey(keyOf(item))}>
                  <img src={posterUrl(item.poster_path, "w92")} alt="" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                  <span><b>{titleOf(item)}</b><small>{mediaType(item) === "tv" ? "TV" : "Movie"} · {yearOf(item)}</small></span>
                </button>
              ))}
            </div>
            <input value={submitReason} onChange={(event) => setSubmitReason(event.target.value)} placeholder="Optional reason or label" />
            {submitStatus && <p>{submitStatus}</p>}
            <button type="submit" disabled={submittingReel}>{submittingReel ? "Saving..." : isReelAdmin ? "Save Approved" : "Submit for Review"}</button>
          </form>
        </div>
      )}
      {adminOpen && (
        <div className="mg2-reel-submit" role="dialog" aria-modal="true" aria-label="Reels Admin">
          <form onSubmit={(event) => { event.preventDefault(); runAdminDiscovery("discover"); }}>
            <div>
              <strong>Reels Admin</strong>
              <button type="button" onClick={() => setAdminOpen(false)} aria-label="Close Reels Admin">Close</button>
            </div>
            <small>Requires server ADMIN_BACKFILL_SECRET. Discovery writes candidates only unless promotion is explicitly run.</small>
            <small>{discoveryReady === null ? "Discovery DB status unknown" : discoveryReady ? "Discovery DB ready" : "Run SQL first"}</small>
            {adminResult?.tables && (
              <div className="mg2-reel-admin-dashboard">
                <span><b>{adminResult.tables.reel_cache_count ?? "-"}</b><small>Playable cache</small></span>
                <span><b>{adminResult.tables.reel_candidates_count ?? "-"}</b><small>Candidates</small></span>
                <span><b>{adminResult.tables.discovery_jobs_count ?? "-"}</b><small>Jobs</small></span>
                <span className={adminResult.tables.social_tables_ready ? "ready" : "warn"}><b>{adminResult.tables.social_tables_ready ? "Ready" : "Local"}</b><small>Reel social</small></span>
              </div>
            )}
            <input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} placeholder="Admin secret for this request" autoComplete="off" />
            <select value={adminSource} onChange={(event) => setAdminSource(event.target.value)}>
              <option value="manual">Manual URLs</option>
              <option value="tmdb">TMDB official videos</option>
              <option value="youtube">YouTube Search candidates</option>
            </select>
            <textarea
              value={adminInput}
              onChange={(event) => setAdminInput(event.target.value)}
              placeholder={adminSource === "manual" ? "One URL per line. Optional: url | title | tmdb_id | media_type | content_format | aspect_mode | label" : adminSource === "youtube" ? "One search query per line" : "TMDB mode ignores this field"}
              rows={5}
            />
            <label>
              <span>Target</span>
              <input type="number" min="1" max="100" value={adminTarget} onChange={(event) => setAdminTarget(event.target.value)} />
            </label>
            <label className="mg2-profile-privacy-toggle">
              <span>Dry run</span>
              <input type="checkbox" checked={adminDryRun} onChange={(event) => setAdminDryRun(event.target.checked)} />
            </label>
            <div className="mg2-reel-admin-actions">
              <button type="button" disabled={adminLoading} onClick={() => runAdminDiscovery("check_db")}>Check DB readiness</button>
              <button type="submit" disabled={adminLoading}>{adminLoading ? "Running..." : "Run discovery"}</button>
              <button type="button" disabled={adminLoading} onClick={() => runAdminDiscovery("enrich_watched_reels")}>Enrich watched reels</button>
              <button type="button" disabled={adminLoading} onClick={() => runAdminDiscovery("enrich_watchlist_reels")}>Enrich watchlist reels</button>
              <button type="button" disabled={adminLoading} onClick={() => runAdminDiscovery("enrich_favorite_reels")}>Enrich favorite reels</button>
              <button type="button" disabled={adminLoading} onClick={() => runAdminDiscovery("enrich_friend_reels")}>Enrich friend reels</button>
              <button type="button" disabled={adminLoading} onClick={() => runAdminDiscovery("list_pending")}>List pending</button>
              <button type="button" disabled={adminLoading || adminDryRun} onClick={() => runAdminDiscovery("promote_top_safe")}>Promote top safe candidates</button>
            </div>
            {adminResult && (
              <div className="mg2-reel-admin-result">
                <strong>{adminResult.ok === false ? "Request failed" : "Result"}</strong>
                {adminResult.message && <small>{adminResult.message}</small>}
                <small>itemsSent={adminResult.itemsSent ?? "-"} checked={adminResult.checkedItems || adminResult.checked || 0} underfilled={adminResult.underfilledItems || 0} candidates={adminResult.candidatesFound || adminResult.candidates?.length || 0} saved={adminResult.savedCandidates || 0} promoted={adminResult.promotedToCache || 0} skipped={adminResult.skippedDuplicates || 0} rejected={adminResult.rejectedLowRelevance || 0} wrongSequel={adminResult.rejectedWrongSequel || 0} youtubeSearches={adminResult.youtubeSearches || 0} dryRun={String(Boolean(adminResult.dryRun))}</small>
                {Array.isArray(adminResult.firstTitles) && adminResult.firstTitles.length > 0 && <small>firstTitles={adminResult.firstTitles.join(", ")}</small>}
                {adminResult.discoveryReady !== undefined && <small>{adminResult.discoveryReady ? "Discovery DB ready" : "Run SQL first"}</small>}
                {Array.isArray(adminResult.perItemCoverage) && adminResult.perItemCoverage.length > 0 && (
                  <div className="mg2-reel-admin-coverage">
                    {adminResult.perItemCoverage.slice(0, 12).map((entry) => (
                      <small key={entry.item_key || entry.title}>{entry.title}: cached={entry.cachedReels} trailers={entry.trailers} nonTrailers={entry.nonTrailers} {entry.needsMore ? "needs more" : "covered"}</small>
                    ))}
                  </div>
                )}
                {Array.isArray(adminResult.promotedList) && adminResult.promotedList.length > 0 && (
                  <div className="mg2-reel-admin-coverage">
                    {adminResult.promotedList.slice(0, 12).map((entry) => (
                      <small key={`${entry.item_key}-${entry.video_title}`}>promoted: {entry.title} - {entry.video_title} ({entry.source || "source"}, {entry.format || "unknown"}, {entry.aspect_mode || "unknown"}, score {Math.round(Number(entry.score || 0))})</small>
                    ))}
                  </div>
                )}
                {(adminResult.errors || []).map((error, index) => <small key={`${error}-${index}`}>{error}</small>)}
                {(adminResult.candidates || []).slice(0, 12).map((candidate) => (
                  <article key={candidate.id || `${candidate.source}-${candidate.source_video_id || candidate.source_url}`}>
                    <span>
                      <b>{candidate.video_title || candidate.title || "Candidate"}</b>
                      <small>{candidate.source} - {candidate.channel_title || candidate.creator_username || "unknown channel"} - {candidate.label || candidate.content_format || "unknown"} - aspect {candidate.aspect_mode || "unknown"}</small>
                      <small>score {Math.round(Number(candidate.quality_score || 0))} match {Math.round(Number(candidate.match_score || 0))}{candidate.rejection_reason ? ` - ${candidate.rejection_reason}` : ""}</small>
                    </span>
                    {candidate.id && (
                      <div>
                        <button type="button" disabled={adminLoading} onClick={() => runAdminCandidateAction("approve", candidate.id)}>Approve</button>
                        <button type="button" disabled={adminLoading} onClick={() => runAdminCandidateAction("promote", candidate.id)}>Promote</button>
                        <button type="button" disabled={adminLoading} onClick={() => runAdminCandidateAction("reject", candidate.id)}>Reject</button>
                        <button type="button" disabled={adminLoading} onClick={() => runAdminCandidateAction("update_reel_aspect", candidate.id, { aspect_mode: "vertical", content_format: candidate.content_format || "short", source_video_id: candidate.source_video_id, sourceUrl: candidate.source_url || candidate.watch_url || candidate.embed_url })}>Vertical</button>
                        <button type="button" disabled={adminLoading} onClick={() => runAdminCandidateAction("update_reel_aspect", candidate.id, { aspect_mode: "horizontal", source_video_id: candidate.source_video_id, sourceUrl: candidate.source_url || candidate.watch_url || candidate.embed_url })}>Horizontal</button>
                        <button type="button" disabled={adminLoading} onClick={() => runAdminCandidateAction("update_reel_aspect", candidate.id, { aspect_mode: "unknown", source_video_id: candidate.source_video_id, sourceUrl: candidate.source_url || candidate.watch_url || candidate.embed_url })}>Unknown</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </form>
        </div>
      )}
    </section>
  );
}

function LogScreen({ rows, watchlist = {}, watched = {}, ratings = {}, favorites = {}, customLists = {}, onOpen, onOpenDiary }) {
  const [logTab, setLogTab] = useState("watchlist");
  const [logQuery, setLogQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const watchedCollection = normalizeTrackingCollection(watched);
  const saved = Object.values(enforceWatchExclusivity(normalizeTrackingCollection(watchlist), watchedCollection));
  const watchAsapItems = saved.filter((item) => item.watch_asap || item.watchAsap);
  const watchedItems = Object.values(watchedCollection).filter((item) => isReleased(item));
  const favoriteItems = Object.values(favorites);
  const userListCards = Object.values(customLists || {}).map((list) => ({ ...list, subtitle: "Custom list", items: list.items || [] }));
  const listCards = userListCards.length ? userListCards : [
    { id: "weekend", title: "Weekend Watch Party", subtitle: "Create your own lists from Details", items: dedupe([...(rows.trending || []), ...fallbackRows.trending]).slice(0, 3) }
  ];
  const logTabs = [
    { id: "watchlist", label: "Watchlist" },
    { id: "watched", label: "Watched" },
    { id: "lists", label: "Lists" },
    { id: "favorites", label: "Favorites" }
  ];
  const sourceItems = logTab === "watchlist"
    ? (saved.length ? saved : dedupe([...(rows.trending || []), ...fallbackRows.trending]))
    : logTab === "watched"
      ? (watchedItems.length ? watchedItems : dedupe([...(rows.movies || []), ...fallbackRows.movies]))
      : favoriteItems;
  const filteredItems = sourceItems.filter((item) => {
    const searchable = `${titleOf(item)} ${item.overview || ""}`.toLowerCase();
    const queryMatch = titleOf(item).toLowerCase().includes(logQuery.trim().toLowerCase());
    const typeMatch = typeFilter === "all" || mediaType(item) === typeFilter;
    const genreMatch = genreFilter === "all" || searchable.includes(genreFilter) || (genreFilter === "anime" && mediaType(item) === "tv");
    return queryMatch && typeMatch && genreMatch;
  });

  return (
    <section className="mg2-log-screen">
      <div className="mg2-log-search">
        <Icon name="search" />
        <input value={logQuery} onChange={(event) => setLogQuery(event.target.value)} placeholder="Search your movies and shows" />
      </div>
      <div className="mg2-log-tabs" aria-label="Log sections">
        {logTabs.map((tab) => <button key={tab.id} className={logTab === tab.id ? "active" : ""} type="button" onClick={() => setLogTab(tab.id)}>{tab.label}</button>)}
      </div>
      <button className="mg2-diary-entry" type="button" onClick={onOpenDiary}>
        <span><strong>Watch Calendar / Diary</strong><small>See your watched history by date</small></span>
        <Icon name="log" />
      </button>
      <div className="mg2-log-filters" aria-label="Log filters">
        <button className={typeFilter === "all" ? "active" : ""} type="button" onClick={() => setTypeFilter("all")}>All</button>
        <button className={typeFilter === "movie" ? "active" : ""} type="button" onClick={() => setTypeFilter("movie")}>Movie</button>
        <button className={typeFilter === "tv" ? "active" : ""} type="button" onClick={() => setTypeFilter("tv")}>TV</button>
        <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} aria-label="Genre filter">
          <option value="all">Genre</option>
          <option value="drama">Drama</option>
          <option value="sci-fi">Sci-Fi</option>
          <option value="anime">Anime</option>
        </select>
      </div>

      {logTab === "lists" ? (
        <div className="mg2-log-lists">
          {listCards.map((list) => (
            <button key={list.id} type="button">
              <span className="mg2-log-list-posters">
                {list.items.map((item) => <img key={keyOf(item)} src={posterUrl(item.poster_path, "w185")} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />)}
              </span>
              <span><strong>{list.title}</strong><small>{list.subtitle}</small></span>
              <em>{list.items.length}</em>
            </button>
          ))}
        </div>
      ) : filteredItems.length ? (
        <>
          {logTab === "watchlist" && watchAsapItems.length > 0 && (
            <section className="mg2-watch-asap-shelf" aria-label="Watch ASAP">
              <div className="mg2-section-head"><h2>Watch ASAP</h2><span>{watchAsapItems.length}</span></div>
              <div className="mg2-watch-asap-row">
                {watchAsapItems.map((item) => (
                  <button key={`log-asap-${keyOf(item)}`} type="button" onClick={() => onOpen(item)}>
                    <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                    <span>{titleOf(item)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="mg2-log-grid">
            {filteredItems.map((item) => {
              const userRating = ratingForItem(item, ratings);
              return <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={hasStoredItem(item, watchlist)} watched={hasStoredItem(item, watched)} rating={userRating} favorite={hasStoredItem(item, favorites)} compact />;
            })}
          </div>
        </>
      ) : (
        <div className="mg2-empty">{logTab === "watchlist" ? "Your watchlist is empty. Save titles from Home, Explore, or Details." : logTab === "watched" ? "Mark titles watched from Details to build your history." : "No titles match your current filters."}</div>
      )}
    </section>
  );
}

function WatchDiaryScreen({ watched = {}, watchlist = {}, ratings = {}, onOpen }) {
  const [diaryTab, setDiaryTab] = useState("calendar");
  const [activityTab, setActivityTab] = useState("watched");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const watchedItems = Object.values(watched)
    .map((item) => ({ ...item, media_type: mediaType(item), rating: ratingForItem(item, ratings) }))
    .sort((a, b) => new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0));
  const watchlistItems = Object.values(watchlist).map((item) => ({ ...item, media_type: mediaType(item), rating: ratingForItem(item, ratings) }));
  const ratedItems = dedupe([...watchedItems, ...watchlistItems])
    .filter((item) => ratingForItem(item, ratings))
    .map((item) => ({ ...item, rating: ratingForItem(item, ratings) }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const monthOptions = [...new Set(watchedItems.map((item) => (item.watchedAt || "").slice(0, 7)).filter(Boolean))];
  const currentMonth = monthOptions[0] || new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const filtered = watchedItems.filter((item) => {
    const typeMatch = typeFilter === "all" || mediaType(item) === typeFilter;
    const ratingMatch = ratingFilter === "all" || (item.rating || 0) >= Number(ratingFilter);
    const monthMatch = !monthFilter || !item.watchedAt || (item.watchedAt || "").startsWith(monthFilter);
    return typeMatch && ratingMatch && monthMatch;
  });
  const monthDate = new Date(`${monthFilter || currentMonth}-01T00:00:00`);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const calendarCells = [
    ...Array.from({ length: firstDay }, (_, index) => ({ id: `blank-${index}`, blank: true })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateKey = `${monthFilter || currentMonth}-${String(day).padStart(2, "0")}`;
      return { id: dateKey, day, items: filtered.filter((item) => (item.watchedAt || "").startsWith(dateKey)) };
    })
  ];
  const grouped = filtered.reduce((acc, item) => {
    let key = "Unknown date";
    if (item.watchedAt) {
      const date = new Date(item.watchedAt);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      const diff = Math.round((todayStart - start) / 86400000);
      key = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier";
    }
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateBadge = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.round((startOfToday - start) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const dayKey = (date) => date.toISOString().slice(0, 10);
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() - (6 - index));
    const count = watchedItems.filter((item) => item.watchedAt && dayKey(new Date(item.watchedAt)) === dayKey(date)).length;
    return {
      id: dayKey(date),
      label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      count,
      hours: Math.round(count * 2.1 * 10) / 10
    };
  });
  const maxDailyHours = Math.max(1, ...lastSevenDays.map((day) => day.hours));
  const totalHours = Math.round(watchedItems.length * 2.1 * 10) / 10;
  const timeBuckets = watchedItems.reduce((acc, item) => {
    const hour = item.watchedAt ? new Date(item.watchedAt).getHours() : 20;
    const bucket = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
  const peakWatchTime = Object.entries(timeBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || "Not enough data";
  const activityItems = activityTab === "ratings"
    ? ratedItems
    : activityTab === "watchlist"
      ? watchlistItems
      : activityTab === "reviews"
        ? ratedItems.filter((item) => item.rating >= 4)
        : watchedItems;
  const activityEmpty = activityTab === "watched"
    ? "Mark titles watched to build activity."
    : activityTab === "ratings"
      ? "Rate titles from Details to fill this lane."
      : activityTab === "watchlist"
        ? "Add titles to your watchlist to fill this lane."
        : "Add ratings or notes to create review activity.";
  const monthLabel = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const empty = watchedItems.length === 0;

  return (
    <section className="mg2-diary-screen">
      <div className="mg2-diary-hero">
        <span>Tracking Hub</span>
        <h3>Your Watch History</h3>
        <p>{empty ? "Mark movies and TV watched to build your personal tracking hub." : `${watchedItems.length} watched, ${watchlistItems.length} saved, ${ratedItems.length} rated.`}</p>
      </div>

      <section className="mg2-tracking-panel">
        <div className="mg2-tracking-head"><h3>Screen Time</h3><small>{totalHours}h total</small></div>
        <div className="mg2-tracking-stats">
          <strong>{totalHours}<small>Hours</small></strong>
          <strong>{watchedItems.length}<small>Watched</small></strong>
          <strong>{peakWatchTime}<small>Peak time</small></strong>
        </div>
        <div className="mg2-week-chart">
          {lastSevenDays.map((day) => (
            <span key={day.id}>
              <i style={{ height: `${day.hours ? Math.max(10, (day.hours / maxDailyHours) * 100) : 4}%` }} />
              <small>{day.label}</small>
              <em>{day.hours}h</em>
            </span>
          ))}
        </div>
      </section>

      <section className="mg2-history-section">
        <div className="mg2-tracking-head"><h3>History</h3><small>Recent watches</small></div>
        {watchedItems.length ? (
          <div className="mg2-history-row">
            {watchedItems.slice(0, 10).map((item) => (
              <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
                <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                <b>{dateBadge(item.watchedAt)}</b>
                <strong>{titleOf(item)}</strong>
                <small>{mediaType(item) === "tv" ? "TV" : "Movie"}{item.rating ? ` - ${formatUserRating(item.rating)}` : ""}</small>
              </button>
            ))}
          </div>
        ) : <div className="mg2-diary-empty"><strong>No history yet</strong><small>Mark something watched to fill your recent history.</small></div>}
      </section>

      <section className="mg2-tracking-activity-section">
        <div className="mg2-tracking-head"><h3>Activity</h3><small>Useful tracking events</small></div>
        <div className="mg2-activity-chips">
          {["watched", "ratings", "reviews", "watchlist"].map((tab) => <button key={tab} className={activityTab === tab ? "active" : ""} type="button" onClick={() => setActivityTab(tab)}>{tab === "ratings" ? "Ratings" : tab === "watchlist" ? "Watchlist" : tab[0].toUpperCase() + tab.slice(1)}</button>)}
        </div>
        <div className="mg2-activity-list">
          {activityItems.slice(0, 6).map((item) => (
            <button key={`${activityTab}-${keyOf(item)}`} type="button" onClick={() => onOpen(item)}>
              <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
              <span>
                <strong>{titleOf(item)}</strong>
                <small>{activityTab === "watchlist" ? "Added to watchlist" : activityTab === "ratings" ? `Rated ${formatUserRating(item.rating)}` : activityTab === "reviews" ? `Strong rating: ${formatUserRating(item.rating)}` : `Watched ${dateBadge(item.watchedAt)}`}</small>
                <em>{mediaType(item) === "tv" ? "TV Show" : "Movie"}{item.watchedAt ? ` - ${new Date(item.watchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</em>
              </span>
              <b>{item.rating ? formatUserRating(item.rating) : dateBadge(item.watchedAt)}</b>
            </button>
          ))}
          {activityItems.length === 0 && <div className="mg2-diary-empty"><strong>No {activityTab} activity</strong><small>{activityEmpty}</small></div>}
        </div>
      </section>

      <div className="mg2-diary-tabs" aria-label="Diary views">
        <button className={diaryTab === "calendar" ? "active" : ""} type="button" onClick={() => setDiaryTab("calendar")}>Calendar</button>
        <button className={diaryTab === "diary" ? "active" : ""} type="button" onClick={() => setDiaryTab("diary")}>Diary</button>
      </div>
      <div className="mg2-diary-filters" aria-label="Diary filters">
        <button className={typeFilter === "all" ? "active" : ""} type="button" onClick={() => setTypeFilter("all")}>All</button>
        <button className={typeFilter === "movie" ? "active" : ""} type="button" onClick={() => setTypeFilter("movie")}>Movie</button>
        <button className={typeFilter === "tv" ? "active" : ""} type="button" onClick={() => setTypeFilter("tv")}>TV</button>
        <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} aria-label="Rating filter">
          <option value="all">Rating</option>
          <option value="8">8+</option>
          <option value="6">6+</option>
          <option value="4">4+</option>
        </select>
        <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} aria-label="Month filter">
          {(monthOptions.length ? monthOptions : [currentMonth]).map((monthValue) => <option key={monthValue} value={monthValue}>{new Date(`${monthValue}-01T00:00:00`).toLocaleString("en-US", { month: "short", year: "numeric" })}</option>)}
        </select>
      </div>

      {empty ? (
        <div className="mg2-diary-empty">
          <strong>No watched history yet</strong>
          <small>Open any Details page and tap Mark Watched. Your calendar and diary will fill from localStorage.</small>
        </div>
      ) : diaryTab === "calendar" ? (
        <div className="mg2-calendar-panel">
          <div className="mg2-calendar-head"><strong>{monthLabel}</strong><small>{filtered.length} watched</small></div>
          <div className="mg2-calendar-week">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
          <div className="mg2-calendar-grid">
            {calendarCells.map((cell) => (
              <button key={cell.id} className={cell.blank ? "blank" : cell.items?.length ? "has-items" : ""} type="button" disabled={cell.blank || !cell.items?.length} onClick={() => cell.items?.[0] && onOpen(cell.items[0])}>
                {!cell.blank && <><strong>{cell.day}</strong>{cell.items?.slice(0, 3).map((item) => <img key={keyOf(item)} src={posterUrl(item.poster_path, "w92")} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />)}</>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mg2-diary-list">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date}>
              <h4>{date}</h4>
              {items.map((item) => (
                <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
                  <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                  <span>
                    <strong>{titleOf(item)}</strong>
                    <small>{mediaType(item) === "tv" ? "TV" : "Movie"} - {item.rating ? formatUserRating(item.rating) : item.vote_average ? `${item.vote_average.toFixed(1)} TMDB` : "Not rated"}</small>
                    <em>{item.watchedAt ? new Date(item.watchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Unknown watched date"}</em>
                  </span>
                  <b>{item.rating ? formatUserRating(item.rating) : "Diary"}</b>
                </button>
              ))}
            </section>
          ))}
          {filtered.length === 0 && <div className="mg2-diary-empty"><strong>No matches</strong><small>Try a different type, rating, or month filter.</small></div>}
        </div>
      )}
    </section>
  );
}

function ProfileScreen({ watchlist = {}, watched = {}, ratings = {}, reviews = {}, favorites = {}, customLists = {}, savedBlendLists = {}, profileActivity = {}, recentActivity = [], recentReviews = [], profileStats = null, loading, user, profile, socialCounts = {}, pendingRequests = [], followerProfiles = [], followingProfiles = [], followStatuses = {}, authLoading, syncStatus, profileSaving, profileMessage, onOpen, onOpenBlend, onOpenStats, onOpenDiary, onOpenAuth, onLogout, onSaveProfile, onRespondFollowRequest, onOpenPublicProfile, onFollowToggle, onRemoveFollower, onDeleteCustomList, onRenameCustomList, onShareList }) {
  const [profileTab, setProfileTab] = useState("activity");
  const [profilePanel, setProfilePanel] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [profileDraft, setProfileDraft] = useState(() => profile || defaultProfileForUser(user));
  const [profileError, setProfileError] = useState("");
  const profileRestoreLogged = useRef(false);
  useEffect(() => {
    setProfileDraft(profile || defaultProfileForUser(user));
    setProfileError("");
  }, [profile, user?.id]);
  const fallbackItems = [...fallbackRows.movies, ...fallbackRows.series, ...fallbackRows.trending];
  const profileKeyFor = (item = {}) => {
    const normalized = { ...item, media_type: mediaType(item) };
    const stableKey = normalized.item_key || normalized.itemKey || normalized.key || keyOf(normalized);
    if (stableKey && !String(stableKey).includes("undefined")) return String(stableKey);
    if (normalized.id) return `${mediaType(normalized)}:${normalized.id}`;
    return `${mediaType(normalized)}:${titleOf(normalized).toLowerCase()}`;
  };
  const dedupeProfileItems = (items = []) => {
    const map = new Map();
    items.filter(Boolean).forEach((item) => {
      const normalized = { ...item, media_type: mediaType(item) };
      const keys = [
        profileKeyFor(normalized),
        normalized.id ? `${mediaType(normalized)}:${normalized.id}` : "",
        titleOf(normalized) ? `${mediaType(normalized)}:${titleOf(normalized).toLowerCase()}` : ""
      ].filter(Boolean);
      const existingKey = keys.find((key) => map.has(key));
      const targetKey = existingKey || keys[0];
      const existing = map.get(targetKey) || {};
      const merged = { ...existing, ...normalized };
      if (!merged.poster_path && existing.poster_path) merged.poster_path = existing.poster_path;
      keys.forEach((key) => map.set(key, merged));
    });
    return [...new Set(Array.from(map.values()))];
  };
  const localReviewTextFor = (item) => reviews[keyOf({ ...item, media_type: mediaType(item) })]?.text || item?.review || item?.reviewText || item?.userReview || item?.note || item?.notes || "";
  const localLibrary = dedupeProfileItems([
    ...Object.values(watched || {}),
    ...Object.values(watchlist || {}),
    ...Object.values(favorites || {}),
    ...Object.values(reviews || {}).map((entry) => entry.item).filter(Boolean),
    ...Object.values(profileActivity || {}).map((entry) => entry.item).filter(Boolean),
    ...Object.values(customLists || {}).flatMap((list) => list.items || []),
    ...Object.values(savedBlendLists || {}).flatMap((list) => list.items || []),
    ...(recentActivity || []).map((event) => ({
      ...(event.item_data || {}),
      id: event.tmdb_id,
      media_type: event.media_type,
      title: event.title,
      poster_path: event.item_data?.poster_path || event.poster_path || event.metadata?.poster_path || ""
    })),
    ...(recentReviews || []).map((row) => ({
      id: row.tmdb_id,
      item_key: row.item_key,
      media_type: row.media_type,
      title: row.title,
      name: row.media_type === "tv" ? row.title : undefined,
      poster_path: row.poster_path || "",
      release_date: row.release_year && row.media_type === "movie" ? `${row.release_year}-01-01` : "",
      first_air_date: row.release_year && row.media_type === "tv" ? `${row.release_year}-01-01` : ""
    })),
    ...fallbackItems
  ]);
  const hydrateProfileItem = (item = {}) => {
    const normalized = { ...item, media_type: mediaType(item) };
    const match = localLibrary.find((entry) => (
      profileKeyFor(entry) === profileKeyFor(normalized) ||
      (entry.id && normalized.id && mediaType(entry) === mediaType(normalized) && String(entry.id) === String(normalized.id)) ||
      (titleOf(entry).toLowerCase() === titleOf(normalized).toLowerCase() && mediaType(entry) === mediaType(normalized))
    ));
    const hydrated = { ...(match || {}), ...normalized };
    if (!hydrated.poster_path && match?.poster_path) hydrated.poster_path = match.poster_path;
    return hydrated;
  };
  const canonicalWatched = dedupeProfileItems(Object.values(watched || {}).map(hydrateProfileItem)).filter((item) => isReleased(item));
  const watchedKeySet = new Set(canonicalWatched.map(profileKeyFor));
  const canonicalWatchlist = dedupeProfileItems(Object.values(watchlist || {}).map(hydrateProfileItem)).filter((item) => !watchedKeySet.has(profileKeyFor(item)));
  const localRatingCards = Object.entries(ratings || {}).map(([key, value]) => {
    const item = localLibrary.find((entry) => keyOf({ ...entry, media_type: mediaType(entry) }) === key || profileKeyFor(entry) === key);
    if (!item) return null;
    return {
      item: hydrateProfileItem(item),
      rating: normalizeUserRating(value),
      note: localReviewTextFor(item),
      createdAt: reviews[key]?.reviewedAt || reviews[key]?.created_at || item.watchedAt || item.savedAt || ""
    };
  }).filter(Boolean);
  const localReviewCards = Object.values(reviews || {}).map((entry) => {
    const item = hydrateProfileItem(entry.item || {});
    return {
      item,
      rating: ratingForItem(item, ratings) || normalizeUserRating(entry.rating) || null,
      note: entry.text || "",
      createdAt: entry.reviewedAt || entry.updated_at || entry.created_at || ""
    };
  });
  const remoteReviewCards = (recentReviews || []).map((row) => {
    const item = hydrateProfileItem({
      id: row.tmdb_id,
      item_key: row.item_key,
      media_type: row.media_type,
      title: row.title,
      name: row.media_type === "tv" ? row.title : undefined,
      poster_path: row.poster_path || "",
      release_date: row.release_year && row.media_type === "movie" ? `${row.release_year}-01-01` : "",
      first_air_date: row.release_year && row.media_type === "tv" ? `${row.release_year}-01-01` : ""
    });
    return {
      item,
      rating: row.rating,
      note: row.review_text || "",
      spoiler: row.contains_spoiler,
      visibility: row.visibility,
      createdAt: row.updated_at || row.created_at || ""
    };
  });
  const reviewCards = dedupeProfileItems([...remoteReviewCards, ...localReviewCards, ...localRatingCards].map((card) => card.item))
    .map((item) => {
      const card = [...remoteReviewCards, ...localReviewCards, ...localRatingCards].find((entry) => itemMatches(entry.item, item) || profileKeyFor(entry.item) === profileKeyFor(item)) || {};
      return {
        item: hydrateProfileItem(item),
        rating: card.rating || ratingForItem(item, ratings) || null,
        note: card.note || localReviewTextFor(item),
        createdAt: card.createdAt || ""
      };
    });
  const favoriteItems = dedupeProfileItems(Object.values(favorites || {}).map(hydrateProfileItem));
  const blendListItems = Object.values(savedBlendLists || {});
  const userLists = Object.values(customLists || {});
  const profileDataSource = user && (recentReviews.length || recentActivity.length || profileStats) ? "merged" : "local";
  const fallbackTimestamp = (index) => new Date(Date.now() - (index + 1) * 5400000).toISOString();
  const profileTimeLabel = (timestamp) => {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const remoteActivityEvents = (recentActivity || []).slice(0, 30).map((event, index) => {
    const item = hydrateProfileItem({
      ...(event.item_data || {}),
      id: event.tmdb_id,
      media_type: event.media_type,
      title: event.title,
      name: event.media_type === "tv" ? event.title : undefined,
      poster_path: event.item_data?.poster_path || event.poster_path || event.metadata?.poster_path || ""
    });
    const type = event.action || event.type || "activity";
    return {
      id: event.id || event.event_key || `${profileKeyFor(item)}-${event.created_at || index}`,
      type,
      statuses: [type === "watchlist_add" ? "watchlisted" : type === "review" ? "reviewed" : type === "rating" ? "rated" : type === "watched" ? "watched" : type === "list_create" || type === "list_add" ? "listed" : type],
      item,
      timestamp: event.created_at || fallbackTimestamp(index),
      rating: event.metadata?.rating || null,
      review: event.metadata?.review || ""
    };
  });
  const localActivityEvents = [
    ...canonicalWatched.map((item, index) => ({ id: `watched:${profileKeyFor(item)}`, type: "watched", statuses: ["watched"], item, timestamp: item.watchedAt || fallbackTimestamp(index) })),
    ...canonicalWatchlist.map((item, index) => ({ id: `watchlist:${profileKeyFor(item)}`, type: "watchlist_add", statuses: ["watchlisted"], item, timestamp: item.savedAt || item.addedAt || fallbackTimestamp(index + canonicalWatched.length) })),
    ...reviewCards.map((card, index) => ({ id: `review:${profileKeyFor(card.item)}`, type: card.note ? "review" : "rating", statuses: [card.note ? "reviewed" : "rated"], item: card.item, timestamp: card.createdAt || fallbackTimestamp(index + canonicalWatched.length + canonicalWatchlist.length), rating: card.rating, review: card.note }))
  ];
  const rawActivityEvents = user && remoteActivityEvents.length ? remoteActivityEvents : localActivityEvents;
  const activityMissingPostersBefore = rawActivityEvents.filter((event) => !event.item?.poster_path).length;
  const activityEvents = dedupeProfileItems((user && remoteActivityEvents.length ? remoteActivityEvents : localActivityEvents).map((event) => event.item))
    .map((item) => {
      const event = (user && remoteActivityEvents.length ? remoteActivityEvents : localActivityEvents).find((entry) => itemMatches(entry.item, item) || profileKeyFor(entry.item) === profileKeyFor(item));
      return { ...event, item: hydrateProfileItem(item) };
    })
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 30);
  const profileData = {
    source: profileDataSource,
    watchedItems: canonicalWatched,
    watchlistItems: canonicalWatchlist,
    reviewItems: reviewCards,
    activityItems: activityEvents,
    listItems: userLists,
    followers: profileStats?.followers ?? socialCounts.followers ?? followerProfiles.length ?? 0,
    following: profileStats?.following ?? socialCounts.following ?? followingProfiles.length ?? 0,
    missingPosters: {
      watched: canonicalWatched.filter((item) => !item.poster_path).length,
      watchlist: canonicalWatchlist.filter((item) => !item.poster_path).length,
      reviews: reviewCards.filter((card) => !card.item?.poster_path).length,
      activity: activityEvents.filter((event) => !event.item?.poster_path).length
    }
  };
  useEffect(() => {
    if (profileRestoreLogged.current || loading) return;
    profileRestoreLogged.current = true;
    console.info("Profile restore summary", {
      statsRowVisible: true,
      watched: profileData.watchedItems.length,
      watchlist: profileData.watchlistItems.length,
      reviews: profileData.reviewItems.length,
      activityShown: profileData.activityItems.length,
      activityMissingPostersBefore: activityMissingPostersBefore,
      activityMissingPostersAfter: profileData.missingPosters.activity,
      detailsOpenActivities: profileData.activityItems.filter((event) => event.type === "details_open" || event.type === "viewed_details").length,
      reelBackgroundPausedOnDetails: true
    });
  }, [activityMissingPostersBefore, loading, profileData]);
  const profileLists = [
    { id: "watchlist", title: "Watchlist", subtitle: `${profileData.watchlistItems.length} saved`, items: profileData.watchlistItems, action: () => { setProfilePanel(null); setSelectedList(null); setProfileTab("watchlist"); } },
    { id: "favorites", title: "Favorites", subtitle: `${favoriteItems.length} favorites`, items: favoriteItems, action: () => { setProfilePanel("favorites"); setSelectedList(null); } },
    ...blendListItems.map((list, index) => ({ id: list.id || `blend-${index}`, title: "Blend List", subtitle: `${(list.items || []).length} shared picks`, items: list.items || [], type: "blend", privacy: "shared", action: () => { setSelectedList({ id: list.id || `blend-${index}`, type: "blend", title: "Blend List", subtitle: "Saved from Blend", privacy: "shared", items: list.items || [] }); setProfilePanel("list-detail"); } })),
    ...userLists.map((list) => ({ ...list, type: "custom", privacy: list.privacy || "private", subtitle: `${list.privacy || "private"} custom list`, action: () => { setSelectedList({ id: list.id, type: "custom", title: list.title, subtitle: "Custom list", privacy: list.privacy || "private", items: list.items || [] }); setProfilePanel("list-detail"); } }))
  ];
  const openProfileTab = (tab) => {
    setProfilePanel(null);
    setSelectedList(null);
    setProfileTab(tab);
  };
  const statCards = [
    { label: "Watched", value: profileData.watchedItems.length, action: () => openProfileTab("watched") },
    { label: "Watchlist", value: profileData.watchlistItems.length, action: () => openProfileTab("watchlist") },
    { label: "Reviews", value: profileData.reviewItems.length, action: () => openProfileTab("reviews") },
    { label: "Followers", value: user ? profileData.followers : "0", action: () => { setPeopleQuery(""); setProfilePanel("followers"); } },
    { label: "Following", value: user ? profileData.following : "0", action: () => { setPeopleQuery(""); setProfilePanel("following"); } }
  ];
  const shortcuts = [
    { label: "Favorites", icon: "heart", action: () => { setProfilePanel("favorites"); setSelectedList(null); } },
    { label: "Lists", icon: "list", action: () => { setProfilePanel("lists"); setSelectedList(null); } },
    { label: "Stats", icon: "chart", action: onOpenStats },
    { label: "Diary", icon: "book", action: onOpenDiary }
  ];
  const shownProfile = profile || profileDraft || defaultProfileForUser(user);
  const displayName = shownProfile.display_name || shownProfile.username || user?.email?.split("@")[0] || "Aabhas";
  const handle = `@${shownProfile.username || "aabhas_07"}`;
  const bio = shownProfile.bio || "Movies, TV shows and everything in between.";
  const accountTitle = user ? "Synced account" : (authLoading ? "Checking account" : "Guest mode");
  const accountSubtitle = user
    ? `${user.email || "Signed in"}${syncStatus === "syncing" ? " - syncing" : ""}`
    : authLoading
      ? "Restoring Supabase session"
      : "Local only - login to sync";
  const profileTabs = [
    { id: "activity", label: "Activity" },
    { id: "watched", label: "Watched" },
    { id: "watchlist", label: "Watchlist" },
    { id: "reviews", label: "Reviews" }
  ];
  const gridItems = profileTab === "activity" ? profileData.activityItems.map((event) => event.item) : profileTab === "watched" ? profileData.watchedItems : profileData.watchlistItems;
  const profileWatchAsapItems = profileData.watchlistItems.filter((item) => item.watch_asap || item.watchAsap);
  const relationshipProfiles = profilePanel === "followers" ? followerProfiles : followingProfiles;
  const filteredRelationshipProfiles = relationshipProfiles.filter((entry) => {
    const search = peopleQuery.trim().toLowerCase();
    if (!search) return true;
    return `${entry.display_name || ""} ${entry.username || ""} ${entry.bio || ""}`.toLowerCase().includes(search.replace(/^@/, ""));
  });
  const submitProfile = async () => {
    const validation = validateProfileIdentity(profileDraft);
    if (validation.error) {
      setProfileError(validation.error);
      return;
    }
    const result = await onSaveProfile({ ...profileDraft, ...validation.value });
    if (result?.error) {
      setProfileError(result.error);
      return;
    }
    setProfilePanel(null);
    setProfileError("");
  };
  if (profilePanel === "followers" || profilePanel === "following") {
    const title = profilePanel === "followers" ? "Followers" : "Following";
    const emptyCopy = profilePanel === "followers" ? "No followers yet" : "Not following anyone yet";
    return (
      <section className="mg2-profile mg2-profile-people-page">
        <div className="mg2-profile-panel-head mg2-profile-people-head">
          <button type="button" aria-label="Back to profile" onClick={() => { setProfilePanel(null); setPeopleQuery(""); }}><Icon name="back" /></button>
          <span>
            <strong>{title}</strong>
            <small>{relationshipProfiles.length} {relationshipProfiles.length === 1 ? "person" : "people"}</small>
          </span>
          <i />
        </div>
        <label className="mg2-profile-people-search">
          <Icon name="search" />
          <input value={peopleQuery} onChange={(event) => setPeopleQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
        </label>
        <div className="mg2-profile-people-list">
          {filteredRelationshipProfiles.length ? filteredRelationshipProfiles.map((person) => {
            const status = followStatuses[person.id] || "";
            const label = status === "accepted" && profilePanel === "following" ? "Unfollow" : status === "accepted" ? "Following" : status === "pending" ? "Requested" : "Follow";
            const buttonClass = status === "accepted" && profilePanel === "following" ? "unfollow" : status === "accepted" ? "following" : status === "pending" ? "requested" : "follow";
            return (
              <article key={person.id}>
                <button className="mg2-profile-people-main" type="button" onClick={() => onOpenPublicProfile?.(person)}>
                  <PublicAvatar profile={person} size="sm" />
                  <span>
                    <strong>{publicProfileName(person)}</strong>
                    <small>@{person.username}{person.is_private ? <em>Private</em> : null}</small>
                    <i>{person.bio || "MovieGram profile"}</i>
                  </span>
                </button>
                <div className="mg2-profile-people-actions">
                  {person.id !== user?.id && <button className={buttonClass} type="button" onClick={() => onFollowToggle?.(person)}>{label}</button>}
                  {profilePanel === "followers" && user && person.id !== user.id && <button className="remove" type="button" onClick={() => onRemoveFollower?.(person)}>Remove</button>}
                </div>
              </article>
            );
          }) : <div className="mg2-profile-people-empty"><strong>{peopleQuery ? "No people found" : emptyCopy}</strong><small>{peopleQuery ? "Try a different username or display name." : "When people connect with you, they will appear here."}</small></div>}
        </div>
      </section>
    );
  }

  return (
    <section className="mg2-profile">
      <div className="mg2-profile-head">
        {shownProfile.avatar_url ? (
          <img className="mg2-profile-avatar-img" src={shownProfile.avatar_url} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        ) : <Avatar friend={friends[0]} />}
        <div className="mg2-profile-id">
          <h2>{displayName}</h2>
          <p>{handle}</p>
          <span className="mg2-profile-bio">{bio}</span>
        </div>
      </div>
      <button className="mg2-profile-edit" type="button" onClick={() => { setProfileDraft(shownProfile); setProfileError(""); setProfilePanel("edit-profile"); }}>Edit Profile</button>
      <button className="mg2-profile-account" type="button" onClick={onOpenAuth}>
        <span>{accountTitle}</span>
        <small>{accountSubtitle}{shownProfile.is_private ? " - private profile" : ""}</small>
      </button>
      {user && <button className="mg2-profile-edit" type="button" onClick={onLogout}>Logout</button>}
      {user && pendingRequests.length > 0 && (
        <div className="mg2-profile-editor">
          <strong>Follow requests</strong>
          {pendingRequests.map((request) => (
            <div key={request.id}>
              <span>{publicProfileName(request)} <small>@{request.username}</small></span>
              <button type="button" onClick={() => onRespondFollowRequest(request.id, "accepted")}>Accept</button>
              <button type="button" onClick={() => onRespondFollowRequest(request.id, "declined")}>Decline</button>
            </div>
          ))}
        </div>
      )}

      <div className="mg2-profile-stats">
        {statCards.map((stat) => (
          <button key={stat.label} type="button" onClick={stat.action}>
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </button>
        ))}
      </div>

      <div className="mg2-profile-shortcuts" aria-label="Profile shortcuts">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            className={`mg2-shortcut-${shortcut.label.toLowerCase()}`}
            type="button"
            onClick={shortcut.action}
          >
            <span><Icon name={shortcut.icon} /></span>
            <small>{shortcut.label}</small>
          </button>
        ))}
      </div>

      <div className="mg2-profile-tabs" aria-label="Profile sections">
        {profileTabs.map((tab) => (
          <button key={tab.id} className={profileTab === tab.id && !profilePanel ? "active" : ""} type="button" onClick={() => { setProfilePanel(null); setSelectedList(null); setProfileTab(tab.id); }}>{tab.label}</button>
        ))}
      </div>

      {loading && profileData.activityItems.length === 0 ? (
        <div className="mg2-profile-skeleton" aria-label="Loading profile">
          <span /><span /><span />
        </div>
      ) : (
        <>
          {profilePanel === "edit-profile" && (
            <div className="mg2-profile-edit-screen">
              <div className="mg2-profile-panel-head">
                <button type="button" onClick={() => { setProfilePanel(null); setProfileDraft(shownProfile); setProfileError(""); }}><Icon name="back" /></button>
                <strong>Edit Profile</strong>
                <button type="button" onClick={submitProfile} disabled={profileSaving}>{profileSaving ? "Saving" : "Save"}</button>
              </div>
              <div className="mg2-profile-edit-preview">
                {profileDraft.avatar_url ? (
                  <img src={profileDraft.avatar_url} alt="" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                ) : <PublicAvatar profile={profileDraft} />}
                <span>
                  <strong>{profileDraft.display_name || displayName}</strong>
                  <small>@{profileDraft.username || shownProfile.username || "moviegram"}</small>
                </span>
              </div>
              <div className="mg2-profile-editor">
                <label>
                  <span>Display name</span>
                  <input value={profileDraft.display_name || ""} onChange={(event) => setProfileDraft((prev) => ({ ...prev, display_name: event.target.value }))} maxLength={48} />
                </label>
                <label>
                  <span>Username</span>
                  <input value={profileDraft.username || ""} onChange={(event) => setProfileDraft((prev) => ({ ...prev, username: sanitizeUsername(event.target.value) }))} maxLength={24} />
                </label>
                <label>
                  <span>Bio</span>
                  <textarea value={profileDraft.bio || ""} onChange={(event) => setProfileDraft((prev) => ({ ...prev, bio: event.target.value }))} maxLength={180} />
                </label>
                <label>
                  <span>Avatar URL</span>
                  <input value={profileDraft.avatar_url || ""} onChange={(event) => setProfileDraft((prev) => ({ ...prev, avatar_url: event.target.value }))} placeholder="https://..." />
                </label>
                <label className="mg2-profile-privacy-toggle">
                  <span>Profile privacy</span>
                  <select value={profileDraft.is_private ? "private" : "public"} onChange={(event) => setProfileDraft((prev) => ({ ...prev, is_private: event.target.value === "private" }))}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                {(profileError || profileMessage) && <p>{profileError || profileMessage}</p>}
              </div>
            </div>
          )}

          {profilePanel === "favorites" && (
            favoriteItems.length ? (
              <div className="mg2-profile-poster-grid">
                {favoriteItems.map((item) => {
                  const userRating = ratingForItem(item, ratings);
                  return <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={hasStoredItem(item, watchlist)} watched={hasStoredItem(item, watched)} rating={userRating} favorite={hasStoredItem(item, favorites)} compact />;
                })}
              </div>
            ) : <div className="mg2-empty">No favorites yet</div>
          )}

          {profilePanel === "lists" && (
            <div className="mg2-profile-list-hub">
              {profileLists.map((list) => (
                <button key={list.id} type="button" onClick={list.action}>
                  <span>{list.items.slice(0, 3).map((item) => <img key={keyOf(item)} src={posterUrl(item.poster_path, "w185")} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />)}</span>
                  <strong>{list.title}<small>{list.subtitle}</small></strong>
                  <em>{list.items.length}</em>
                </button>
              ))}
            </div>
          )}

          {profilePanel === "list-detail" && (
            selectedList?.items?.length ? (
              <div className="mg2-profile-list-detail">
                <button type="button" onClick={() => { setProfilePanel("lists"); setSelectedList(null); }}><Icon name="back" /> Lists</button>
                <div className="mg2-profile-list-titlebar">
                  <span>
                    <h3>{selectedList.title}</h3>
                    <small>{selectedList.subtitle} - {selectedList.privacy || "private"}</small>
                  </span>
                  <div>
                    <button type="button" onClick={() => onShareList?.(selectedList)}>Share</button>
                    {selectedList.type === "custom" && <button type="button" onClick={() => onRenameCustomList?.(selectedList.id, selectedList.title, (nextTitle) => setSelectedList((current) => current ? { ...current, title: nextTitle } : current))}>Rename</button>}
                    {selectedList.type === "custom" && <button type="button" className="danger" onClick={() => { onDeleteCustomList?.(selectedList.id); setProfilePanel("lists"); setSelectedList(null); }}>Delete</button>}
                  </div>
                </div>
                <div className="mg2-profile-poster-grid">
                  {selectedList.items.map((item) => {
                    const userRating = ratingForItem(item, ratings);
                    return <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={hasStoredItem(item, watchlist)} watched={hasStoredItem(item, watched)} rating={userRating} favorite={hasStoredItem(item, favorites)} compact />;
                  })}
                </div>
              </div>
            ) : <div className="mg2-empty">This list is empty.</div>
          )}

          {!profilePanel && profileTab === "activity" && (
            profileData.activityItems.length ? (
              <div className="mg2-profile-activity-grid">
                {profileData.activityItems.map((event, index) => (
                  <button key={`${event.id || keyOf(event.item)}-${index}`} type="button" onClick={() => onOpen(event.item)}>
                    <img src={posterUrl(event.item.poster_path, "w185")} alt={titleOf(event.item)} loading="lazy" onError={(imageEvent) => { imageEvent.currentTarget.src = POSTER_FALLBACK; }} />
                    <span className="mg2-activity-badges">
                      {event.statuses.map((status) => (
                        <i key={status} className={`mg2-activity-badge ${status}`}>
                          {status === "watched" ? <Icon name="check" /> : status === "watchlisted" ? <Icon name="bookmark" /> : status === "reviewed" ? <Icon name="feed" /> : status === "listed" ? <Icon name="list" /> : status === "opened" ? <Icon name="play" /> : status === "reel_liked" ? <Icon name="heart" /> : status === "reel_shared" ? <Icon name="send" /> : event.rating ? formatUserRating(event.rating) : "\u2605"}
                        </i>
                      ))}
                    </span>
                    <em>{profileTimeLabel(event.timestamp)}</em>
                    <strong>{titleOf(event.item)}</strong>
                  </button>
                ))}
              </div>
            ) : <div className="mg2-empty">No activity yet. Start by watching, rating, or adding something to your watchlist.</div>
          )}

          {!profilePanel && profileTab !== "reviews" && profileTab !== "activity" && (
            gridItems.length ? (
              <>
                {profileTab === "watchlist" && profileWatchAsapItems.length > 0 && (
                  <section className="mg2-watch-asap-shelf" aria-label="Watch ASAP">
                    <div className="mg2-section-head"><h2>Watch ASAP</h2><span>{profileWatchAsapItems.length}</span></div>
                    <div className="mg2-watch-asap-row">
                      {profileWatchAsapItems.map((item) => (
                        <button key={`profile-asap-${keyOf(item)}`} type="button" onClick={() => onOpen(item)}>
                          <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                          <span>{titleOf(item)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <div className="mg2-profile-poster-grid">
                  {gridItems.map((item) => (
                    <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={hasStoredItem(item, watchlist)} watched={hasStoredItem(item, watched)} rating={ratingForItem(item, ratings)} favorite={hasStoredItem(item, favorites)} compact />
                  ))}
                </div>
              </>
            ) : <div className="mg2-empty">Add titles to this section from Home, Explore, or Details.</div>
          )}

          {!profilePanel && profileTab === "reviews" && (
            profileData.reviewItems.length ? (
              <div className="mg2-profile-review-cards">
                {profileData.reviewItems.map(({ item, rating, note }) => (
                  <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
                    <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                    <span>
                      <strong>{titleOf(item)}</strong>
                      <small>{mediaType(item) === "tv" ? "TV" : "Movie"} - {note || (rating ? `Rating only ${formatUserRating(rating)}` : "Rating only")}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : <div className="mg2-empty">Rate a movie or show to fill your review cards.</div>
          )}
        </>
      )}
    </section>
  );
}

function FriendsScreen({ friendStates, onFriendAction, onOpenBlend, user, socialProfiles = [], userResults = [], userSearch, setUserSearch, userSearchLoading, followingIds = [], followerProfiles = [], followStatuses = {}, followBusyIds = {}, onFollowToggle, onOpenPublicProfile }) {
  const [friendQuery, setFriendQuery] = useState("");
  const [previewFriend, setPreviewFriend] = useState(null);
  const filteredFriends = socialFriendProfiles.filter((friend) => `${friend.name} ${friend.handle} ${friend.genres.join(" ")}`.toLowerCase().includes(friendQuery.trim().toLowerCase()));
  const realProfiles = user ? (userResults.length ? userResults : socialProfiles) : socialProfiles;

  function actionLabel(friendId) {
    const state = friendStates[friendId] || "add";
    if (state === "friends") return "Remove";
    if (state === "requested") return "Requested";
    return "Add";
  }

  return (
    <section className="mg2-friends-screen">
      <div className="mg2-social-search"><Icon name="search" /><input value={user ? userSearch : friendQuery} onChange={(event) => user ? setUserSearch(event.target.value) : setFriendQuery(event.target.value)} placeholder={user ? "Search users by username or name" : "Search people, genres, taste"} /></div>
      {user && (
        <div className="mg2-friend-list">
          {userSearchLoading && <div className="mg2-empty">Searching users...</div>}
          {!userSearchLoading && realProfiles.length ? realProfiles.map((profile) => {
            const following = followingIds.includes(profile.id);
            const status = followStatuses[profile.id] || "";
            const followsMe = followerProfiles.some((entry) => entry.id === profile.id);
            const label = followBusyIds[profile.id] ? "Working" : status === "accepted" ? "Following" : status === "pending" ? "Requested" : followsMe ? "Follow back" : profile.is_private ? "Request" : "Follow";
            return (
              <article key={profile.id}>
                <button className="mg2-friend-main" type="button" onClick={() => onOpenPublicProfile(profile)}>
                  <PublicAvatar profile={profile} size="sm" />
                  <span>
                    <strong>{publicProfileName(profile)}<small>@{profile.username}{profile.is_private ? " - Private" : ""}</small></strong>
                    <em>{profile.bio || "MovieGram profile"}</em>
                    <i>{profile.follower_count || 0} followers - {profile.following_count || 0} following</i>
                  </span>
                </button>
                {profile.id !== user.id && <button className={following ? "friends" : status === "pending" ? "requested" : ""} type="button" disabled={Boolean(followBusyIds[profile.id])} onClick={() => onFollowToggle(profile)}>{label}</button>}
              </article>
            );
          }) : !userSearchLoading && <div className="mg2-empty">{userSearch.trim() ? "No users found." : "Follow users to build your social graph."}</div>}
        </div>
      )}
      {!user && (
        <>
      <div className="mg2-blend-row">
        {socialFriendProfiles.slice(0, 3).map((friend) => (
          <button key={`blend-${friend.id}`} type="button" onClick={() => onOpenBlend(friend.id)}>
            <strong>{friend.match}%</strong>
            <span>{friend.name}</span>
            <small>Blend preview</small>
          </button>
        ))}
      </div>
      <div className="mg2-friend-list">
        {filteredFriends.length ? filteredFriends.map((friend) => {
          const state = friendStates[friend.id] || "add";
          return (
            <article key={friend.id}>
              <button className="mg2-friend-main" type="button" onClick={() => setPreviewFriend(friend)}>
                <Avatar friend={friend} size="sm" />
                <span>
                  <strong>{friend.name}<small>{friend.match}% match</small></strong>
                  <em>{friend.mutuals} mutuals - {friend.genres.join(", ")}</em>
                  <i>{friend.activity}</i>
                </span>
              </button>
              <button className={state} type="button" onClick={() => onFriendAction(friend.id)}>{actionLabel(friend.id)}</button>
            </article>
          );
        }) : <div className="mg2-empty">No people match that search yet.</div>}
      </div>
      {previewFriend && (
        <div className="mg2-friend-preview" onMouseDown={() => setPreviewFriend(null)}>
          <article onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setPreviewFriend(null)}><Icon name="back" /> Back</button>
            <Avatar friend={previewFriend} />
            <h3>{previewFriend.name}</h3>
            <p>{previewFriend.bio}</p>
            <div className="mg2-friend-preview-stats">
              <strong>{previewFriend.match}%<small>Match</small></strong>
              <strong>{previewFriend.mutuals}<small>Mutuals</small></strong>
              <strong>{previewFriend.stats[0].split(" ")[0]}<small>Watched</small></strong>
            </div>
            <div className="mg2-friend-genres">{previewFriend.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            <small>Recent: {previewFriend.activity}</small>
          </article>
        </div>
      )}
        </>
      )}
    </section>
  );
}

function BlendScreen({ rows, savedBlendLists, onSaveBlend }) {
  const [selectedBlend, setSelectedBlend] = useState(blendSeeds[0].id);
  const [blendTab, setBlendTab] = useState("feed");
  const [createdBlend, setCreatedBlend] = useState(false);
  const blend = blendSeeds.find((item) => item.id === selectedBlend) || blendSeeds[0];
  const members = [{ ...friends[0], match: 100 }, ...blend.friends];
  const commonWatched = dedupe([...fallbackRows.movies, ...fallbackRows.trending]).slice(0, 4);
  const sharedFavorites = dedupe([fallbackRows.movies[0], fallbackRows.trending[0], fallbackRows.series[2], fallbackRows.movies[1]]).slice(0, 4);
  const recommendations = dedupe([...(rows.series || []), ...(rows.anime || []), ...fallbackRows.series, ...fallbackRows.anime]).slice(0, 6);
  const sharedList = dedupe([...(rows.trending || []), ...fallbackRows.movies, ...fallbackRows.series]).slice(0, 5);
  const saved = Boolean(savedBlendLists[blend.id]);
  const savedLists = Object.values(savedBlendLists || {});
  const blendTabs = [
    { id: "feed", label: "Feed" },
    { id: "reels", label: "Reels" },
    { id: "lists", label: "Lists" },
    { id: "match", label: "Match" }
  ];
  const reelItems = dedupe([...commonWatched, ...recommendations]).slice(0, 4);

  return (
    <section className="mg2-blend-screen">
      <div className="mg2-blend-switcher">
        {blendSeeds.map((item) => <button key={item.id} className={item.id === blend.id ? "active" : ""} type="button" onClick={() => setSelectedBlend(item.id)}>{item.title}</button>)}
      </div>
      <div className="mg2-blend-hero">
        <div className="mg2-blend-member-stack">
          {members.slice(0, 4).map((friend) => <Avatar key={friend.id} friend={friend} size="sm" />)}
        </div>
        <strong>{blend.match}%</strong>
        <span>{blend.title}</span>
        <small>{members.map((friend) => friend.name).join(" + ")}</small>
      </div>
      <div className="mg2-blend-genres">{blend.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
      <div className="mg2-blend-insight">
        <strong>Why this works</strong>
        <small>{blend.genres[0]} overlap, {commonWatched.length} common watches, and a shared pull toward high-rated TV nights.</small>
      </div>
      <div className="mg2-blend-actions">
        <button type="button" onClick={() => setCreatedBlend(true)}>{createdBlend ? "Blend Created" : "Create Blend"}</button>
        <button className={saved ? "active" : ""} type="button" onClick={() => onSaveBlend(blend.id, sharedList)}>{saved ? "Saved" : "Save Blend List"}</button>
      </div>
      <div className="mg2-blend-tabs" aria-label="Blend sections">
        {blendTabs.map((tab) => <button key={tab.id} className={blendTab === tab.id ? "active" : ""} type="button" onClick={() => setBlendTab(tab.id)}>{tab.label}</button>)}
      </div>

      {blendTab === "feed" && (
        <div className="mg2-blend-feed">
          {recommendations.map((item, index) => (
            <article key={keyOf(item)}>
              <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
              <span>
                <strong>{titleOf(item)}</strong>
                <small>Because {members[index % members.length].name} likes {blend.genres[index % blend.genres.length]} and you share {commonWatched.length} watched titles.</small>
              </span>
              <button type="button" onClick={() => onSaveBlend(`${blend.id}-feed-${item.id}`, [item])}>Save</button>
            </article>
          ))}
        </div>
      )}

      {blendTab === "reels" && (
        <div className="mg2-blend-reel-grid">
          {reelItems.map((item) => (
            <article key={keyOf(item)}>
              <img src={backdropUrl(item.backdrop_path || item.poster_path, "w780")} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }} />
              <span><Icon name="play" /></span>
              <strong>{titleOf(item)}</strong>
              <small>Spoiler-free edit for this Blend</small>
            </article>
          ))}
        </div>
      )}

      {blendTab === "lists" && (
        <>
          <div className="mg2-social-section"><h3>Shared Watchlist</h3>{sharedList.map((item) => <p key={keyOf(item)}>{titleOf(item)} <small>{mediaType(item) === "tv" ? "TV" : "Movie"}</small></p>)}</div>
          <div className="mg2-social-section">
            <h3>Saved Blend Lists</h3>
            {savedLists.length ? savedLists.map((list) => <p key={list.id}>{list.id.replaceAll("-", " ")} <small>{list.items?.length || 0} titles</small></p>) : <p>No saved Blend lists yet <small>Save one from Feed</small></p>}
          </div>
          <button className="mg2-blend-wide-save" type="button" onClick={() => onSaveBlend(blend.id, sharedList)}>Save Shared Watchlist</button>
        </>
      )}

      {blendTab === "match" && (
        <>
          <div className="mg2-social-section"><h3>People in Blend</h3><div className="mg2-blend-people">{members.map((friend) => <span key={friend.id}><Avatar friend={friend} size="sm" /><strong>{friend.name}</strong><small>{friend.match || blend.match}% match</small></span>)}</div></div>
          <div className="mg2-social-section"><h3>Shared Favorites</h3><div className="mg2-mini-poster-row">{commonWatched.map((item) => <img key={keyOf(item)} src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />)}</div></div>
          <div className="mg2-social-section"><h3>Common Watched</h3>{sharedFavorites.map((item) => <p key={keyOf(item)}>{titleOf(item)} <small>{item.vote_average ? `${item.vote_average.toFixed(1)}/10` : yearOf(item)}</small></p>)}</div>
          <div className="mg2-social-section"><h3>Compatibility Stats</h3>{blend.genres.map((genre, index) => <p key={genre}>{genre}<small>{blend.match - index * 7}% overlap</small></p>)}</div>
        </>
      )}
    </section>
  );
}

function StatsScreen({ watched = {}, watchlist = {}, ratings = {} }) {
  const [recapReady, setRecapReady] = useState(false);
  const watchedItems = Object.values(watched);
  const savedItems = Object.values(watchlist);
  const watchedCount = watchedItems.length;
  const ratingValues = Object.values(ratings);
  const avgRating = ratingValues.length ? (ratingValues.reduce((sum, value) => sum + (normalizeUserRating(value) || 0), 0) / ratingValues.length).toFixed(1) : "0.0";
  const movieItems = watchedItems.filter((item) => mediaType(item) === "movie");
  const showItems = watchedItems.filter((item) => mediaType(item) === "tv");
  const ratedWatched = watchedItems
    .map((item) => ({ item, rating: ratingForItem(item, ratings) || 0 }))
    .sort((a, b) => b.rating - a.rating);
  const topItem = ratedWatched.find(({ rating }) => rating > 0)?.item || watchedItems[0];
  const latestItem = [...watchedItems].sort((a, b) => new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0))[0];
  const savedPreview = savedItems[0];
  const genreMap = {
    12: "Adventure",
    14: "Fantasy",
    16: "Anime",
    18: "Drama",
    28: "Action",
    35: "Comedy",
    53: "Thriller",
    80: "Crime",
    878: "Sci-Fi",
    10765: "Sci-Fi"
  };
  const inferGenres = (item) => {
    const text = `${titleOf(item)} ${item.overview || ""}`.toLowerCase();
    const direct = (item.genre_ids || []).map((id) => genreMap[id]).filter(Boolean);
    const inferred = [
      text.includes("space") || text.includes("dune") || text.includes("interstellar") ? "Sci-Fi" : "",
      text.includes("crime") || text.includes("underworld") || text.includes("batman") ? "Crime" : "",
      text.includes("thrill") || text.includes("killer") ? "Thriller" : "",
      mediaType(item) === "tv" ? "TV" : "Movies"
    ].filter(Boolean);
    return [...direct, ...inferred];
  };
  const genreCounts = watchedItems.reduce((acc, item) => {
    inferGenres(item).forEach((genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
    });
    return acc;
  }, {});
  const favoriteGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const monthCounts = watchedItems.reduce((acc, item) => {
    const month = item.watchedAt ? new Date(item.watchedAt).toLocaleString("en-US", { month: "long" }) : "Untracked";
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const topMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Not enough data";
  const favoriteGenre = favoriteGenres[0]?.[0] || (showItems.length > movieItems.length ? "TV" : movieItems.length ? "Movies" : "Not enough data");
  const review = {
    movies: movieItems.length,
    shows: showItems.length,
    hours: Math.round(watchedCount * 2.1),
    genre: favoriteGenre,
    topTitle: topItem ? titleOf(topItem) : "No top title yet",
    binge: showItems[0] ? titleOf(showItems[0]) : "No TV binge yet",
    month: topMonth
  };
  const hasWatchedHistory = watchedItems.length > 0;
  const watchMix = [
    { label: "Movies", value: movieItems.length },
    { label: "TV Shows", value: showItems.length },
    { label: "Watchlist", value: savedItems.length }
  ];
  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthBars = monthOrder.map((label, index) => {
    const value = watchedItems.filter((item) => {
      if (!item.watchedAt) return false;
      const watchedDate = new Date(item.watchedAt);
      return watchedDate.getMonth() === index;
    }).length;
    return { label, value };
  });
  const maxMonth = Math.max(1, ...monthBars.map((item) => item.value));
  const recapCards = hasWatchedHistory ? [
    { title: "Your 2026 MovieGram", value: `${review.hours}h`, detail: `${watchedCount} watched title${watchedCount === 1 ? "" : "s"} tracked from your history.`, tone: "hero", poster: latestItem },
    { title: "Movies watched", value: review.movies, detail: movieItems[0] ? `Latest movie: ${titleOf(movieItems[0])}` : "No movies marked watched yet.", poster: movieItems[0] },
    { title: "Shows watched", value: review.shows, detail: showItems[0] ? `Latest show: ${titleOf(showItems[0])}` : "No shows marked watched yet.", poster: showItems[0] },
    { title: "Hours watched", value: review.hours, detail: "Estimated from your watched titles." },
    { title: "Favorite lane", value: review.genre, detail: "Based on your movie vs TV watch mix.", poster: latestItem },
    { title: "Top movie/show", value: review.topTitle, detail: ratedWatched[0]?.rating ? `Your rating: ${formatUserRating(ratedWatched[0].rating)}.` : "Your most recent watched highlight.", poster: topItem },
    { title: "Longest binge", value: review.binge, detail: showItems.length ? "TV title from your watched history." : "Mark TV watched to unlock binge stats.", poster: showItems[0] },
    { title: "Most watched month", value: review.month, detail: "Calculated from watched dates saved locally." },
    { title: "Top saved title", value: savedPreview ? titleOf(savedPreview) : "No saved title yet", detail: savedPreview ? "Pulled from your current watchlist." : "Add titles to watchlist to fill this card.", poster: savedPreview },
    { title: "Final share card", value: "MovieGram 2026", detail: `${watchedCount} watched, ${savedItems.length} saved, ${avgRating}/5 average rating.`, tone: "share", poster: topItem }
  ] : [];
  const stats = [
    { label: "Watched", value: watchedCount },
    { label: "Hours", value: Math.round(watchedCount * 2.1) },
    { label: "Avg Rating", value: avgRating },
    { label: "Watchlist", value: savedItems.length },
    { label: "Movies", value: movieItems.length },
    { label: "Shows", value: showItems.length },
    { label: "Favorite Genre", value: favoriteGenre },
    { label: "Top Creator", value: "Not tracked" }
  ];

  return (
    <section className="mg2-stats-screen">
      <div className="mg2-stats-grid">{stats.map((stat) => <article key={stat.label}><strong>{stat.value}</strong><small>{stat.label}</small></article>)}</div>
      <div className="mg2-social-section">
        <h3>Favorite Genres</h3>
        {(favoriteGenres.length ? favoriteGenres.slice(0, 4) : [["No watched genres yet", 0]]).map(([genre, count]) => <p key={genre}><span style={{ width: `${count ? Math.max(10, (count / Math.max(1, watchedCount)) * 100) : 0}%` }} />{genre}<small>{count}</small></p>)}
      </div>
      <div className="mg2-social-section">
        <h3>Watch Mix</h3>
        {watchMix.map((item) => <p key={item.label}><span style={{ width: `${hasWatchedHistory || savedItems.length ? Math.max(8, (item.value / Math.max(1, watchedCount + savedItems.length)) * 100) : 0}%` }} />{item.label}<small>{item.value}</small></p>)}
      </div>
      <div className="mg2-social-section">
        <h3>Year Preview</h3>
        <div className="mg2-stats-bars">{monthBars.map((item) => <span key={item.label} title={`${item.label}: ${item.value}`} style={{ height: `${item.value ? Math.max(12, (item.value / maxMonth) * 100) : 4}%` }} />)}</div>
      </div>
      <div className="mg2-year-section-head">
        <h3>Year in Review</h3>
        <small>Swipe through your recap story</small>
      </div>
      <div className="mg2-year-review">
        <div>
          <span>2026 Recap Preview</span>
          <h3>{hasWatchedHistory ? `${review.hours} hours of stories` : "Start your recap"}</h3>
          <p>{hasWatchedHistory ? `${review.movies} movies, ${review.shows} shows, ${savedItems.length} saved.` : "Mark titles watched from Details to generate your MovieGram year."}</p>
        </div>
        <button type="button" onClick={() => setRecapReady(true)} disabled={!hasWatchedHistory}>{recapReady ? "View Recap" : "Generate My Year"}</button>
      </div>
      {hasWatchedHistory ? (
        <div className="mg2-recap-deck">
          {recapCards.map((card) => (
            <article key={card.title} className={card.tone || ""}>
              {card.poster?.poster_path && <img src={posterUrl(card.poster.poster_path, "w342")} alt={titleOf(card.poster)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />}
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
              {card.tone === "share" && <button type="button">Share / Download</button>}
            </article>
          ))}
        </div>
      ) : (
        <div className="mg2-recap-empty">
          <strong>No watched history yet</strong>
          <small>Open any Movie or TV Details page and tap Mark Watched. Your recap will use those saved local titles.</small>
        </div>
      )}
    </section>
  );
}

function MessagesScreen({ selectedConversation, setSelectedConversation, friendStates, onFriendAction, onOpenBlend, onClose, user, socialProfiles, userResults, userSearch, setUserSearch, userSearchLoading, followingIds, followerProfiles, followStatuses, followBusyIds, onFollowToggle, onOpenPublicProfile }) {
  const [socialTab, setSocialTab] = useState("messages");
  const [chatId, setChatId] = useState(null);
  const conversation = conversations.find((item) => item.id === chatId) || conversations.find((item) => item.id === selectedConversation) || conversations[0];

  return (
    <section className={`mg2-social-screen${chatId ? " chat-active" : ""}`}>
      {!chatId && (
        <>
          <div className="mg2-social-header">
            <button className="mg2-social-back" type="button" onClick={onClose}><Icon name="back" /></button>
            <h2>Messages</h2>
          </div>
          <div className="mg2-social-tabs">
            <button className={socialTab === "messages" ? "active" : ""} type="button" onClick={() => { setChatId(null); setSocialTab("messages"); }}>Messages</button>
            <button className={socialTab === "friends" ? "active" : ""} type="button" onClick={() => { setChatId(null); setSocialTab("friends"); }}>Friends</button>
          </div>
        </>
      )}
      {socialTab === "friends" ? (
        <FriendsScreen friendStates={friendStates} onFriendAction={onFriendAction} onOpenBlend={onOpenBlend} user={user} socialProfiles={socialProfiles} userResults={userResults} userSearch={userSearch} setUserSearch={setUserSearch} userSearchLoading={userSearchLoading} followingIds={followingIds} followerProfiles={followerProfiles} followStatuses={followStatuses} followBusyIds={followBusyIds} onFollowToggle={onFollowToggle} onOpenPublicProfile={onOpenPublicProfile} />
      ) : chatId ? (
        <div className="mg2-chat native">
          <div className="mg2-chat-head">
            <button type="button" onClick={() => setChatId(null)}><Icon name="back" /></button>
            <Avatar friend={conversation.friend} size="sm" />
            <strong>{conversation.friend.name}</strong>
            <small>{conversation.friend.handle}</small>
          </div>
          <div className="mg2-chat-body">
            {conversation.messages.map((message) => (
              <p key={message.id} className={message.from === "me" ? "me" : ""}>{message.text}<span>{message.time}</span></p>
            ))}
          </div>
          <form className="mg2-composer" onSubmit={(event) => event.preventDefault()}>
            <input placeholder={`Message ${conversation.friend.name}...`} />
            <button type="submit"><Icon name="send" /></button>
          </form>
        </div>
      ) : (
        <div className="mg2-conversations native">
          {conversations.map((item) => (
            <button key={item.id} type="button" onClick={() => { setChatId(item.id); setSelectedConversation(item.id); }}>
              <Avatar friend={item.friend} size="sm" />
              <span><strong>{item.friend.name}</strong><small>{item.messages.at(-1)?.text}</small></span>
              <span className="mg2-conversation-meta">
                <small>{item.messages.at(-1)?.time || "Now"}</small>
                {item.unread > 0 && <em>{item.unread}</em>}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationsScreen({ pendingRequests = [], notifications = [], onRespondFollowRequest, onMarkRead }) {
  const requestNotificationByActor = Object.fromEntries(
    notifications
      .filter((notification) => notification.type === "follow_request" && notification.actor_id)
      .map((notification) => [notification.actor_id, notification])
  );
  const fallbackRequests = pendingRequests.filter((request) => !requestNotificationByActor[request.id]);
  const hasRealNotifications = fallbackRequests.length > 0 || notifications.length > 0;
  const remoteItems = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    isRead: notification.is_read,
    friend: notification.actor ? {
      name: notification.actor.display_name || notification.actor.username || "MovieGram user",
      handle: notification.actor.username ? `@${notification.actor.username}` : "",
      avatar_url: notification.actor.avatar_url
    } : { name: "MovieGram", handle: "", avatar_url: "" },
    title: notification.message || notification.type?.replaceAll("_", " ") || "Notification",
    detail: notification.metadata?.action_state ? `Status: ${notification.metadata.action_state}` : notification.entity_type ? `${notification.entity_type}${notification.entity_id ? ` - ${notification.entity_id}` : ""}` : "MovieGram update",
    time: publicActivityDate(notification.created_at),
    requesterId: notification.actor_id,
    notification
  }));
  const groups = [
    { label: "Requests", items: fallbackRequests.map((request) => ({
      id: `request-${request.id}`,
      type: "follow_request",
      friend: { name: request.display_name || request.username || "MovieGram user", handle: request.username ? `@${request.username}` : "", avatar_url: request.avatar_url },
      title: `${request.display_name || request.username || "Someone"} requested to follow you`,
      detail: request.bio || "Private account follow request.",
      time: "Now",
      requesterId: request.id
    })) },
    { label: "Recent", items: remoteItems },
    { label: "Today", items: [] },
    { label: "This Week", items: [] },
    { label: "Earlier", items: [] }
  ];

  return (
    <section className="mg2-notifications-screen">
      {hasRealNotifications === false && <div className="mg2-empty">No notifications yet.</div>}
      {groups.filter((group) => group.items.length).map((group) => (
        <div key={group.label} className="mg2-notification-group">
          <h3>{group.label}</h3>
          {group.items.map((notification) => (
            <article key={`${group.label}-${notification.id || notification.title}`}>
              <Avatar friend={notification.friend} size="sm" />
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.detail}</small>
              </span>
              {notification.type === "follow_request" && notification.notification?.metadata?.action_state !== "accepted" && notification.notification?.metadata?.action_state !== "declined" ? (
                <div className="mg2-notification-actions">
                  <button type="button" onClick={() => onRespondFollowRequest?.(notification.requesterId, "accepted", notification.notification)}>Accept</button>
                  <button type="button" className="ghost" onClick={() => onRespondFollowRequest?.(notification.requesterId, "declined", notification.notification)}>Decline</button>
                </div>
              ) : notification.notification && !notification.isRead ? (
                <div className="mg2-notification-actions">
                  <button type="button" className="ghost" onClick={() => onMarkRead?.(notification.notification)}>Mark read</button>
                </div>
              ) : null}
              <em>{notification.time}</em>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function WatchlistScreen({ items, onOpen, watchlist, ratings }) {
  return (
    <section>
      <div className="mg2-chips two"><button className="active" type="button">Movies</button><button type="button">TV Shows</button></div>
      {items.length === 0 && <div className="mg2-empty">Your watchlist is empty. Add titles from Home or Explore.</div>}
      <div className="mg2-watch-list">
        {items.map((item) => (
          <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
            <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
            <span><strong>{titleOf(item)}</strong><small>{yearOf(item)} {ratingForItem(item, ratings) ? `- You ${formatUserRating(ratingForItem(item, ratings))}` : ""}</small></span>
            <Icon name="dots" />
          </button>
        ))}
      </div>
    </section>
  );
}

function RatingControl({ value, onRate }) {
  const current = normalizeUserRating(value) || 0;
  return (
    <div className="mg2-rating">
      <button className="clear" type="button" onClick={() => onRate(0)}>Clear</button>
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        const state = current >= star ? "full" : current >= star - .5 ? "half" : "";
        return (
          <span key={star} className={`star ${state}`}>
            <button type="button" aria-label={`${star - .5} stars`} onClick={() => onRate(star - .5)} />
            <button type="button" aria-label={`${star} stars`} onClick={() => onRate(star)} />
          </span>
        );
      })}
    </div>
  );
}

function DetailModal({ item, details, loading, onClose, onWatchlist, saved, watched, watchAsap, onWatchAsap, onWatched, rating, onRate, onOpen, onOpenPerson, onOpenPublicProfile, externalRatings = [], watchProviders, favorite, onFavorite, apiFetch, episodeProgress = {}, onToggleEpisode, onToggleSeason, review = "", onEditReview, onDeleteReview, onOpenListSheet, socialActivity = [] }) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(null);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const shown = details || item;
  const similar = normalize(details?.similar?.results || []).slice(0, 8);
  const recs = normalize(details?.recommendations?.results || []).slice(0, 8);
  const similarContent = dedupe([...similar, ...recs]).slice(0, 12);
  const trailer = details?.videos?.results?.find((video) => video.site === "YouTube" && video.type === "Trailer") ||
    details?.videos?.results?.find((video) => video.site === "YouTube");
  const type = mediaType(shown);
  const releaseDate = dateOf(shown) || "Release date unavailable";
  const runtimeLabel = type === "tv"
    ? `${details?.number_of_seasons || 1} season${(details?.number_of_seasons || 1) === 1 ? "" : "s"} - ${details?.number_of_episodes || 0} episodes`
    : `${details?.runtime || "Runtime unavailable"}${details?.runtime ? " min" : ""}`;
  const director = details?.credits?.crew?.find((person) => person.job === "Director")?.name;
  const certification = type === "movie"
    ? details?.release_dates?.results?.find((entry) => entry.iso_3166_1 === "US")?.release_dates?.find((entry) => entry.certification)?.certification
    : details?.content_ratings?.results?.find((entry) => entry.iso_3166_1 === "US")?.rating;
  const genres = details?.genres || [];
  const actorSource = type === "tv" && details?.aggregate_credits?.cast?.length
    ? [...details.aggregate_credits.cast].sort((a, b) => (b.total_episode_count || 0) - (a.total_episode_count || 0))
    : details?.credits?.cast || [];
  const cast = type === "tv"
    ? (actorSource.some((person) => Number.isFinite(person.total_episode_count))
      ? actorSource.filter((person) => (person.total_episode_count || 0) > 3).slice(0, 40)
      : actorSource.filter((person) => person?.name).slice(0, 40))
    : actorSource.filter((person) => person?.name).slice(0, 40);
  const userRating = normalizeUserRating(rating);
  const released = isReleased(shown);
  const externalRatingMeta = (entry) => {
    if (entry.source === "IMDb") return { className: "imdb", icon: "IMDb", value: String(entry.value || "").replace(/\/10$/, "") };
    if (entry.source === "RT Critics") return { className: "tomato", icon: "🍅", value: entry.value };
    if (entry.source === "RT Audience") return { className: "popcorn", icon: "🍿", value: entry.value };
    return { className: "meta", icon: entry.source, value: entry.value };
  };
  const ratingIcon = (entry, meta) => entry.source === "RT Critics" ? "\uD83C\uDF45" : entry.source === "RT Audience" ? "\uD83C\uDF7F" : meta.icon;
  const providerGroups = [
    { id: "stream", label: "Stream", items: watchProviders?.stream || [] },
    { id: "rent", label: "Rent", items: watchProviders?.rent || [] },
    { id: "buy", label: "Buy", items: watchProviders?.buy || [] }
  ].filter((group) => group.items.length > 0);
  const realSocialForTitle = socialActivity.filter((entry) => entry.item && itemMatches(entry.item, shown));
  const realWatchedByFriends = realSocialForTitle.filter((entry) => ["watched", "rated", "rating", "reviewed", "review", "watchlist_add", "liked"].includes(entry.action)).slice(0, 4);
  const realFriendReviews = realSocialForTitle.filter((entry) => entry.action === "reviewed" || entry.action === "review").slice(0, 4);
  const watchedByFriends = realWatchedByFriends;
  const friendReviews = realFriendReviews;
  const hasBackdrop = Boolean(shown.backdrop_path);
  const heroImage = hasBackdrop
    ? backdropUrl(shown.backdrop_path)
    : (shown.poster_path ? posterUrl(shown.poster_path, "w780") : BACKDROP_FALLBACK);
  const normalSeasons = normalSeasonsOf(details || {});
  const specials = (details?.seasons || []).filter((season) => season?.season_number === 0 && season.episode_count > 0);
  const seasons = type === "tv" ? [...normalSeasons, ...specials] : [];
  const selectedSeason = seasons.find((season) => season.season_number === selectedSeasonNumber) || seasons[0];
  const episodes = seasonDetails?.episodes || [];
  const nextEpisode = episodes.find((episode) => !episodeProgress[episodeKey(shown.id, episode.season_number, episode.episode_number)]);
  const overview = shown.overview || "No overview available for this title yet.";
  const overviewLong = overview.length > 220;
  const visibleOverview = overviewLong && !overviewExpanded ? `${overview.slice(0, 220).trim()}...` : overview;
  const seasonProgress = (season) => {
    const count = season?.episode_count || 0;
    const watchedCount = Array.from({ length: count }, (_, index) => index + 1)
      .filter((episodeNumber) => episodeProgress[episodeKey(shown.id, season.season_number, episodeNumber)])
      .length;
    return { watchedCount, count };
  };

  useEffect(() => {
    setOverviewExpanded(false);
    setSeasonDetails(null);
    if (mediaType(shown) !== "tv") {
      setSelectedSeasonNumber(null);
      return;
    }
    const normal = normalSeasonsOf(details || {});
    const fallbackSeason = normal[0] || (details?.seasons || []).find((season) => season?.episode_count > 0);
    setSelectedSeasonNumber(fallbackSeason?.season_number ?? null);
  }, [details?.id, shown?.id]);

  useEffect(() => {
    async function loadSeason() {
      if (type !== "tv" || selectedSeasonNumber === null || !shown.id || !apiFetch) return;
      setSeasonLoading(true);
      setSeasonDetails(null);
      try {
        const data = await apiFetch(`/tv/${shown.id}/season/${selectedSeasonNumber}`);
        setSeasonDetails(data);
      } catch {
        setSeasonDetails(null);
      } finally {
        setSeasonLoading(false);
      }
    }
    loadSeason();
  }, [apiFetch, selectedSeasonNumber, shown.id, type]);

  return (
    <div className="mg2-modal-backdrop" onMouseDown={onClose}>
      <section className="mg2-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="mg2-back" type="button" onClick={onClose}><Icon name="back" /> Back</button>
        {loading ? (
          <div className="mg2-detail-skeleton" aria-label="Loading details">
            <div />
            <span />
            <span />
            <i />
            <i />
            <i />
          </div>
        ) : (
          <>
            <div className="mg2-detail-hero">
              <img
                className={`mg2-detail-backdrop${hasBackdrop ? "" : " poster-fallback"}`}
                src={heroImage}
                alt=""
                onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }}
              />
              <div className="mg2-detail-hero-copy">
                <img className="mg2-detail-poster" src={posterUrl(shown.poster_path)} alt={titleOf(shown)} onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                <div>
                  <span className="mg2-detail-type">{type === "tv" ? "TV Show" : "Movie"}</span>
                  <h2>{titleOf(shown)}</h2>
                  <p className="mg2-detail-meta">
                    <span>{yearOf(shown)}</span>
                    <span>{runtimeLabel}</span>
                    {certification && <span>{certification}</span>}
                    {director && <span>{director}</span>}
                  </p>
                  <div className="mg2-detail-status">
                    {watched && <span><Icon name="check" /> Watched</span>}
                    {saved && <span><Icon name="bookmark" /> Watchlist</span>}
                    {watchAsap && <span><Icon name="clock" /> Watch ASAP</span>}
                    {favorite && <span><Icon name="heart" /> Favorite</span>}
                  </div>
                  {genres.length > 0 && <div className="mg2-detail-hero-genres">{genres.slice(0, 3).map((genre) => <span key={genre.id}>{genre.name}</span>)}</div>}
                  <div className="mg2-ratings-row">
                    <span className={`user ${userRating ? "active" : ""}`}><b>{"\u2605"}</b>{userRating ? formatUserRating(userRating) : "Rate"}</span>
                    {shown.vote_average && <span className="tmdb"><b>{"\u2605"}</b>{Math.round(shown.vote_average * 10)}%</span>}
                    {externalRatings.map((entry) => {
                      const meta = externalRatingMeta(entry);
                      return <span key={`${entry.source}-${entry.value}`} className={meta.className}><b>{ratingIcon(entry, meta)}</b>{meta.value}</span>;
                    })}
                  </div>
                  <RatingControl value={rating} onRate={(next) => onRate(shown, next)} />
                </div>
              </div>
            </div>
            <div className="mg2-detail-actions">
              <button className={watched ? "active watched" : ""} type="button" disabled={!watched && !released} onClick={() => onWatched(shown)} aria-label={watched ? "Mark unwatched" : released ? "Mark watched" : releaseMessage(shown)}><Icon name="check" /><span>{watched ? "Watched" : released ? "Watch" : "Unreleased"}</span></button>
              <button className={saved ? "active" : ""} type="button" onClick={() => onWatchlist(shown)} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><Icon name="bookmark" /><span>{saved ? "Saved" : "List"}</span></button>
              <button className={watchAsap ? "active asap" : ""} type="button" disabled={watched} onClick={() => onWatchAsap(shown)} aria-label={watched ? "Already watched" : watchAsap ? "Remove from Watch ASAP" : "Add to Watch ASAP"}><Icon name="clock" /><span>Watch ASAP</span></button>
              <button className={favorite ? "active favorite" : ""} type="button" onClick={() => onFavorite(shown)} aria-label={favorite ? "Unlike" : "Like"}><Icon name="heart" /><span>{favorite ? "Liked" : "Like"}</span></button>
            </div>
            <section className="mg2-detail-panel">
              <h3>Overview</h3>
              {!released && <p className="mg2-overview">{releaseMessage(shown)} You can mark this watched after release.</p>}
              <p className="mg2-overview">{visibleOverview}</p>
              {overviewLong && <button className="mg2-read-more" type="button" onClick={() => setOverviewExpanded((current) => !current)}>{overviewExpanded ? "Show less" : "Read more"}</button>}
              <div className="mg2-genre-list">
                {genres.length ? genres.map((genre) => <span key={genre.id}>{genre.name}</span>) : <span>Genre unavailable</span>}
              </div>
            </section>
            <section className="mg2-detail-panel">
              <div className="mg2-detail-panel-head">
                <h3>Actors</h3>
              </div>
              <div className="mg2-cast-row">
                {cast.length ? cast.map((person) => {
                  const character = person.roles?.[0]?.character || person.character || person.roles?.map((role) => role.character).filter(Boolean).join(", ") || "Actor";
                  return <CastActorCard key={`${person.id}-${character}`} person={person} type={type} character={character} onOpenPerson={onOpenPerson} />;
                }) : <p>No actor data available.</p>}
              </div>
            </section>
            {type === "tv" && seasons.length > 0 && (
              <section className="mg2-detail-panel">
                <div className="mg2-detail-panel-head">
                  <h3>Seasons</h3>
                  <span>{normalSeasons.length || seasons.length} seasons</span>
                </div>
                <div className="mg2-season-row">
                  {seasons.map((season) => {
                    const progress = seasonProgress(season);
                    const complete = progress.count > 0 && progress.watchedCount === progress.count;
                    return (
                      <button key={season.id || season.season_number} className={`${selectedSeason?.season_number === season.season_number ? "active" : ""} ${complete ? "complete" : ""}`} type="button" onClick={() => setSelectedSeasonNumber(season.season_number)}>
                        <img src={posterUrl(season.poster_path || shown.poster_path, "w185")} alt={season.name} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                        <strong>{season.name || `Season ${season.season_number}`}</strong>
                        <small>{season.episode_count || 0} eps</small>
                        <em>{progress.watchedCount}/{progress.count || season.episode_count || 0} watched</em>
                        {complete && <i><Icon name="check" /></i>}
                      </button>
                    );
                  })}
                </div>
                {selectedSeason && (
                  <div className="mg2-episode-section">
                    {nextEpisode ? (
                      <div className="mg2-next-episode">
                        <strong>Continue {titleOf(shown)}</strong>
                        <small>Next: S{nextEpisode.season_number} E{nextEpisode.episode_number} - {nextEpisode.name || "Episode"}</small>
                      </div>
                    ) : episodes.length ? (
                      <div className="mg2-next-episode complete">
                        <strong>Completed</strong>
                        <small>All loaded episodes in this season are watched.</small>
                      </div>
                    ) : null}
                    <div className="mg2-detail-panel-head">
                      <h3>{selectedSeason.name || `Season ${selectedSeason.season_number}`}</h3>
                      <span>{seasonProgress(selectedSeason).watchedCount}/{seasonProgress(selectedSeason).count || selectedSeason.episode_count || 0} watched</span>
                    </div>
                    <button className="mg2-season-toggle" type="button" onClick={() => onToggleSeason(shown, selectedSeason, details)}>
                      {seasonProgress(selectedSeason).count > 0 && seasonProgress(selectedSeason).watchedCount === seasonProgress(selectedSeason).count ? "Unwatch season" : "Mark season watched"}
                    </button>
                    {seasonLoading ? <div className="mg2-empty">Loading episodes...</div> : (
                      <div className="mg2-episode-list">
                        {episodes.length ? episodes.map((episode) => {
                          const isWatched = Boolean(episodeProgress[episodeKey(shown.id, episode.season_number, episode.episode_number)]);
                          return (
                            <button key={episode.id || episodeKey(shown.id, episode.season_number, episode.episode_number)} className={isWatched ? "watched" : ""} type="button" onClick={() => onToggleEpisode(shown, episode, selectedSeason, details)}>
                              <img src={episode.still_path ? `${IMAGE_BASE}/w300${episode.still_path}` : posterUrl(shown.poster_path, "w185")} alt={episode.name} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                              <span>
                                <strong>{episode.name || `Episode ${episode.episode_number}`}</strong>
                                <small>S{episode.season_number} E{episode.episode_number}{episode.runtime ? ` - ${episode.runtime} min` : ""}</small>
                              </span>
                              <em>{isWatched ? <Icon name="check" /> : "Watch"}</em>
                            </button>
                          );
                        }) : <div className="mg2-empty">Episode data is unavailable for this season.</div>}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
            {providerGroups.length > 0 && (
              <section className="mg2-detail-panel">
                <div className="mg2-detail-panel-head">
                  <h3>Where to Watch</h3>
                </div>
                <div className="mg2-provider-list">
                  {providerGroups.map((group) => (
                    <div key={group.id}>
                      <strong>{group.label}</strong>
                      <span>
                        {group.items.map((provider) => {
                          const providerLink = providerSearchUrl(provider, titleOf(shown)) || provider.link || watchProviders?.link;
                          const providerBody = <>
                            {provider.logo_path && <img src={`${IMAGE_BASE}/w92${provider.logo_path}`} alt="" loading="lazy" />}
                            {provider.name}
                          </>;
                          return providerLink
                            ? <a key={`${group.id}-${provider.id || provider.name}`} href={providerLink} target="_blank" rel="noreferrer">{providerBody}</a>
                            : <em key={`${group.id}-${provider.id || provider.name}`}>{providerBody}</em>;
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {trailer && (
              <section className="mg2-detail-panel">
                <div className="mg2-detail-panel-head">
                  <h3>Trailer</h3>
                  <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer">Open YouTube</a>
                </div>
                <div className="mg2-trailer-frame">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title={`${titleOf(shown)} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            )}
            {watchedByFriends.length > 0 && (
              <section className="mg2-detail-panel">
                <div className="mg2-detail-panel-head">
                  <h3>Watched by Friends</h3>
                  <span>{watchedByFriends.length}</span>
                </div>
                <div className="mg2-detail-friends-row">
                  {watchedByFriends.map((entry) => (
                    <article key={entry.id}>
                      {entry.profile ? <button type="button" onClick={() => onOpenPublicProfile?.(entry.profile)}><PublicAvatar profile={entry.profile} size="sm" /></button> : <Avatar friend={entry.friend} size="sm" />}
                      <span><strong>{entry.profile ? publicProfileName(entry.profile) : entry.friend.name}</strong><small>{entry.actionLabel || entry.action} {entry.time}</small></span>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <section className="mg2-detail-panel">
              <div className="mg2-detail-panel-head">
                <h3>Your Review</h3>
                <button type="button" onClick={() => onEditReview(shown)}>{review ? "Edit review" : "Write review"}</button>
              </div>
              {review ? (
                <div className="mg2-user-review">
                  <p>{review}</p>
                  <button type="button" onClick={() => onDeleteReview(shown)}>Delete Review</button>
                </div>
              ) : <p className="mg2-overview">Write a review with rating, spoiler, and visibility controls.</p>}
              <button className="mg2-season-toggle" type="button" onClick={() => onOpenListSheet(shown)}>Add to custom list</button>
            </section>
            {friendReviews.length > 0 && (
              <section className="mg2-detail-panel">
                <div className="mg2-detail-panel-head">
                  <h3>Friend Reviews</h3>
                  <span>Social</span>
                </div>
                <div className="mg2-detail-review-list">
                  {friendReviews.map((entry) => (
                    <article key={`review-${entry.id}`}>
                      {entry.profile ? <button type="button" onClick={() => onOpenPublicProfile?.(entry.profile)}><PublicAvatar profile={entry.profile} size="sm" /></button> : <Avatar friend={entry.friend} size="sm" />}
                      <span><strong>{entry.profile ? publicProfileName(entry.profile) : entry.friend.name}</strong><small>{entry.metadata?.review || entry.body || `${entry.actionLabel} ${entry.title}`}</small></span>
                      {(entry.metadata?.rating || entry.rating) && <em>{entry.metadata?.rating ? formatUserRating(entry.metadata.rating) : `${entry.rating}/5`}</em>}
                    </article>
                  ))}
                </div>
              </section>
            )}
            {similarContent.length > 0 && <ContentRow title="Similar Content" items={similarContent} loading={false} onOpen={onOpen} watchlist={{}} ratings={{}} />}
          </>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  const cache = useRef(new Map());
  const observer = useRef(null);
  const [activeTab, setActiveTab] = useState("home");
  const [activeExplore, setActiveExplore] = useState("trending");
  const [activeExplorePage, setActiveExplorePage] = useState(1);
  const [rows, setRows] = useState(fallbackRows);
  const [loadingRows, setLoadingRows] = useState(false);
  const [tabResults, setTabResults] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const [exploreRows, setExploreRows] = useState({
    today: fallbackRows.trending,
    week: fallbackRows.trending,
    popularMovies: fallbackRows.movies,
    popularTv: fallbackRows.series,
    topRated: fallbackRows.movies,
    upcoming: fallbackRows.trending
  });
  const [exploreLoading, setExploreLoading] = useState(false);
  const [popularActors, setPopularActors] = useState(actorFallbacks);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [exploreUserResults, setExploreUserResults] = useState([]);
  const [exploreUserLoading, setExploreUserLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [watchlist, setWatchlist] = useState({});
  const [watched, setWatched] = useState({});
  const [episodeProgress, setEpisodeProgress] = useState({});
  const [ratings, setRatings] = useState({});
  const [reviews, setReviews] = useState({});
  const [favorites, setFavorites] = useState({});
  const [customLists, setCustomLists] = useState({});
  const [continueWatching, setContinueWatching] = useState([]);
  const [clickSignals, setClickSignals] = useState({});
  const [profileActivity, setProfileActivity] = useState({});
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [externalRatings, setExternalRatings] = useState([]);
  const [watchProviders, setWatchProviders] = useState(null);
  const [watchedAction, setWatchedAction] = useState(null);
  const [quickActionItem, setQuickActionItem] = useState(null);
  const [reviewItem, setReviewItem] = useState(null);
  const [listItem, setListItem] = useState(null);
  const [preferencesOpen, setPreferencesOpen] = useState(() => typeof window !== "undefined" && !window.localStorage.getItem("moviegram.preferencesDone"));
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [feedPage, setFeedPage] = useState(2);
  const [likedFeed, setLikedFeed] = useState({});
  const [savedFeed, setSavedFeed] = useState({});
  const [selectedConversation, setSelectedConversation] = useState(conversations[0].id);
  const [activeSocial, setActiveSocial] = useState(null);
  const [friendStates, setFriendStates] = useState({});
  const [savedBlendLists, setSavedBlendLists] = useState({});
  const [hiddenRecs, setHiddenRecs] = useState({});
  const [socialProfiles, setSocialProfiles] = useState([]);
  const [followerProfiles, setFollowerProfiles] = useState([]);
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [socialActivity, setSocialActivity] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profileStats, setProfileStats] = useState(null);
  const [followBusyIds, setFollowBusyIds] = useState({});
  const [followingIds, setFollowingIds] = useState([]);
  const [pendingFollowIds, setPendingFollowIds] = useState([]);
  const [followStatuses, setFollowStatuses] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [socialCounts, setSocialCounts] = useState({ followers: 0, following: 0 });
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedPublicProfile, setSelectedPublicProfile] = useState(null);
  const [publicProfileBundle, setPublicProfileBundle] = useState(null);
  const [socialError, setSocialError] = useState("");
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [profileIdentity, setProfileIdentity] = useState(readGuestProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [guestAccepted, setGuestAccepted] = useState(false);
  const [authOnboardingActive, setAuthOnboardingActive] = useState(false);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "" : "local");
  const [remoteReady, setRemoteReady] = useState(false);
  const activeDataOwner = useRef("guest");
  const localStateHydrated = useRef(false);
  const remoteHydrating = useRef(false);
  const latestLocalState = useRef(DEFAULT_LOCAL_STATE);
  const librarySyncLogged = useRef(false);
  const detailsOpenActivityRef = useRef({});

  const apiFetch = useCallback(async (path, params = {}) => {
    if (!API_KEY) throw new Error("Missing NEXT_PUBLIC_TMDB_API_KEY.");
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    const key = url.toString();
    if (cache.current.has(key)) return cache.current.get(key);
    const promise = new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8000);

      fetch(key, { signal: controller.signal })
        .then((response) => {
          window.clearTimeout(timer);
          if (!response.ok) throw new Error(`TMDB ${response.status}`);
          return response.json();
        })
        .then(resolve)
        .catch((error) => {
          window.clearTimeout(timer);
          reject(error);
        });
    }).catch((error) => {
      cache.current.delete(key);
      throw error;
    });
    cache.current.set(key, promise);
    return promise;
  }, []);

  const currentLocalState = useCallback(() => normalizeLocalState({
    watchlist,
    watched,
    episodeProgress,
    ratings,
    reviews,
    favorites,
    customLists,
    continueWatching,
    clickSignals,
    profileActivity,
    feedLikes: likedFeed,
    feedSaves: savedFeed,
    friendStates,
    blendLists: savedBlendLists,
    hiddenRecommendations: hiddenRecs
  }), [watchlist, watched, episodeProgress, ratings, reviews, favorites, customLists, continueWatching, clickSignals, profileActivity, likedFeed, savedFeed, friendStates, savedBlendLists, hiddenRecs]);

  useEffect(() => {
    latestLocalState.current = currentLocalState();
  }, [currentLocalState]);

  const applyLocalState = useCallback((state, owner = activeDataOwner.current, options = {}) => {
    const { persistState = true } = options;
    const normalized = normalizeLocalState(state);
    setWatchlist(normalized.watchlist);
    setWatched(normalized.watched);
    setEpisodeProgress(normalized.episodeProgress);
    setRatings(normalized.ratings);
    setReviews(normalized.reviews);
    setFavorites(normalized.favorites);
    setCustomLists(normalized.customLists);
    setContinueWatching(normalized.continueWatching);
    setClickSignals(normalized.clickSignals);
    setProfileActivity(normalized.profileActivity);
    setLikedFeed(normalized.feedLikes);
    setSavedFeed(normalized.feedSaves);
    setFriendStates(normalized.friendStates);
    setSavedBlendLists(normalized.blendLists);
    setHiddenRecs(normalized.hiddenRecommendations);
    if (persistState) persistOwnedLocalState(owner, normalized, { writeLegacy: true });
  }, []);

  const applyRemoteState = useCallback((remote, userId) => {
    if (!remote || !userId) return;
    const userCache = readOwnedLocalState(userId, { fallbackToLegacy: false });
    const legacyCache = readLegacyLocalState();
    const mergedLibrary = mergeLibrarySources({
      current: latestLocalState.current,
      scoped: userCache,
      legacy: legacyCache,
      remote
    });
    const nextEpisodes = remote.episodeProgress || {};
    applyLocalState({
      ...userCache,
      watchlist: mergedLibrary.watchlist,
      watched: mergedLibrary.watched,
      favorites: mergedLibrary.favorites,
      ratings: mergedLibrary.ratings,
      reviews: mergedLibrary.reviews,
      episodeProgress: nextEpisodes,
      customLists: mergedLibrary.customLists
    }, userId);
    if (!librarySyncLogged.current) {
      librarySyncLogged.current = true;
      console.info("MovieGram library sync summary", {
        localWatched: mergedLibrary.sourceCounts.localWatched,
        supabaseWatched: mergedLibrary.sourceCounts.remoteWatched,
        mergedWatched: Object.keys(mergedLibrary.watched).length,
        localWatchlist: mergedLibrary.sourceCounts.localWatchlist,
        supabaseWatchlist: mergedLibrary.sourceCounts.remoteWatchlist,
        mergedWatchlist: Object.keys(mergedLibrary.watchlist).length,
        reviews: Object.keys(mergedLibrary.reviews).length,
        missingPosters: {
          watched: Object.values(mergedLibrary.watched).filter((item) => !item.poster_path).length,
          watchlist: Object.values(mergedLibrary.watchlist).filter((item) => !item.poster_path).length,
          reviews: Object.values(mergedLibrary.reviews).filter((review) => !review.item?.poster_path).length
        },
        duplicateRemoved: mergedLibrary.duplicateRemoved
      });
    }
  }, [applyLocalState]);

  useEffect(() => {
    activeDataOwner.current = "guest";
    const guestState = readOwnedLocalState("guest", { fallbackToLegacy: !hasOwnerStorage("guest") && !isSupabaseConfigured && !hasSupabaseAuthToken() });
    applyLocalState(guestState, "guest");
    localStateHydrated.current = true;
  }, [applyLocalState]);

  useEffect(() => {
    if (!supabase) {
      remoteHydrating.current = false;
      setSupabaseSession(null);
      setSupabaseUser(null);
      setAuthLoading(false);
      setSyncStatus("local");
      setRemoteReady(false);
      return;
    }
    let alive = true;

    async function applySession(session, event = "SESSION") {
      const user = session?.user || null;
      if (!alive) return;
      setSupabaseSession(session || null);
      setSupabaseUser(user);
      if (!user) {
        remoteHydrating.current = false;
        if (activeDataOwner.current !== "guest") {
          persistOwnedLocalState(activeDataOwner.current, latestLocalState.current, { writeLegacy: false });
        }
        activeDataOwner.current = "guest";
        const guestState = readOwnedLocalState("guest", { fallbackToLegacy: false });
        applyLocalState(guestState, "guest");
        setProfileIdentity(readGuestProfile());
        setProfileMessage("");
        setSocialProfiles([]);
        setFollowerProfiles([]);
        setFollowingProfiles([]);
        setSocialActivity([]);
        setRecentActivity([]);
        setRecentReviews([]);
        setNotifications([]);
        setProfileStats(null);
        setFollowBusyIds({});
        setFollowingIds([]);
        setPendingFollowIds([]);
        setFollowStatuses({});
        setPendingRequests([]);
        setSocialCounts({ followers: 0, following: 0 });
        setUserResults([]);
        setUserSearch("");
        setSelectedPublicProfile(null);
        setPublicProfileBundle(null);
        setRemoteReady(false);
        setSyncStatus("guest");
        setAuthLoading(false);
        if (event === "SIGNED_OUT") console.info("Signed out");
        return;
      }
      try {
        remoteHydrating.current = true;
        setRemoteReady(false);
        if (localStateHydrated.current) {
          const previousOwner = activeDataOwner.current || "guest";
          if (previousOwner !== user.id) {
            persistOwnedLocalState(previousOwner, latestLocalState.current, { writeLegacy: false });
          }
        }
        activeDataOwner.current = user.id;
        applyLocalState(DEFAULT_LOCAL_STATE, user.id, { persistState: false });
        setProfileIdentity(defaultProfileForUser(user));
        setProfileMessage("");
        setSocialProfiles([]);
        setFollowerProfiles([]);
        setFollowingProfiles([]);
        setSocialActivity([]);
        setRecentActivity([]);
        setRecentReviews([]);
        setNotifications([]);
        setProfileStats(null);
        setFollowBusyIds({});
        setFollowingIds([]);
        setPendingFollowIds([]);
        setFollowStatuses({});
        setPendingRequests([]);
        setSocialCounts({ followers: 0, following: 0 });
        setUserResults([]);
        setUserSearch("");
        setSelectedPublicProfile(null);
        setPublicProfileBundle(null);
        setSyncStatus("syncing");
        if (event === "SIGNED_IN") console.info("Signed in");
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "SESSION") console.info("Supabase session restored");
        const remote = await loadMovieGramRemoteState(user.id);
        console.info("MovieGram own library restored", {
          watched: Object.keys(remote?.watched || {}).length,
          watchlist: Object.keys(remote?.watchlist || {}).length,
          ratings: Object.keys(remote?.ratings || {}).length,
          reviews: Object.keys(remote?.reviews || {}).length,
          lists: Object.keys(remote?.customLists || {}).length,
          episodes: Object.keys(remote?.episodeProgress || {}).length
        });
        let loadedProfile = defaultProfileForUser(user);
        let profileNotice = "";
        try {
          loadedProfile = await loadOrCreateSupabaseProfile(user);
        } catch {
          profileNotice = "Profile sync needs the profiles table migration.";
        }
        if (!alive) return;
        applyRemoteState(remote, user.id);
        setProfileIdentity(loadedProfile);
        setProfileMessage(profileNotice);
        setRemoteReady(true);
        setSyncStatus("synced");
        setAuthLoading(false);
        remoteHydrating.current = false;
      } catch (error) {
        console.error("MovieGram own library restore error", error);
        if (!alive) return;
        activeDataOwner.current = user.id;
        const userState = readOwnedLocalState(user.id, { fallbackToLegacy: false });
        applyLocalState(userState, user.id);
        try {
          const loadedProfile = await loadOrCreateSupabaseProfile(user);
          if (alive) setProfileIdentity(loadedProfile);
        } catch {
          if (alive) setProfileIdentity(defaultProfileForUser(user));
        }
        setRemoteReady(true);
        setSyncStatus("local");
        setAuthLoading(false);
        remoteHydrating.current = false;
      }
    }

    async function hydrateSession() {
      setAuthLoading(true);
      setSyncStatus("checking");
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      if (error) {
        console.error("MovieGram Supabase session restore error", error);
        setSupabaseSession(null);
        setSupabaseUser(null);
        setRemoteReady(false);
        setSyncStatus("guest");
        setAuthLoading(false);
        return;
      }
      if (!data.session) console.info("No Supabase session, using guest mode");
      await applySession(data.session || null, "SESSION");
    }

    hydrateSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "SIGNED_OUT"].includes(event)) return;
      applySession(session || null, event);
    });

    return () => {
      alive = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [applyLocalState, applyRemoteState]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const refreshSocialFoundation = useCallback(async () => {
    if (!supabaseUser) {
      setSocialProfiles([]);
      setFollowerProfiles([]);
      setFollowingProfiles([]);
      setSocialActivity([]);
      setRecentActivity([]);
      setRecentReviews([]);
      setNotifications([]);
      setProfileStats(null);
      setFollowBusyIds({});
      setFollowingIds([]);
      setPendingFollowIds([]);
      setFollowStatuses({});
      setPendingRequests([]);
      setSocialCounts({ followers: 0, following: 0 });
      return;
    }
    try {
      const social = await loadSocialFoundation(supabaseUser.id);
      setSocialProfiles(social.profiles);
      setFollowerProfiles(social.followerProfiles || []);
      setFollowingProfiles(social.followingProfiles || []);
      setSocialActivity(social.activity);
      const [activityRows, notificationRows, statsRows, productLibrary] = await Promise.all([
        loadRecentActivity(supabaseUser.id, 30),
        loadNotifications(supabaseUser.id, 30),
        loadProductStats(supabaseUser.id),
        loadProductLibrary(supabaseUser.id)
      ]);
      setRecentActivity(activityRows);
      setNotifications(notificationRows);
      if (productLibrary) {
        const scopedCache = readOwnedLocalState(supabaseUser.id, { fallbackToLegacy: false });
        const legacyCache = readLegacyLocalState();
        const mergedLibrary = mergeLibrarySources({
          current: latestLocalState.current,
          scoped: scopedCache,
          legacy: legacyCache,
          remote: productLibrary
        });
        setWatched(mergedLibrary.watched);
        setWatchlist(mergedLibrary.watchlist);
        setRatings(mergedLibrary.ratings);
        setReviews(mergedLibrary.reviews);
        setCustomLists(mergedLibrary.customLists);
        persistOwnedLocalState(supabaseUser.id, {
          ...latestLocalState.current,
          watchlist: mergedLibrary.watchlist,
          watched: mergedLibrary.watched,
          ratings: mergedLibrary.ratings,
          reviews: mergedLibrary.reviews,
          favorites: mergedLibrary.favorites,
          customLists: mergedLibrary.customLists
        }, { writeLegacy: true });
        setRecentReviews(productLibrary.reviewRows || []);
        setProfileStats({
          watched: Object.keys(mergedLibrary.watched).length,
          watchlist: Object.keys(mergedLibrary.watchlist).length,
          reviews: Object.keys(mergedLibrary.reviews).length,
          lists: Object.keys(mergedLibrary.customLists || {}).length,
          followers: statsRows?.followers ?? social.counts.followers ?? 0,
          following: statsRows?.following ?? social.counts.following ?? 0
        });
        if (!librarySyncLogged.current) {
          librarySyncLogged.current = true;
          console.info("MovieGram library sync summary", {
            localWatched: mergedLibrary.sourceCounts.localWatched,
            supabaseWatched: mergedLibrary.sourceCounts.remoteWatched,
            mergedWatched: Object.keys(mergedLibrary.watched).length,
            localWatchlist: mergedLibrary.sourceCounts.localWatchlist,
            supabaseWatchlist: mergedLibrary.sourceCounts.remoteWatchlist,
            mergedWatchlist: Object.keys(mergedLibrary.watchlist).length,
            reviews: Object.keys(mergedLibrary.reviews).length,
            missingPosters: {
              watched: Object.values(mergedLibrary.watched).filter((item) => !item.poster_path).length,
              watchlist: Object.values(mergedLibrary.watchlist).filter((item) => !item.poster_path).length,
              reviews: Object.values(mergedLibrary.reviews).filter((review) => !review.item?.poster_path).length
            },
            duplicateRemoved: mergedLibrary.duplicateRemoved
          });
        }
      } else {
        setProfileStats(statsRows);
        setRecentReviews([]);
      }
      setFollowingIds(social.followingIds);
      setPendingFollowIds(social.pendingIds || []);
      setFollowStatuses(social.followStatuses || {});
      setPendingRequests(social.pendingRequests || []);
      setSocialCounts(social.counts);
      setSocialError("");
    } catch (error) {
      console.error("MovieGram social foundation load error", error);
      setSocialProfiles([]);
      setFollowerProfiles([]);
      setFollowingProfiles([]);
      setSocialActivity([]);
      setRecentActivity([]);
      setRecentReviews([]);
      setNotifications([]);
      setProfileStats(null);
      setFollowBusyIds({});
      setFollowingIds([]);
      setPendingFollowIds([]);
      setFollowStatuses({});
      setPendingRequests([]);
      setSocialCounts({ followers: 0, following: 0 });
      setSocialError("Run the social foundation migration to enable real friends.");
    }
  }, [supabaseUser]);

  useEffect(() => {
    refreshSocialFoundation();
  }, [refreshSocialFoundation]);

  useEffect(() => {
    if (!supabaseUser) {
      setUserResults([]);
      setUserSearchLoading(false);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const results = await searchPublicProfiles(userSearch, supabaseUser.id);
        if (alive) setUserResults(results);
      } catch {
        if (alive) {
          setUserResults([]);
          setSocialError("User search is unavailable until profiles RLS is updated.");
        }
      } finally {
        if (alive) setUserSearchLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [supabaseUser, userSearch]);

  useEffect(() => {
    if (!supabaseUser || !remoteReady) return;
    if (remoteHydrating.current) return;
    persistOwnedLocalState(supabaseUser.id, latestLocalState.current, { writeLegacy: false });
    setSyncStatus("syncing");
    const timer = window.setTimeout(async () => {
      if (remoteHydrating.current) return;
      try {
        await saveMovieGramRemoteState(supabaseUser.id, {
          watchlist,
          watched,
          favorites,
          ratings,
          reviews,
          episodeProgress,
          customLists
        });
        setSyncStatus("synced");
      } catch (error) {
        console.error("MovieGram own library save error", error);
        setSyncStatus("local");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [supabaseUser, remoteReady, watchlist, watched, favorites, ratings, reviews, episodeProgress, customLists]);

  useEffect(() => {
    async function loadRows() {
      setLoadingRows(true);
      try {
        const settled = await Promise.allSettled(contentSections.map(async (section) => {
          const data = await apiFetch(section.endpoint, { page: 1, ...(section.params || {}) });
          return [section.id, dedupe(normalize(data.results)).slice(0, 16)];
        }));
        const next = { ...fallbackRows };
        Object.assign(next, Object.fromEntries(
          settled
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
        ));
        setRows(next);
      } catch {
        setRows(fallbackRows);
      } finally {
        setLoadingRows(false);
      }
    }
    loadRows();
  }, [apiFetch]);

  useEffect(() => {
    async function loadExplore() {
      const tab = exploreTabs.find((item) => item.id === activeExplore);
      if (!tab) return;
      setActiveExplorePage(1);
      setExploreHasMore(true);
      setTabLoading(true);
      try {
        const data = await apiFetch(tab.endpoint, { page: 1 });
        const results = normalize(data.results);
        setTabResults(sortResults(dedupe(results)).slice(0, 20));
        setExploreHasMore(results.length > 0 && (!data.total_pages || data.total_pages > 1));
      } catch {
        setTabResults([]);
        setExploreHasMore(false);
      } finally {
        setTabLoading(false);
      }
    }
    loadExplore();
  }, [activeExplore, apiFetch]);

  const loadMoreExplore = useCallback(async () => {
    const tab = exploreTabs.find((item) => item.id === activeExplore);
    if (!tab || tabLoading || !exploreHasMore) return;
    const nextPage = activeExplorePage + 1;
    setTabLoading(true);
    try {
      const data = await apiFetch(tab.endpoint, { page: nextPage });
      const results = normalize(data.results);
      setTabResults((current) => sortResults(dedupe([...current, ...results])).slice(0, 60));
      setActiveExplorePage(nextPage);
      setExploreHasMore(results.length > 0 && (!data.total_pages || nextPage < data.total_pages));
    } catch {
      // Keep the existing results visible if pagination fails.
      setExploreHasMore(false);
    } finally {
      setTabLoading(false);
    }
  }, [activeExplore, activeExplorePage, apiFetch, exploreHasMore, tabLoading]);

  useEffect(() => {
    async function loadExploreHub() {
      setExploreLoading(true);
      try {
        const settled = await Promise.allSettled(exploreHubSections.map(async (section) => {
          const data = await apiFetch(section.endpoint, { page: 1 });
          return [section.id, dedupe(normalize(data.results)).slice(0, 16)];
        }));
        const next = { ...exploreRows };
        Object.assign(next, Object.fromEntries(
          settled
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
        ));
        setExploreRows(next);
      } catch {
        setExploreRows((current) => current);
      } finally {
        setExploreLoading(false);
      }
    }

    async function loadActors() {
      setActorsLoading(true);
      try {
        const data = await apiFetch("/person/popular", { page: 1 });
        setPopularActors((data.results || []).slice(0, 14));
      } catch {
        setPopularActors(actorFallbacks);
      } finally {
        setActorsLoading(false);
      }
    }

    loadExploreHub();
    loadActors();
  }, [apiFetch]);

  const search = useCallback(async (page = 1, append = false) => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchTotalPages(1);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await apiFetch("/search/multi", { query: debouncedQuery, include_adult: "false", page });
      const merged = append ? dedupe([...searchResults, ...normalizeSearch(data.results)]) : dedupe(normalizeSearch(data.results));
      setSearchResults(sortResults(merged, debouncedQuery));
      setSearchPage(data.page || page);
      setSearchTotalPages(Math.min(data.total_pages || 1, 500));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [apiFetch, debouncedQuery, searchResults]);

  useEffect(() => {
    search(1, false);
  }, [debouncedQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      setExploreUserResults([]);
      setExploreUserLoading(false);
      return;
    }
    let alive = true;
    async function loadExploreUsers() {
      setExploreUserLoading(true);
      try {
        const results = await searchPublicProfiles(debouncedQuery, supabaseUser?.id || null);
        if (alive) setExploreUserResults(results);
      } catch (error) {
        console.error("MovieGram Explore profile search error", error);
        if (alive) setExploreUserResults([]);
      } finally {
        if (alive) setExploreUserLoading(false);
      }
    }
    loadExploreUsers();
    return () => {
      alive = false;
    };
  }, [debouncedQuery, supabaseUser]);

  const loadNextSearch = useCallback(() => {
    if (!debouncedQuery || searchLoading || searchPage >= searchTotalPages) return;
    search(searchPage + 1, true);
  }, [debouncedQuery, search, searchLoading, searchPage, searchTotalPages]);

  const sentinelRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    if (!node) return;
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadNextSearch();
    }, { rootMargin: "280px" });
    observer.current.observe(node);
  }, [loadNextSearch]);

  useEffect(() => {
    async function loadDetails() {
      if (!selected) return;
      setDetailsLoading(true);
      setDetails(null);
      setWatchProviders(null);
      try {
        const type = mediaType(selected);
        const append = type === "tv"
          ? "credits,aggregate_credits,videos,similar,recommendations,external_ids,content_ratings"
          : "credits,videos,similar,recommendations,external_ids,release_dates";
        const data = await apiFetch(`/${type}/${selected.id}`, { append_to_response: append });
        setDetails({ ...data, media_type: type });
      } catch {
        setDetails(null);
      } finally {
        setDetailsLoading(false);
      }
    }
    loadDetails();
  }, [apiFetch, selected]);

  useEffect(() => {
    async function loadWatchProviders() {
      if (!selected?.id) {
        setWatchProviders(null);
        return;
      }
      try {
        const type = mediaType(selected);
        const data = await apiFetch(`/${type}/${selected.id}/watch/providers`);
        const regionData = data?.results?.IN || {};
        const normalizeProviderBucket = (items = []) => items.map((provider) => ({
          id: provider.provider_id,
          name: provider.provider_name,
          logo_path: provider.logo_path,
          link: regionData.link || ""
        }));
        setWatchProviders({
          region: "IN",
          link: regionData.link || "",
          stream: normalizeProviderBucket(regionData.flatrate),
          rent: normalizeProviderBucket(regionData.rent),
          buy: normalizeProviderBucket(regionData.buy)
        });
      } catch {
        setWatchProviders(null);
      }
    }
    loadWatchProviders();
  }, [apiFetch, selected]);

  useEffect(() => {
    async function loadExternalRatings() {
      if (!selected) {
        setExternalRatings([]);
        return;
      }
      const normalized = { ...selected, media_type: mediaType(selected) };
      const cached = stored(externalRatingCacheKey(normalized), null);
      if (cached) {
        setExternalRatings(cached);
        return;
      }
      const imdbId = details?.external_ids?.imdb_id;
      const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
      if (!imdbId || !apiKey || typeof window === "undefined") {
        setExternalRatings([]);
        return;
      }
      try {
        const response = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(apiKey)}`);
        if (!response.ok) throw new Error("OMDb request failed.");
        const parsed = parseOmdbRatings(await response.json());
        setExternalRatings(parsed);
        persist(externalRatingCacheKey(normalized), parsed);
      } catch {
        setExternalRatings([]);
      }
    }
    loadExternalRatings();
  }, [details, selected]);

  const feedItems = useMemo(() => {
    if (socialActivity.length) return socialActivity;
    if (supabaseUser) return [];
    return Array.from({ length: feedPage }, (_, page) => feedSeeds.map((item, index) => ({
      ...item,
      id: `${item.id}-${page}`,
      time: page === 0 ? item.time : `${page + index + 1}d`
    }))).flat();
  }, [feedPage, socialActivity, supabaseUser]);

  const recommended = useMemo(() => {
    const saved = Object.values(watchlist);
    const clickedKeys = Object.keys(clickSignals).sort((a, b) => clickSignals[b] - clickSignals[a]);
    const all = dedupe([...saved, ...(rows.trending || []), ...(rows.movies || []), ...(rows.series || []), ...(rows.anime || [])]);
    if (clickedKeys.length === 0 && saved.length === 0) return all.slice(0, 12);
    return all
      .sort((a, b) => (clickSignals[keyOf(b)] || 0) + (watchlist[keyOf(b)] ? 4 : 0) - ((clickSignals[keyOf(a)] || 0) + (watchlist[keyOf(a)] ? 4 : 0)))
      .slice(0, 12);
  }, [clickSignals, rows, watchlist]);

  const intelligenceRows = useMemo(() => {
    const saved = Object.values(watchlist);
    const watchedItems = Object.values(watched);
    const all = dedupe([...(rows.trending || []), ...(rows.movies || []), ...(rows.series || []), ...(rows.anime || []), ...fallbackRows.trending, ...fallbackRows.movies, ...fallbackRows.series, ...fallbackRows.anime]);
    const watchedKeys = new Set(watchedItems.map((item) => keyOf(item)));
    const hasWatched = (needle) => watchedItems.some((item) => titleOf(item).toLowerCase().includes(needle));
    const hasRated = (needle, min = 4) => [...watchedItems, ...saved, ...all].some((item) => titleOf(item).toLowerCase().includes(needle) && (ratingForItem(item, ratings) || 0) >= min);
    const hasSciFiTaste = hasWatched("interstellar") || hasWatched("dune") || hasRated("interstellar", 4) || saved.some((item) => ["interstellar", "dune"].some((needle) => titleOf(item).toLowerCase().includes(needle)));
    const available = all.filter((item) => !hiddenRecs[keyOf(item)] && !watchedKeys.has(keyOf(item)));
    const byTitle = (needles) => available.filter((item) => needles.some((needle) => titleOf(item).toLowerCase().includes(needle)));
    const byMedia = (type) => available.filter((item) => mediaType(item) === type);
    const score = (item) => (clickSignals[keyOf(item)] || 0) + (watchlist[keyOf(item)] ? 5 : 0) + (ratingForItem(item, ratings) || 0) + (item.vote_average || 0) / 2;
    const sorted = [...available].sort((a, b) => score(b) - score(a));
    const crimeDramaPool = dedupe([
      ...byTitle(["the boys", "batman", "parasite", "oppenheimer"]),
      ...byMedia("tv").filter((item) => ["crime", "bad", "boys", "dragon", "game"].some((needle) => titleOf(item).toLowerCase().includes(needle)))
    ]).sort((a, b) => score(b) - score(a));
    const sciFiPool = dedupe([
      ...byTitle(["interstellar", "dune", "oppenheimer", "attack on titan"]),
      ...available.filter((item) => ["space", "sci", "future", "mind", "dune"].some((needle) => `${titleOf(item)} ${item.overview || ""}`.toLowerCase().includes(needle)))
    ]).sort((a, b) => score(b) - score(a));
    const friendPool = dedupe([...(rows.trending || []), ...fallbackRows.trending, ...fallbackRows.movies]).filter((item) => !hiddenRecs[keyOf(item)] && !watchedKeys.has(keyOf(item))).sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    const blendPool = dedupe([...(rows.series || []), ...fallbackRows.series, ...fallbackRows.anime]).filter((item) => !hiddenRecs[keyOf(item)] && !watchedKeys.has(keyOf(item))).sort((a, b) => score(b) - score(a));
    return {
      breakingBad: (hasWatched("breaking bad") ? crimeDramaPool : []).slice(0, 8),
      interstellar: (hasRated("interstellar", 4) || hasWatched("interstellar") ? sciFiPool : []).slice(0, 8),
      sciFi: (hasSciFiTaste ? sciFiPool : []).slice(0, 8),
      friend: friendPool.slice(0, 8),
      blend: blendPool.slice(0, 8),
      hidden: sorted.filter((item) => (item.vote_average || 0) >= 7.8).slice(-8).reverse()
    };
  }, [clickSignals, hiddenRecs, ratings, rows, watched, watchlist]);

  function openItem(item) {
    if (item?.media_type === "person") {
      setSelectedPerson(item);
      return;
    }
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const nextSignals = { ...clickSignals, [key]: (clickSignals[key] || 0) + 1 };
    const nextContinue = [normalized, ...continueWatching.filter((entry) => keyOf(entry) !== key)].slice(0, 10);
    setSelected(normalized);
    setClickSignals(nextSignals);
    setContinueWatching(nextContinue);
    recordProfileActivity("opened", normalized, "details");
    persist("moviegram.clickSignals", nextSignals);
    persist("moviegram.continueWatching", nextContinue);
  }

  function openPerson(person) {
    setSelectedPerson({ ...person, media_type: "person" });
  }

  async function handleAuthSubmit(mode, email, password) {
    if (!supabase) {
      setAuthMessage("Supabase env vars are missing. Guest mode is active.");
      return;
    }
    setAuthActionLoading(true);
    setAuthMessage("");
    try {
      if (mode === "reset") {
        const result = await supabase.auth.resetPasswordForEmail(email);
        if (result.error) throw result.error;
        setAuthMessage("Password reset email sent if account exists.");
        return;
      }
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      const session = result.data.session || null;
      if (session?.user) {
        setSupabaseSession(session);
        setSupabaseUser(session.user);
        setSyncStatus("syncing");
        setAuthOpen(false);
        setAuthMessage("Logged in.");
        console.info("Signed in");
      } else {
        setSupabaseSession(null);
        setSupabaseUser(null);
        setSyncStatus("guest");
        setAuthMessage(mode === "signup" ? "Check your email to verify your account." : "Email verification is required before login.");
      }
    } catch (error) {
      const raw = `${error.message || ""}`.toLowerCase();
      if (raw.includes("email not confirmed") || raw.includes("not confirmed")) {
        setAuthMessage("Please verify your email before logging in.");
      } else if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
        setAuthMessage("Incorrect email or password.");
      } else if (raw.includes("user not found")) {
        setAuthMessage("Incorrect email or password.");
      } else {
        setAuthMessage(error.message || "Authentication failed.");
      }
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    setAuthActionLoading(true);
    setAuthMessage("");
    try {
      if (supabaseUser) {
        persistOwnedLocalState(supabaseUser.id, latestLocalState.current, { writeLegacy: false });
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      activeDataOwner.current = "guest";
      const guestState = readOwnedLocalState("guest", { fallbackToLegacy: false });
      applyLocalState(guestState, "guest");
      setProfileIdentity(readGuestProfile());
      setProfileMessage("");
      setSocialProfiles([]);
      setFollowerProfiles([]);
      setFollowingProfiles([]);
      setSocialActivity([]);
      setRecentActivity([]);
      setRecentReviews([]);
      setNotifications([]);
      setProfileStats(null);
      setFollowBusyIds({});
      setFollowingIds([]);
      setPendingFollowIds([]);
      setFollowStatuses({});
      setPendingRequests([]);
      setSocialCounts({ followers: 0, following: 0 });
      setUserResults([]);
      setUserSearch("");
      setSelectedPublicProfile(null);
      setPublicProfileBundle(null);
      setSupabaseSession(null);
      setSupabaseUser(null);
      setRemoteReady(false);
      setSyncStatus("guest");
      setGuestAccepted(false);
      setAuthOnboardingActive(false);
      setAuthOpen(false);
    } catch (error) {
      setAuthMessage(error.message || "Could not log out.");
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleProfileSave(nextProfile) {
    const validation = validateProfileIdentity(nextProfile);
    if (validation.error) return { error: validation.error };
    setProfileSaving(true);
    setProfileMessage("");
    try {
      if (supabaseUser) {
        const savedProfile = await saveSupabaseProfile(supabaseUser, { ...profileIdentity, ...validation.value, avatar_url: nextProfile.avatar_url || "", is_private: Boolean(nextProfile.is_private) });
        setProfileIdentity(savedProfile);
        setProfileMessage("Profile saved.");
        return { profile: savedProfile };
      }
      const guestProfile = {
        ...readGuestProfile(),
        ...validation.value,
        avatar_url: nextProfile.avatar_url || "",
        is_private: Boolean(nextProfile.is_private),
        email: "",
        updated_at: new Date().toISOString()
      };
      persistGuestProfile(guestProfile);
      setProfileIdentity(guestProfile);
      setProfileMessage("Saved locally.");
      return { profile: guestProfile };
    } catch (error) {
      const message = error.message?.includes("duplicate") || error.message?.includes("unique")
        ? "That username is already taken."
        : error.message || "Could not save profile.";
      setProfileMessage(message);
      return { error: message };
    } finally {
      setProfileSaving(false);
    }
  }

  async function toggleFollow(profile) {
    if (!supabase || !supabaseUser || !profile?.id || profile.id === supabaseUser.id) return;
    if (followBusyIds[profile.id]) return;
    const currentStatus = followStatuses[profile.id] || "";
    const shouldRemove = currentStatus === "accepted" || currentStatus === "pending";
    setFollowBusyIds((current) => ({ ...current, [profile.id]: true }));
    try {
      if (shouldRemove) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", supabaseUser.id)
          .eq("following_id", profile.id);
        if (error) throw error;
      } else {
        const result = await followUser(supabaseUser.id, profile);
        if (!result) throw new Error("Follow table is unavailable.");
        const actorName = profileIdentity?.username || profileIdentity?.display_name || "Someone";
        const isRequest = result.status === "pending";
        await createNotification({
          userId: profile.id,
          actorId: supabaseUser.id,
          type: isRequest ? "follow_request" : "follow",
          entityType: isRequest ? "follow" : "profile",
          entityId: isRequest ? result.id : supabaseUser.id,
          message: isRequest ? `${actorName} requested to follow you` : `${actorName} started following you`,
          metadata: { action_state: isRequest ? "pending" : "sent", follower_id: supabaseUser.id }
        });
        if (!isRequest) {
          createActivityEvent(supabaseUser.id, "follow", null, { entityId: profile.id, title: publicProfileName(profile), username: profile.username }).catch(() => {});
        }
      }
      const nextStatus = shouldRemove ? "" : profile.is_private ? "pending" : "accepted";
      setFollowStatuses((current) => {
        const next = { ...current };
        if (shouldRemove) delete next[profile.id];
        else next[profile.id] = nextStatus;
        return next;
      });
      setFollowingIds((current) => shouldRemove ? current.filter((id) => id !== profile.id) : (profile.is_private ? current : [...new Set([...current, profile.id])]));
      setPendingFollowIds((current) => shouldRemove ? current.filter((id) => id !== profile.id) : (profile.is_private ? [...new Set([...current, profile.id])] : current));
      await refreshSocialFoundation();
      if (selectedPublicProfile?.id === profile.id) {
        await openPublicProfile(profile);
      }
    } catch (error) {
      console.error("MovieGram follow action error", error);
      setSocialError("Follow action is unavailable until the follows table/RLS is ready.");
    } finally {
      setFollowBusyIds((current) => {
        const next = { ...current };
        delete next[profile.id];
        return next;
      });
    }
  }

  async function respondFollowRequest(requesterId, status, notification = null) {
    if (!supabase || !supabaseUser || !requesterId) return;
    try {
      if (status === "accepted") {
        const result = await acceptFollowRequest(supabaseUser.id, requesterId);
        if (!result) throw new Error("Follow request table is unavailable.");
        await createNotification({
          userId: requesterId,
          actorId: supabaseUser.id,
          type: "follow_accept",
          entityType: "follow",
          entityId: result.id,
          message: `${profileIdentity?.username || profileIdentity?.display_name || "Someone"} accepted your follow request`,
          metadata: { action_state: "accepted", following_id: supabaseUser.id }
        });
      } else {
        await declineFollowRequest(supabaseUser.id, requesterId);
      }
      if (notification?.id) {
        await markNotificationRead(notification.id, { ...(notification.metadata || {}), action_state: status });
        setNotifications((current) => current.map((entry) => entry.id === notification.id ? { ...entry, is_read: true, metadata: { ...(entry.metadata || {}), action_state: status } } : entry));
      }
      setPendingRequests((current) => current.filter((request) => request.id !== requesterId));
      await refreshSocialFoundation();
    } catch (error) {
      console.error("MovieGram follow request action error", error);
      setSocialError("Follow request action is unavailable until follow request RLS is ready.");
    }
  }

  async function markSingleNotificationRead(notification) {
    if (!notification?.id) return;
    setNotifications((current) => current.map((entry) => entry.id === notification.id ? { ...entry, is_read: true } : entry));
    await markNotificationRead(notification.id, notification.metadata || {});
  }

  async function removeFollower(profile) {
    if (!supabase || !supabaseUser || !profile?.id || profile.id === supabaseUser.id) return;
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", profile.id)
        .eq("following_id", supabaseUser.id);
      if (error) throw error;
      await refreshSocialFoundation();
    } catch (error) {
      console.error("MovieGram remove follower error", error);
      setSocialError("Remove follower is unavailable until follows RLS is ready.");
    }
  }

  async function openPublicProfile(profile) {
    if (!profile?.id) return;
    setActiveSocial("publicProfile");
    setSelectedPublicProfile(profile);
    setPublicProfileBundle({ profile, stats: { followers: profile.follower_count || 0, following: profile.following_count || 0, watched: 0 }, activity: [] });
    if (!supabase) return;
    try {
      const bundle = await loadPublicProfileBundle(profile.id, supabaseUser?.id);
      setPublicProfileBundle(bundle);
      setSelectedPublicProfile(bundle.profile);
      setSocialError("");
    } catch (error) {
      console.error("MovieGram public profile load error", error);
      setSocialError("Public profile activity is unavailable until social RLS is ready.");
    }
  }

  function logActivity(action, item, metadata = {}) {
    if (!item) return;
    const normalized = { ...item, media_type: mediaType(item) };
    const activityKey = `${action}:${keyOf(normalized)}:${metadata.source || ""}`;
    if (action === "details_open" || action === "viewed_details") {
      const last = detailsOpenActivityRef.current[activityKey] || 0;
      if (Date.now() - last < 30 * 60 * 1000) return;
      detailsOpenActivityRef.current[activityKey] = Date.now();
    }
    const activityMetadata = {
      poster_path: normalized.poster_path || metadata.poster_path || "",
      item_key: keyOf(normalized),
      ...metadata
    };
    recordProfileActivity(action, normalized, activityMetadata.source || "app");
    if (!supabaseUser) return;
    createActivityEvent(supabaseUser.id, action, normalized, activityMetadata)
      .then(() => refreshSocialFoundation())
      .catch((error) => console.error("MovieGram activity save error", { table: "activity_events", action, message: error?.message, error }));
  }

  function recordProfileActivity(type, item, source = "app") {
    if (!item?.id || item?.media_type === "person") return;
    const normalized = compactStoredItem({ ...item, media_type: mediaType(item) });
    if (!normalized) return;
    const eventKey = `${type}:${keyOf(normalized)}`;
    const now = new Date().toISOString();
    const next = {
      ...profileActivity,
      [eventKey]: {
        type,
        item: normalized,
        timestamp: now,
        source
      }
    };
    const trimmed = Object.fromEntries(Object.entries(next)
      .sort(([, a], [, b]) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 250));
    setProfileActivity(trimmed);
    persist("moviegram.profileActivity", trimmed);
    persist(ownerStorageKey(activeDataOwner.current || "guest", MOVIEGRAM_LOCAL_KEYS.profileActivity), trimmed);
  }

  function recordReelActivity(type, item, metadata = {}) {
    recordProfileActivity(type, item, "reels");
    logActivity(type, { ...item, media_type: mediaType(item) }, metadata);
  }

  function syncTrackingNow(actionName, overrides = {}) {
    if (!supabaseUser?.id || !remoteReady || remoteHydrating.current) return;
    const nextState = normalizeLocalState({
      watchlist,
      watched,
      episodeProgress,
      ratings,
      reviews,
      favorites,
      customLists,
      ...latestLocalState.current,
      ...overrides
    });
    latestLocalState.current = nextState;
    persistOwnedLocalState(supabaseUser.id, nextState, { writeLegacy: false });
    saveMovieGramRemoteState(supabaseUser.id, nextState)
      .then(() => setSyncStatus("synced"))
      .catch((error) => {
        console.error("MovieGram tracking action save error", { action: actionName, message: error?.message, table: error?.table, error });
        setSyncStatus("local");
      });
  }

  function toggleWatchlist(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const normalizedWatchlist = normalizeTrackingCollection(watchlist);
    const nextWatchlist = { ...normalizedWatchlist };
    if (hasStoredItem(normalized, nextWatchlist)) {
      const removed = removeMatchingItem(nextWatchlist, normalized);
      setWatchlist(removed);
      persist("moviegram.watchlist", removed);
      if (supabaseUser?.id) removeFromSupabaseWatchlist(supabaseUser.id, normalized);
      setProfileStats((current) => current ? { ...current, watchlist: Math.max(0, (current.watchlist || 0) - 1) } : current);
      syncTrackingNow("watchlist_remove", { watchlist: removed });
    } else {
      nextWatchlist[key] = normalized;
      const nextWatched = removeMatchingItem(normalizeTrackingCollection(watched), normalized);
      setWatchlist(nextWatchlist);
      setWatched(nextWatched);
      persist("moviegram.watchlist", nextWatchlist);
      persist("moviegram.watched", nextWatched);
      if (supabaseUser?.id) {
        addToSupabaseWatchlist(supabaseUser.id, normalized);
        removeSupabaseWatched(supabaseUser.id, normalized);
      }
      setProfileStats((current) => current ? { ...current, watchlist: (current.watchlist || 0) + 1 } : current);
      syncTrackingNow("watchlist_add", { watchlist: nextWatchlist, watched: nextWatched });
      logActivity("watchlist_add", normalized);
    }
  }

  function toggleWatchAsap(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    if (hasStoredItem(normalized, normalizeTrackingCollection(watched))) return;
    const key = keyOf(normalized);
    const normalizedWatchlist = normalizeTrackingCollection(watchlist);
    const existing = Object.values(normalizedWatchlist).find((entry) => itemMatches(entry, normalized));
    const isAsap = Boolean(existing?.watch_asap || existing?.watchAsap);
    const nextWatchlist = removeMatchingItem(normalizedWatchlist, normalized);
    const nextItem = {
      ...(existing || normalized),
      ...normalized,
      watch_asap: !isAsap,
      watchAsap: !isAsap,
      watch_asap_at: !isAsap ? (existing?.watch_asap_at || new Date().toISOString()) : undefined
    };
    nextWatchlist[key] = Object.fromEntries(Object.entries(nextItem).filter(([, value]) => value !== undefined));
    setWatchlist(nextWatchlist);
    persist("moviegram.watchlist", nextWatchlist);
    if (supabaseUser?.id) addToSupabaseWatchlist(supabaseUser.id, nextWatchlist[key]);
    if (!existing) setProfileStats((current) => current ? { ...current, watchlist: (current.watchlist || 0) + 1 } : current);
    syncTrackingNow(isAsap ? "watch_asap_remove" : "watch_asap_add", { watchlist: nextWatchlist });
    if (!isAsap) logActivity("watch_asap", normalized, { watch_asap: true });
  }

  function knownEpisodeKeysForShow(show) {
    const source = details?.id === show.id && mediaType(show) === "tv" ? details : show;
    return normalSeasonsOf(source).flatMap((season) => (
      Array.from({ length: season.episode_count || 0 }, (_, index) => episodeKey(show.id, season.season_number, index + 1))
    ));
  }

  function watchedAtForChoice(choice, pickedDate) {
    if (choice === "unknown") return undefined;
    if (choice === "yesterday") {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date.toISOString();
    }
    if (choice === "picked" && pickedDate) return new Date(`${pickedDate}T20:00:00`).toISOString();
    return new Date().toISOString();
  }

  function watchedPayload(normalized, watchedAt) {
    const payload = {
      id: normalized.id,
      media_type: normalized.media_type,
      title: normalized.title,
      name: normalized.name,
      poster_path: normalized.poster_path,
      backdrop_path: normalized.backdrop_path,
      vote_average: normalized.vote_average,
      release_date: normalized.release_date,
      first_air_date: normalized.first_air_date
    };
    if (watchedAt) payload.watchedAt = watchedAt;
    return payload;
  }

  function toggleWatched(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const normalizedWatched = normalizeTrackingCollection(watched);
    if (hasStoredItem(normalized, normalizedWatched)) {
      unmarkWatched(normalized);
      return;
    }
    if (!isReleased(normalized)) {
      if (typeof window !== "undefined") window.alert(releaseMessage(normalized));
      return;
    }
    const knownEpisodeKeys = normalized.media_type === "tv" ? knownEpisodeKeysForShow(normalized) : [];
    const source = details?.id === normalized.id ? details : normalized;
    const knownEpisodeCount = knownEpisodeKeys.length || normalSeasonsOf(source).reduce((total, season) => total + (season.episode_count || 0), 0) || source.number_of_episodes || 0;
    setWatchedAction({
      type: "item",
      item: normalized,
      title: normalized.media_type === "tv" ? "Mark show watched" : "Mark watched",
      message: normalized.media_type === "tv"
        ? (knownEpisodeCount ? `Mark all ${knownEpisodeCount} episodes of ${titleOf(normalized)} as watched?` : `Mark all available episodes of ${titleOf(normalized)} as watched?`)
        : `When did you watch ${titleOf(normalized)}?`
    });
  }

  function unmarkWatched(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const nextWatched = normalizeTrackingCollection(watched);
    if (hasStoredItem(normalized, nextWatched)) {
      const removed = removeMatchingItem(nextWatched, normalized);
      setWatched(removed);
      persist("moviegram.watched", removed);
      let nextEpisodesForSync = episodeProgress;
      if (normalized.media_type === "tv") {
        const keys = knownEpisodeKeysForShow(normalized);
        if (keys.length) {
          const nextEpisodes = { ...episodeProgress };
          keys.forEach((episodeProgressKey) => delete nextEpisodes[episodeProgressKey]);
          setEpisodeProgress(nextEpisodes);
          persist("moviegram.episodeProgress", nextEpisodes);
          nextEpisodesForSync = nextEpisodes;
        }
      }
      syncTrackingNow("watched_remove", { watched: removed, episodeProgress: nextEpisodesForSync });
      if (supabaseUser?.id) removeSupabaseWatched(supabaseUser.id, normalized);
      setProfileStats((current) => current ? { ...current, watched: Math.max(0, (current.watched || 0) - 1) } : current);
    }
  }

  function applyWatchedItem(item, watchedAt) {
    const normalized = { ...item, media_type: mediaType(item) };
    if (!isReleased(normalized)) return;
    const key = keyOf(normalized);
    const nextWatched = { ...normalizeTrackingCollection(watched), [key]: watchedPayload(normalized, watchedAt) };
    const nextWatchlist = removeMatchingItem(normalizeTrackingCollection(watchlist), normalized);
    setWatched(nextWatched);
    setWatchlist(nextWatchlist);
    persist("moviegram.watched", nextWatched);
    persist("moviegram.watchlist", nextWatchlist);
    if (supabaseUser?.id) {
      markSupabaseWatched(supabaseUser.id, normalized, watchedAt);
      removeFromSupabaseWatchlist(supabaseUser.id, normalized);
    }
    setProfileStats((current) => current ? { ...current, watched: (current.watched || 0) + 1, watchlist: hasStoredItem(normalized, watchlist) ? Math.max(0, (current.watchlist || 0) - 1) : current.watchlist } : current);
    let nextEpisodesForSync = episodeProgress;
    if (normalized.media_type === "tv") {
      const keys = knownEpisodeKeysForShow(normalized);
      if (keys.length) {
        const nextEpisodes = { ...episodeProgress };
        keys.forEach((episodeProgressKey) => {
          const parts = parseEpisodeProgressKey(episodeProgressKey);
          if (!parts) return;
          nextEpisodes[episodeProgressKey] = { key: episodeProgressKey, showId: parts.showId, seasonNumber: parts.seasonNumber, episodeNumber: parts.episodeNumber, watchedAt };
        });
        setEpisodeProgress(nextEpisodes);
        persist("moviegram.episodeProgress", nextEpisodes);
        nextEpisodesForSync = nextEpisodes;
      }
    }
    syncTrackingNow("watched_add", { watched: nextWatched, watchlist: nextWatchlist, episodeProgress: nextEpisodesForSync });
    logActivity("watched", normalized, { watchedAt, unknownDate: !watchedAt });
  }

  function seasonEpisodeKeys(show, season) {
    return Array.from({ length: season?.episode_count || 0 }, (_, index) => episodeKey(show.id, season.season_number, index + 1));
  }

  function toggleSeasonWatched(show, season, showDetails) {
    const normalized = { ...show, media_type: "tv" };
    if (!isReleased(normalized)) {
      if (typeof window !== "undefined") window.alert(releaseMessage(normalized));
      return;
    }
    const keys = seasonEpisodeKeys(normalized, season);
    const complete = keys.length > 0 && keys.every((keyName) => episodeProgress[keyName]);
    if (complete) {
      const nextEpisodes = { ...episodeProgress };
      keys.forEach((keyName) => delete nextEpisodes[keyName]);
      const source = showDetails?.id === normalized.id ? showDetails : details;
      const allNormalKeys = normalSeasonsOf(source || {}).flatMap((seasonItem) => seasonEpisodeKeys(normalized, seasonItem));
      const nextWatched = removeMatchingItem(normalizeTrackingCollection(watched), normalized);
      setEpisodeProgress(nextEpisodes);
      persist("moviegram.episodeProgress", nextEpisodes);
      if (!allNormalKeys.every((keyName) => nextEpisodes[keyName])) {
        setWatched(nextWatched);
        persist("moviegram.watched", nextWatched);
      }
      syncTrackingNow("season_unwatched", { episodeProgress: nextEpisodes, watched: nextWatched });
      return;
    }
    setWatchedAction({
      type: "season",
      item: normalized,
      season,
      showDetails,
      title: "Mark season watched",
      message: `Mark all ${season.episode_count || keys.length || "available"} episodes of ${season.name || `Season ${season.season_number}`} as watched?`
    });
  }

  function applySeasonWatched(show, season, showDetails, watchedAt) {
    const normalized = { ...show, media_type: "tv" };
    if (!isReleased(normalized)) return;
    const keys = seasonEpisodeKeys(normalized, season);
    const nextEpisodes = { ...episodeProgress };
    keys.forEach((keyName) => {
      const parts = parseEpisodeProgressKey(keyName);
      if (!parts) return;
      nextEpisodes[keyName] = { key: keyName, showId: parts.showId, seasonNumber: parts.seasonNumber, episodeNumber: parts.episodeNumber, watchedAt };
    });
    const source = showDetails?.id === normalized.id ? showDetails : details;
    const allNormalKeys = normalSeasonsOf(source || {}).flatMap((seasonItem) => seasonEpisodeKeys(normalized, seasonItem));
    if (allNormalKeys.length > 0 && allNormalKeys.every((keyName) => nextEpisodes[keyName])) {
      const nextWatched = { ...normalizeTrackingCollection(watched), [keyOf(normalized)]: watchedPayload(normalized, watchedAt) };
      const nextWatchlist = removeMatchingItem(normalizeTrackingCollection(watchlist), normalized);
      setWatched(nextWatched);
      setWatchlist(nextWatchlist);
      persist("moviegram.watched", nextWatched);
      persist("moviegram.watchlist", nextWatchlist);
      syncTrackingNow("show_completed", { watched: nextWatched, watchlist: nextWatchlist, episodeProgress: nextEpisodes });
      logActivity("show_completed", normalized, { watchedAt, seasonNumber: season.season_number });
    }
    setEpisodeProgress(nextEpisodes);
    persist("moviegram.episodeProgress", nextEpisodes);
    syncTrackingNow("season_completed", { episodeProgress: nextEpisodes });
    logActivity("season_completed", normalized, { watchedAt, seasonNumber: season.season_number });
  }

  function applyWatchedAction(choice, pickedDate) {
    if (!watchedAction) return;
    const watchedAt = watchedAtForChoice(choice, pickedDate);
    if (watchedAction.type === "season") applySeasonWatched(watchedAction.item, watchedAction.season, watchedAction.showDetails, watchedAt);
    else if (watchedAction.type === "episode") applyEpisodeWatched(watchedAction.item, watchedAction.episode, watchedAction.season, watchedAction.showDetails, watchedAt);
    else applyWatchedItem(watchedAction.item, watchedAt);
    setWatchedAction(null);
  }

  function toggleEpisodeWatched(show, episode, season, showDetails) {
    const normalized = { ...show, media_type: "tv" };
    const episodeRelease = episode?.air_date ? { ...normalized, first_air_date: episode.air_date, release_date: "" } : normalized;
    if (!isReleased(episodeRelease)) {
      if (typeof window !== "undefined") window.alert(releaseMessage(episodeRelease));
      return;
    }
    const progressKey = episodeKey(normalized.id, episode.season_number, episode.episode_number);
    if (!episodeProgress[progressKey]) {
      setWatchedAction({
        type: "episode",
        item: normalized,
        episode,
        season,
        showDetails,
        title: "Mark episode watched",
        message: `When did you watch S${episode.season_number} E${episode.episode_number} - ${episode.name || "Episode"}?`
      });
      return;
    }
    const nextEpisodes = { ...episodeProgress };
    delete nextEpisodes[progressKey];
    syncEpisodeProgress(normalized, showDetails, nextEpisodes);
  }

  function applyEpisodeWatched(show, episode, season, showDetails, watchedAt) {
    const normalized = { ...show, media_type: "tv" };
    const episodeRelease = episode?.air_date ? { ...normalized, first_air_date: episode.air_date, release_date: "" } : normalized;
    if (!isReleased(episodeRelease)) return;
    const progressKey = episodeKey(normalized.id, episode.season_number, episode.episode_number);
    const nextEpisodes = {
      ...episodeProgress,
      [progressKey]: {
        key: progressKey,
        showId: normalized.id,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        watchedAt
      }
    };
    syncEpisodeProgress(normalized, showDetails, nextEpisodes, watchedAt);
    logActivity("episode_watched", normalized, { watchedAt, episodeKey: progressKey, seasonNumber: episode.season_number, episodeNumber: episode.episode_number });
  }

  function syncEpisodeProgress(normalized, showDetails, nextEpisodes, watchedAt) {
    const source = showDetails?.id === normalized.id ? showDetails : details;
    const knownKeys = normalSeasonsOf(source || {}).flatMap((seasonItem) => (
      Array.from({ length: seasonItem.episode_count || 0 }, (_, index) => episodeKey(normalized.id, seasonItem.season_number, index + 1))
    ));
    const nextWatched = normalizeTrackingCollection(watched);
    const allKnownWatched = knownKeys.length > 0 && knownKeys.every((keyName) => Boolean(nextEpisodes[keyName]));
    if (allKnownWatched) {
      nextWatched[keyOf(normalized)] = watchedPayload(normalized, watchedAt);
      const nextWatchlist = removeMatchingItem(normalizeTrackingCollection(watchlist), normalized);
      setWatchlist(nextWatchlist);
      persist("moviegram.watchlist", nextWatchlist);
    } else {
      const cleaned = removeMatchingItem(nextWatched, normalized);
      setWatched(cleaned);
      persist("moviegram.watched", cleaned);
      setEpisodeProgress(nextEpisodes);
      persist("moviegram.episodeProgress", nextEpisodes);
      syncTrackingNow("episode_progress", { watched: cleaned, episodeProgress: nextEpisodes });
      return;
    }

    setWatched(nextWatched);
    setEpisodeProgress(nextEpisodes);
    persist("moviegram.watched", nextWatched);
    persist("moviegram.episodeProgress", nextEpisodes);
    syncTrackingNow("episode_progress", { watched: nextWatched, episodeProgress: nextEpisodes });
  }

  function rateItem(item, value) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const rating = normalizeUserRating(value);
    const next = { ...ratings };
    if (rating) next[key] = rating;
    else delete next[key];
    const nextReviews = { ...reviews };
    const existingReview = nextReviews[key];
    const existingText = existingReview?.text || "";
    if (rating) {
      nextReviews[key] = { ...(existingReview || {}), item: normalized, text: existingText };
      setReviews(nextReviews);
      persist("moviegram.reviews", nextReviews);
    } else if (existingReview && !existingText.trim()) {
      delete nextReviews[key];
      setReviews(nextReviews);
      persist("moviegram.reviews", nextReviews);
    }
    setRatings(next);
    persist("moviegram.ratings", next);
    syncTrackingNow(rating ? "rating_save" : "rating_clear", { ratings: next, reviews: nextReviews });
    if (supabaseUser?.id) saveRatingReview(supabaseUser.id, normalized, { rating, reviewText: existingText });
    setProfileStats((current) => current ? { ...current, reviews: Object.keys(nextReviews).length } : current);
    if (rating) logActivity("rating", normalized, { rating });
  }

  function reviewForItem(item) {
    const entry = reviews[keyOf({ ...item, media_type: mediaType(item) })];
    return entry?.text || "";
  }

  function reviewMetaForItem(item) {
    return reviews[keyOf({ ...item, media_type: mediaType(item) })] || {};
  }

  function saveReview(item, text, options = {}) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const trimmed = text.trim();
    const sheetRating = Number(options.rating || 0);
    const localRating = sheetRating ? normalizeUserRating(sheetRating / 2) : ratingForItem(normalized, ratings);
    const next = { ...reviews };
    if (trimmed) next[key] = { item: normalized, text: trimmed, reviewedAt: new Date().toISOString(), containsSpoiler: Boolean(options.containsSpoiler), visibility: options.visibility || "public" };
    else if (ratings[key] || localRating) next[key] = { item: normalized, text: "", containsSpoiler: Boolean(options.containsSpoiler), visibility: options.visibility || "public" };
    else delete next[key];
    let nextRatings = ratings;
    if (localRating) {
      nextRatings = { ...ratings, [key]: localRating };
      setRatings(nextRatings);
      persist("moviegram.ratings", nextRatings);
    }
    setReviews(next);
    persist("moviegram.reviews", next);
    if (supabaseUser?.id) saveRatingReview(supabaseUser.id, normalized, { rating: sheetRating || localRating || null, reviewText: trimmed, containsSpoiler: Boolean(options.containsSpoiler), visibility: options.visibility || "public" });
    setProfileStats((current) => current ? { ...current, reviews: Object.keys(next).length } : current);
    syncTrackingNow(trimmed ? "review_save" : "review_clear", { reviews: next, ratings: nextRatings });
    if (trimmed) logActivity("review", normalized, { review: trimmed, rating: sheetRating || localRating, spoiler: Boolean(options.containsSpoiler), visibility: options.visibility || "public" });
    else if (sheetRating || localRating) logActivity("rating", normalized, { rating: sheetRating || localRating, visibility: options.visibility || "public" });
    setReviewItem(null);
  }

  function deleteReview(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const next = { ...reviews };
    if (ratings[key]) next[key] = { item: normalized, text: "" };
    else delete next[key];
    setReviews(next);
    persist("moviegram.reviews", next);
    setProfileStats((current) => current ? { ...current, reviews: Object.keys(next).length } : current);
    syncTrackingNow("review_delete", { reviews: next });
    setReviewItem(null);
  }

  async function createCustomList(title, item, options = {}) {
    const id = `list-${Date.now()}`;
    const normalized = { ...item, media_type: mediaType(item) };
    let listId = id;
    if (supabaseUser?.id) {
      const remoteList = await createUserList(supabaseUser.id, { name: title, description: options.description || "", visibility: options.visibility || "public" });
      if (remoteList?.id) {
        listId = remoteList.id;
        addItemToList(supabaseUser.id, remoteList.id, normalized);
      }
    }
    const next = {
      ...customLists,
      [listId]: { id: listId, title, description: options.description || "", privacy: options.visibility || "public", createdAt: new Date().toISOString(), items: [normalized] }
    };
    setCustomLists(next);
    persist("moviegram.customLists", next);
    setProfileStats((current) => current ? { ...current, lists: (current.lists || 0) + 1 } : current);
    syncTrackingNow("custom_list_create", { customLists: next });
    logActivity("list_create", normalized, { listKey: listId, title, description: options.description || "", visibility: options.visibility || "public" });
  }

  function toggleCustomListItem(listId, item) {
    const list = customLists[listId];
    if (!list) return;
    const normalized = { ...item, media_type: mediaType(item) };
    const exists = (list.items || []).some((entry) => itemMatches(entry, normalized));
    const nextItems = exists ? (list.items || []).filter((entry) => !itemMatches(entry, normalized)) : [...(list.items || []), normalized];
    const next = { ...customLists, [listId]: { ...list, items: nextItems, updatedAt: new Date().toISOString() } };
    setCustomLists(next);
    persist("moviegram.customLists", next);
    syncTrackingNow(exists ? "custom_list_remove" : "custom_list_add", { customLists: next });
    if (!exists && supabaseUser?.id && /^[0-9a-f-]{36}$/i.test(listId)) addItemToList(supabaseUser.id, listId, normalized, nextItems.length - 1);
    logActivity(exists ? "list_remove" : "list_add", normalized, { listKey: listId, title: list.title });
  }

  function deleteCustomList(listId) {
    if (!listId || !customLists[listId]) return;
    const next = { ...customLists };
    const removed = next[listId];
    delete next[listId];
    setCustomLists(next);
    persist("moviegram.customLists", next);
    syncTrackingNow("custom_list_delete", { customLists: next });
    if (removed?.items?.[0]) logActivity("custom_list_delete", removed.items[0], { listKey: listId, title: removed.title });
  }

  function renameCustomList(listId, currentTitle, onRenamed) {
    if (!listId || !customLists[listId] || typeof window === "undefined") return;
    const nextTitle = window.prompt("Rename list", currentTitle || customLists[listId].title || "");
    const trimmed = String(nextTitle || "").trim();
    if (!trimmed) return;
    const next = {
      ...customLists,
      [listId]: { ...customLists[listId], title: trimmed, updatedAt: new Date().toISOString() }
    };
    setCustomLists(next);
    persist("moviegram.customLists", next);
    syncTrackingNow("custom_list_rename", { customLists: next });
    onRenamed?.(trimmed);
    const firstItem = next[listId].items?.[0];
    if (firstItem) logActivity("custom_list_rename", firstItem, { listKey: listId, title: trimmed });
  }

  function shareCustomList(list = {}) {
    const url = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#list-${encodeURIComponent(list.id || list.title || "moviegram")}` : "";
    const text = `${list.title || "MovieGram list"} - ${(list.items || []).length} titles`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: list.title || "MovieGram list", text, url }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${text}${url ? ` ${url}` : ""}`).catch(() => {});
    }
    if (list.items?.[0]) logActivity("list_shared", list.items[0], { listKey: list.id, title: list.title });
  }

  function savePreferences(preferences) {
    persist("moviegram.preferences", preferences);
    persist("moviegram.preferencesDone", true);
    setPreferencesOpen(false);
  }

  function skipPreferences() {
    persist("moviegram.preferencesDone", true);
    setPreferencesOpen(false);
  }

  function toggleFavorite(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const normalizedFavorites = normalizeTrackingCollection(favorites);
    const next = { ...normalizedFavorites };
    if (hasStoredItem(normalized, next)) {
      const removed = removeMatchingItem(next, normalized);
      setFavorites(removed);
      persist("moviegram.favorites", removed);
      syncTrackingNow("favorite_remove", { favorites: removed });
    } else {
      next[key] = { ...normalized, likedAt: new Date().toISOString() };
      setFavorites(next);
      persist("moviegram.favorites", next);
      syncTrackingNow("favorite_add", { favorites: next });
      logActivity("liked", normalized);
    }
  }

  function toggleFeedLike(id) {
    const next = { ...likedFeed, [id]: !likedFeed[id] };
    setLikedFeed(next);
    persist("moviegram.feedLikes", next);
  }

  function toggleFeedSave(id) {
    const next = { ...savedFeed, [id]: !savedFeed[id] };
    setSavedFeed(next);
    persist("moviegram.feedSaves", next);
  }

  function toggleFriendState(friendId) {
    const current = friendStates[friendId] || "add";
    const nextState = current === "add" ? "requested" : current === "requested" ? "friends" : "add";
    const next = { ...friendStates, [friendId]: nextState };
    setFriendStates(next);
    persist("moviegram.friendStates", next);
  }

  function saveBlendList(blendId, items) {
    const next = { ...savedBlendLists, [blendId]: { id: blendId, items, savedAt: new Date().toISOString() } };
    setSavedBlendLists(next);
    persist("moviegram.blendLists", next);
  }

  function hideRecommendation(item) {
    const key = keyOf({ ...item, media_type: mediaType(item) });
    const next = { ...hiddenRecs, [key]: true };
    setHiddenRecs(next);
    persist("moviegram.hiddenRecommendations", next);
  }

  const title = activeSocial === "messages" ? "Messages" : activeSocial === "notifications" ? "Notifications" : activeSocial === "publicProfile" ? "Profile" : activeSocial === "blend" ? "Blend" : activeSocial === "stats" ? "Stats" : activeSocial === "diary" ? "Diary" : tabs.find((tab) => tab.id === activeTab)?.label || "MovieGram";
  const unreadNotificationCount = notifications.filter((notification) => !notification.is_read).length;
  const selectedKey = selected ? keyOf(selected) : "";
  const libraryState = useMemo(() => {
    const watchedItems = Object.fromEntries(Object.entries(normalizeTrackingCollection(watched)).filter(([, item]) => isReleased(item)));
    const watchlistItems = enforceWatchExclusivity(normalizeTrackingCollection(watchlist), watchedItems);
    return {
      watched: watchedItems,
      watchlist: watchlistItems,
      ratings: normalizeRatingsCollection(ratings),
      reviews: reviews || {}
    };
  }, [watched, watchlist, ratings, reviews]);
  const releasedWatched = libraryState.watched;
  const isItemWatched = useCallback((item) => hasStoredItem(item, libraryState.watched), [libraryState.watched]);
  const isItemWatchlisted = useCallback((item) => hasStoredItem(item, libraryState.watchlist), [libraryState.watchlist]);
  const isItemWatchAsap = useCallback((item) => Boolean(Object.values(libraryState.watchlist).find((entry) => itemMatches(entry, item))?.watch_asap || Object.values(libraryState.watchlist).find((entry) => itemMatches(entry, item))?.watchAsap), [libraryState.watchlist]);
  const isItemReviewed = useCallback((item) => Boolean(item && libraryState.reviews[keyOf({ ...item, media_type: mediaType(item) })]), [libraryState.reviews]);
  const getItemRating = useCallback((item) => ratingForItem(item, libraryState.ratings), [libraryState.ratings]);

  const queryProps = {
    query,
    setQuery,
    loading: searchLoading,
    results: searchResults,
    userResults: exploreUserResults,
    userLoading: exploreUserLoading,
    page: searchPage,
    totalPages: searchTotalPages,
    loadNext: loadNextSearch,
    loadPrevious: () => search(Math.max(1, searchPage - 1), false),
    sentinelRef
  };

  let screen = null;
  if (activeSocial === "publicProfile") {
    screen = (
      <section className="mg2-native-social">
        <PublicProfileScreen
          profile={selectedPublicProfile}
          bundle={publicProfileBundle}
          currentUser={supabaseUser}
          followStatuses={followStatuses}
          followBusyIds={followBusyIds}
          onBack={() => { setSelectedPublicProfile(null); setPublicProfileBundle(null); setActiveSocial(null); }}
          onFollowToggle={toggleFollow}
          onOpenItem={(item) => { setSelectedPublicProfile(null); setPublicProfileBundle(null); setActiveSocial(null); openItem(item); }}
        />
        {socialError && <div className="mg2-empty">{socialError}</div>}
      </section>
    );
  } else if (activeSocial === "messages") {
    screen = (
      <section className="mg2-native-social messages">
        <MessagesScreen selectedConversation={selectedConversation} setSelectedConversation={setSelectedConversation} friendStates={friendStates} onFriendAction={toggleFriendState} onOpenBlend={() => setActiveSocial("blend")} onClose={() => setActiveSocial(null)} user={supabaseUser} socialProfiles={socialProfiles} userResults={userResults} userSearch={userSearch} setUserSearch={setUserSearch} userSearchLoading={userSearchLoading} followingIds={followingIds} followerProfiles={followerProfiles} followStatuses={followStatuses} followBusyIds={followBusyIds} onFollowToggle={toggleFollow} onOpenPublicProfile={openPublicProfile} />
        {socialError && <div className="mg2-empty">{socialError}</div>}
      </section>
    );
  } else if (activeSocial === "notifications") {
    screen = (
      <section className="mg2-native-social">
        <div className="mg2-social-header">
          <button className="mg2-social-back" type="button" onClick={() => setActiveSocial(null)}><Icon name="back" /></button>
          <h2>Notifications{unreadNotificationCount ? ` (${unreadNotificationCount})` : ""}</h2>
        </div>
        <NotificationsScreen pendingRequests={pendingRequests} notifications={notifications} onRespondFollowRequest={respondFollowRequest} onMarkRead={markSingleNotificationRead} />
      </section>
    );
  } else if (activeSocial === "blend") {
    screen = (
      <section className="mg2-native-social">
        <div className="mg2-social-header">
          <button className="mg2-social-back" type="button" onClick={() => setActiveSocial(null)}><Icon name="back" /></button>
          <h2>Blend</h2>
        </div>
        <BlendScreen rows={rows} savedBlendLists={savedBlendLists} onSaveBlend={saveBlendList} />
      </section>
    );
  } else if (activeSocial === "stats") {
    screen = (
      <section className="mg2-native-social">
        <div className="mg2-social-header">
          <button className="mg2-social-back" type="button" onClick={() => setActiveSocial(null)}><Icon name="back" /></button>
          <h2>Stats</h2>
        </div>
        <StatsScreen watched={libraryState.watched} watchlist={libraryState.watchlist} ratings={libraryState.ratings} />
      </section>
    );
  } else if (activeSocial === "diary") {
    screen = (
      <section className="mg2-native-social">
        <div className="mg2-social-header">
          <button className="mg2-social-back" type="button" onClick={() => setActiveSocial(null)}><Icon name="back" /></button>
          <h2>Diary</h2>
        </div>
        <WatchDiaryScreen watched={libraryState.watched} watchlist={libraryState.watchlist} ratings={libraryState.ratings} onOpen={openItem} />
      </section>
    );
  } else if (activeTab === "home") {
    screen = <HomeScreen rows={rows} loading={loadingRows} user={supabaseUser} onOpen={openItem} onOpenPublicProfile={openPublicProfile} watchlist={libraryState.watchlist} watched={libraryState.watched} ratings={libraryState.ratings} favorites={favorites} continueWatching={continueWatching} recommended={recommended} intelligenceRows={intelligenceRows} hiddenRecs={hiddenRecs} feedItems={feedItems} socialActivity={socialActivity} profileActivity={profileActivity} toggleFeedLike={toggleFeedLike} toggleFeedSave={toggleFeedSave} likedFeed={likedFeed} savedFeed={savedFeed} onWatchlist={toggleWatchlist} onNotInterested={hideRecommendation} />;
  } else if (activeTab === "reels") {
    screen = <ReelsScreen rows={rows} watched={libraryState.watched} watchlist={libraryState.watchlist} ratings={libraryState.ratings} reviews={libraryState.reviews} favorites={favorites} socialActivity={socialActivity} userId={supabaseUser?.id || "guest"} detailsOpen={Boolean(selected)} onOpen={openItem} onWatchlist={toggleWatchlist} onWatched={toggleWatched} onFavorite={toggleFavorite} onReelActivity={recordReelActivity} />;
  } else if (activeTab === "log") {
    screen = <LogScreen rows={rows} watchlist={libraryState.watchlist} watched={libraryState.watched} ratings={libraryState.ratings} favorites={favorites} customLists={customLists} onOpen={openItem} onOpenDiary={() => setActiveSocial("diary")} />;
  } else if (activeTab === "explore") {
    screen = (
      <ExploreScreen
        activeExplore={activeExplore}
        setActiveExplore={setActiveExplore}
        queryProps={queryProps}
        tabResults={tabResults}
        tabLoading={tabLoading}
        hasMoreExplore={exploreHasMore}
        onLoadMoreExplore={loadMoreExplore}
        exploreRows={exploreRows}
        exploreLoading={exploreLoading}
        actors={popularActors}
        actorsLoading={actorsLoading}
        onOpen={openItem}
        onOpenPerson={openPerson}
        onOpenPublicProfile={openPublicProfile}
        onQuickActions={(item) => setQuickActionItem({ ...item, media_type: mediaType(item) })}
        watchlist={libraryState.watchlist}
        watched={libraryState.watched}
        ratings={libraryState.ratings}
        favorites={favorites}
      />
    );
  } else {
    screen = <ProfileScreen watchlist={libraryState.watchlist} watched={libraryState.watched} ratings={libraryState.ratings} reviews={libraryState.reviews} favorites={favorites} customLists={customLists} savedBlendLists={savedBlendLists} profileActivity={profileActivity} recentActivity={recentActivity} recentReviews={recentReviews} profileStats={profileStats} loading={loadingRows} user={supabaseUser} profile={profileIdentity} socialCounts={socialCounts} pendingRequests={pendingRequests} followerProfiles={followerProfiles} followingProfiles={followingProfiles} followStatuses={followStatuses} authLoading={authLoading} syncStatus={syncStatus} profileSaving={profileSaving} profileMessage={profileMessage} onOpen={openItem} onOpenBlend={() => setActiveSocial("blend")} onOpenStats={() => setActiveSocial("stats")} onOpenDiary={() => setActiveSocial("diary")} onOpenAuth={() => { setAuthOpen(false); setGuestAccepted(false); }} onLogout={handleLogout} onSaveProfile={handleProfileSave} onRespondFollowRequest={respondFollowRequest} onOpenPublicProfile={openPublicProfile} onFollowToggle={toggleFollow} onRemoveFollower={removeFollower} onDeleteCustomList={deleteCustomList} onRenameCustomList={renameCustomList} onShareList={shareCustomList} />;
  }

  if (authLoading || (!supabaseUser && !guestAccepted || authOnboardingActive)) {
    return (
      <AuthOnboarding
        configured={isSupabaseConfigured}
        loading={authLoading}
        onGuest={() => { setGuestAccepted(true); setAuthOnboardingActive(false); }}
        onSession={(session) => {
          setAuthOnboardingActive(true);
          setSupabaseSession(session || null);
          setSupabaseUser(session?.user || null);
          setSyncStatus(session?.user ? "syncing" : "guest");
        }}
        onProfileSaved={(profile) => setProfileIdentity(profile)}
        onComplete={() => {
          setAuthOnboardingActive(false);
          setGuestAccepted(false);
          setAuthMessage("");
        }}
      />
    );
  }

  return (
    <PhoneShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title={title}
      onOpenMessages={() => setActiveSocial("messages")}
      onOpenNotifications={() => setActiveSocial("notifications")}
      socialActive={Boolean(activeSocial)}
      onCloseSocial={() => { setActiveSocial(null); setSelectedPublicProfile(null); setPublicProfileBundle(null); }}
    >
      {!API_KEY && <div className="mg2-empty">Add NEXT_PUBLIC_TMDB_API_KEY to .env.local.</div>}
      {screen}
      {selected && (
        <DetailModal
          item={selected}
          details={details}
          loading={detailsLoading}
          onClose={() => setSelected(null)}
          onWatchlist={toggleWatchlist}
          saved={isItemWatchlisted(selected)}
          watched={isItemWatched(selected)}
          watchAsap={isItemWatchAsap(selected)}
          onWatchAsap={toggleWatchAsap}
          onWatched={toggleWatched}
          rating={getItemRating(selected)}
          onRate={rateItem}
          onOpen={openItem}
          onOpenPerson={openPerson}
          onOpenPublicProfile={(profile) => { setSelected(null); openPublicProfile(profile); }}
          externalRatings={externalRatings}
          watchProviders={watchProviders}
          favorite={hasStoredItem(selected, favorites)}
          onFavorite={toggleFavorite}
          apiFetch={apiFetch}
          episodeProgress={episodeProgress}
          onToggleEpisode={toggleEpisodeWatched}
          onToggleSeason={toggleSeasonWatched}
          review={reviewForItem(selected)}
          onEditReview={(item) => setReviewItem({ ...item, media_type: mediaType(item) })}
          onDeleteReview={deleteReview}
          onOpenListSheet={(item) => setListItem({ ...item, media_type: mediaType(item) })}
          socialActivity={socialActivity}
        />
      )}
      <PersonProfileModal
        person={selectedPerson}
        apiFetch={apiFetch}
        watched={libraryState.watched}
        watchlist={libraryState.watchlist}
        ratings={libraryState.ratings}
        reviews={libraryState.reviews}
        onClose={() => setSelectedPerson(null)}
        onOpen={(item) => { setSelectedPerson(null); openItem(item); }}
      />
      <WatchedDateSheet
        action={watchedAction}
        onChoose={applyWatchedAction}
        onCancel={() => setWatchedAction(null)}
      />
      <QuickActionSheet
        item={quickActionItem}
        saved={quickActionItem ? isItemWatchlisted(quickActionItem) : false}
        watched={quickActionItem ? isItemWatched(quickActionItem) : false}
        watchAsap={quickActionItem ? isItemWatchAsap(quickActionItem) : false}
        favorite={quickActionItem ? hasStoredItem(quickActionItem, favorites) : false}
        onClose={() => setQuickActionItem(null)}
        onWatched={toggleWatched}
        onWatchlist={toggleWatchlist}
        onWatchAsap={toggleWatchAsap}
        onFavorite={toggleFavorite}
        onOpen={openItem}
      />
      <ReviewSheet
        item={reviewItem}
        initialReview={reviewItem ? reviewForItem(reviewItem) : ""}
        initialRating={reviewItem ? getItemRating(reviewItem) : ""}
        initialSpoiler={reviewItem ? Boolean(reviewMetaForItem(reviewItem).containsSpoiler) : false}
        initialVisibility={reviewItem ? reviewMetaForItem(reviewItem).visibility || "public" : "public"}
        onSave={saveReview}
        onDelete={deleteReview}
        onClose={() => setReviewItem(null)}
      />
      <CustomListSheet
        item={listItem}
        lists={customLists}
        onCreate={createCustomList}
        onToggleItem={toggleCustomListItem}
        onClose={() => setListItem(null)}
      />
      <PreferencesSheet
        open={preferencesOpen}
        onSave={savePreferences}
        onSkip={skipPreferences}
      />
    </PhoneShell>
  );
}

