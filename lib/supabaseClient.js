import { createClient } from "@supabase/supabase-js";

// Required for logged-in private beta sync:
// NEXT_PUBLIC_SUPABASE_URL=your_project_url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createMovieGramSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  if (!globalThis.__moviegramSupabaseClient) {
    globalThis.__moviegramSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return globalThis.__moviegramSupabaseClient;
}

export const supabase = createMovieGramSupabaseClient();

export function itemKey(item = {}) {
  const type = item.media_type || (item.first_air_date || item.name ? "tv" : "movie");
  return item.id ? `${type}:${item.id}` : `title:${(item.title || item.name || "untitled").toLowerCase()}`;
}

function stableItemParts(key, item = {}) {
  const [keyType, keyId] = String(key || "").split(":");
  const mediaType = item.media_type || (keyType === "tv" || keyType === "movie" ? keyType : (item.first_air_date || item.name ? "tv" : "movie"));
  const tmdbId = Number(item.id || keyId);
  return {
    mediaType,
    tmdbId: Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : null,
    itemKey: Number.isFinite(tmdbId) && tmdbId > 0 ? `${mediaType}:${tmdbId}` : String(key || itemKey(item))
  };
}

function cleanJson(value) {
  return JSON.parse(JSON.stringify(value || {}, (_key, itemValue) => itemValue === undefined ? null : itemValue));
}

function logSupabaseError(table, action, error) {
  console.warn(`MovieGram Supabase ${action} failed for ${table}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    error
  });
}

function warnSupabase(table, action, error) {
  console.warn(`MovieGram Supabase ${action} skipped for ${table}`, {
    message: error?.message,
    code: error?.code
  });
}

function titleOfItem(item = {}) {
  return item.title || item.name || item.original_title || item.original_name || "Untitled";
}

function releaseYearOfItem(item = {}) {
  const date = item.release_date || item.first_air_date || "";
  const year = Number(String(date).slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

function productItemRow(userId, item = {}, extra = {}) {
  const key = itemKey(item);
  const parts = stableItemParts(key, item);
  return {
    user_id: userId,
    item_key: parts.itemKey,
    tmdb_id: parts.tmdbId,
    media_type: parts.mediaType,
    title: titleOfItem(item),
    poster_path: item.poster_path || null,
    release_year: releaseYearOfItem(item),
    ...extra
  };
}

async function safeSupabaseResult(resultPromise, table, action, fallback = null) {
  if (!supabase) return fallback;
  try {
    const result = await resultPromise;
    if (result.error) {
      warnSupabase(table, action, result.error);
      return fallback;
    }
    return result.data ?? fallback;
  } catch (error) {
    warnSupabase(table, action, error);
    return fallback;
  }
}

export async function getCurrentUserSafe() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      warnSupabase("auth", "get user", error);
      return null;
    }
    return data?.user || null;
  } catch (error) {
    warnSupabase("auth", "get user", error);
    return null;
  }
}

function defaultProfileRow(user) {
  const metadata = user?.user_metadata || {};
  const emailPrefix = user?.email?.split("@")[0] || "moviegram";
  const username = String(emailPrefix)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "moviegram";
  return {
    id: user?.id,
    username,
    display_name: metadata.display_name || metadata.full_name || metadata.name || username,
    avatar_url: metadata.avatar_url || metadata.picture || "",
    bio: "",
    is_private: false,
    onboarding_completed: false,
    favorite_genres: []
  };
}

export async function ensureUserProfile(userArg = null) {
  const user = userArg || await getCurrentUserSafe();
  if (!supabase || !user?.id) return null;
  const defaults = defaultProfileRow(user);
  const existing = await safeSupabaseResult(
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_private,onboarding_completed,favorite_genres,updated_at").eq("id", user.id).maybeSingle(),
    "profiles",
    "load",
    null
  );
  if (existing) return { ...defaults, ...existing };
  const created = await safeSupabaseResult(
    supabase.from("profiles").upsert({ ...defaults, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id,username,display_name,bio,avatar_url,is_private,onboarding_completed,favorite_genres,updated_at").single(),
    "profiles",
    "upsert",
    null
  );
  return created ? { ...defaults, ...created } : defaults;
}

export async function loadUserProfile(userId) {
  if (!supabase || !userId) return null;
  return safeSupabaseResult(
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_private,onboarding_completed,favorite_genres,updated_at").eq("id", userId).maybeSingle(),
    "profiles",
    "load",
    null
  );
}

export async function updateUserProfile(user, profile = {}) {
  if (!supabase || !user?.id) return null;
  const payload = {
    id: user.id,
    username: profile.username,
    display_name: profile.display_name,
    bio: profile.bio || "",
    avatar_url: profile.avatar_url || "",
    is_private: Boolean(profile.is_private),
    favorite_genres: Array.isArray(profile.favorite_genres) ? profile.favorite_genres : [],
    onboarding_completed: Boolean(profile.onboarding_completed),
    updated_at: new Date().toISOString()
  };
  return safeSupabaseResult(
    supabase.from("profiles").upsert(payload, { onConflict: "id" }).select("id,username,display_name,bio,avatar_url,is_private,onboarding_completed,favorite_genres,updated_at").single(),
    "profiles",
    "update",
    null
  );
}

export async function togglePrivateProfile(userId, isPrivate) {
  if (!supabase || !userId) return null;
  return safeSupabaseResult(
    supabase.from("profiles").update({ is_private: Boolean(isPrivate), updated_at: new Date().toISOString() }).eq("id", userId).select("id,is_private").single(),
    "profiles",
    "privacy update",
    null
  );
}

export async function addToSupabaseWatchlist(userId, item) {
  if (!supabase || !userId || !item) return null;
  const extra = {};
  if (Object.prototype.hasOwnProperty.call(item, "watch_asap") || Object.prototype.hasOwnProperty.call(item, "watchAsap")) {
    extra.watch_asap = Boolean(item.watch_asap || item.watchAsap);
    extra.watch_asap_at = extra.watch_asap ? (item.watch_asap_at || item.watchAsapAt || new Date().toISOString()) : null;
  }
  return safeSupabaseResult(
    supabase.from("user_watchlist").upsert(productItemRow(userId, item, extra), { onConflict: "user_id,item_key" }).select("id,item_key").single(),
    "user_watchlist",
    "upsert",
    null
  );
}

export async function removeFromSupabaseWatchlist(userId, item) {
  if (!supabase || !userId || !item) return null;
  return safeSupabaseResult(
    supabase.from("user_watchlist").delete().eq("user_id", userId).eq("item_key", stableItemParts(itemKey(item), item).itemKey),
    "user_watchlist",
    "delete",
    null
  );
}

export async function markSupabaseWatched(userId, item, watchedAt = null) {
  if (!supabase || !userId || !item) return null;
  return safeSupabaseResult(
    supabase.from("user_watched").upsert(productItemRow(userId, item, { watched_at: watchedAt || new Date().toISOString() }), { onConflict: "user_id,item_key" }).select("id,item_key").single(),
    "user_watched",
    "upsert",
    null
  );
}

export async function removeSupabaseWatched(userId, item) {
  if (!supabase || !userId || !item) return null;
  return safeSupabaseResult(
    supabase.from("user_watched").delete().eq("user_id", userId).eq("item_key", stableItemParts(itemKey(item), item).itemKey),
    "user_watched",
    "delete",
    null
  );
}

export async function saveRatingReview(userId, item, { rating = null, reviewText = "", containsSpoiler = false, visibility = "public" } = {}) {
  if (!supabase || !userId || !item) return null;
  const numericRating = Number(rating || 0);
  const tenPointRating = numericRating ? Math.min(10, Math.max(0, numericRating <= 5 ? numericRating * 2 : numericRating)) : null;
  const row = productItemRow(userId, item, {
    rating: tenPointRating,
    review_text: reviewText || null,
    contains_spoiler: Boolean(containsSpoiler),
    visibility,
    updated_at: new Date().toISOString()
  });
  return safeSupabaseResult(
    supabase.from("ratings_reviews").upsert(row, { onConflict: "user_id,item_key" }).select("id,item_key").single(),
    "ratings_reviews",
    "upsert",
    null
  );
}

export async function loadRatingReviews(userId, limit = 5) {
  if (!supabase || !userId) return [];
  return safeSupabaseResult(
    supabase.from("ratings_reviews").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(Math.min(Math.max(Number(limit) || 5, 1), 20)),
    "ratings_reviews",
    "load",
    []
  ) || [];
}

export async function loadProductLibrary(userId) {
  if (!supabase || !userId) return null;
  const [watchlistRows, watchedRows, reviewRows, listRows] = await Promise.all([
    safeSupabaseResult(
      supabase.from("user_watchlist").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      "user_watchlist",
      "load",
      []
    ),
    safeSupabaseResult(
      supabase.from("user_watched").select("*").eq("user_id", userId).order("watched_at", { ascending: false }),
      "user_watched",
      "load",
      []
    ),
    safeSupabaseResult(
      supabase.from("ratings_reviews").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      "ratings_reviews",
      "load",
      []
    ),
    loadUserLists(userId)
  ]);

  const rowToItem = (row = {}) => ({
    id: row.tmdb_id,
    media_type: row.media_type,
    title: row.title,
    name: row.media_type === "tv" ? row.title : undefined,
    poster_path: row.poster_path || "",
    release_date: row.release_year && row.media_type === "movie" ? `${row.release_year}-01-01` : "",
    first_air_date: row.release_year && row.media_type === "tv" ? `${row.release_year}-01-01` : "",
    watchedAt: row.watched_at || undefined,
    savedAt: row.created_at || undefined,
    watch_asap: row.watch_asap || undefined,
    watchAsap: row.watch_asap || undefined,
    watch_asap_at: row.watch_asap_at || undefined
  });

  const watched = {};
  const watchedKeys = new Set();
  (watchedRows || []).forEach((row) => {
    const item = rowToItem(row);
    const key = row.item_key || itemKey(item);
    watchedKeys.add(key);
    watched[key] = item;
  });

  const watchlist = {};
  (watchlistRows || []).forEach((row) => {
    const item = rowToItem(row);
    const key = row.item_key || itemKey(item);
    if (!watchedKeys.has(key)) watchlist[key] = item;
  });

  const ratings = {};
  const reviews = {};
  (reviewRows || []).forEach((row) => {
    const item = rowToItem(row);
    const key = row.item_key || itemKey(item);
    if (row.rating) ratings[key] = row.rating;
    if (row.review_text) {
      reviews[key] = {
        item,
        text: row.review_text,
        reviewedAt: row.updated_at || row.created_at,
        containsSpoiler: Boolean(row.contains_spoiler),
        visibility: row.visibility || "public"
      };
    }
  });

  const customLists = {};
  (listRows || []).forEach((list) => {
    customLists[list.id] = list;
  });

  return { watchlist, watched, ratings, reviews, customLists, reviewRows: reviewRows || [] };
}

export async function loadRecentActivity(userId, limit = 30) {
  if (!supabase || !userId) return [];
  return safeSupabaseResult(
    supabase.from("activity_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(Math.min(Math.max(Number(limit) || 30, 1), 30)),
    "activity_events",
    "load recent",
    []
  ) || [];
}

export async function createUserList(userId, { name, description = "", visibility = "public" } = {}) {
  if (!supabase || !userId || !name?.trim()) return null;
  return safeSupabaseResult(
    supabase.from("user_lists").insert({ user_id: userId, name: name.trim(), description, visibility }).select("id,user_id,name,description,visibility,created_at").single(),
    "user_lists",
    "insert",
    null
  );
}

export async function loadUserLists(userId) {
  if (!supabase || !userId) return [];
  const lists = await safeSupabaseResult(
    supabase.from("user_lists").select("id,user_id,name,description,visibility,created_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    "user_lists",
    "load",
    []
  ) || [];
  if (!lists.length) return [];
  const items = await safeSupabaseResult(
    supabase.from("user_list_items").select("*").eq("user_id", userId).in("list_id", lists.map((list) => list.id)).order("sort_order", { ascending: true }),
    "user_list_items",
    "load",
    []
  ) || [];
  const itemsByList = items.reduce((acc, row) => {
    acc[row.list_id] = acc[row.list_id] || [];
    acc[row.list_id].push({
      id: row.tmdb_id,
      media_type: row.media_type,
      title: row.title,
      name: row.media_type === "tv" ? row.title : undefined,
      poster_path: row.poster_path
    });
    return acc;
  }, {});
  return lists.map((list) => ({
    id: list.id,
    title: list.name,
    description: list.description || "",
    privacy: list.visibility || "public",
    createdAt: list.created_at,
    updatedAt: list.updated_at,
    items: itemsByList[list.id] || [],
    remote: true
  }));
}

export async function addItemToList(userId, listId, item, sortOrder = 0) {
  if (!supabase || !userId || !listId || !item) return null;
  return safeSupabaseResult(
    supabase.from("user_list_items").upsert(productItemRow(userId, item, { list_id: listId, sort_order: sortOrder }), { onConflict: "list_id,item_key" }).select("id,list_id,item_key").single(),
    "user_list_items",
    "upsert",
    null
  );
}

export async function followUser(followerId, profile, status = null) {
  if (!supabase || !followerId || !profile?.id || followerId === profile.id) return null;
  const nextStatus = status || (profile.is_private ? "pending" : "accepted");
  return safeSupabaseResult(
    supabase.from("follows").upsert({ follower_id: followerId, following_id: profile.id, status: nextStatus, updated_at: new Date().toISOString() }, { onConflict: "follower_id,following_id" }).select("id,status").single(),
    "follows",
    "upsert",
    null
  );
}

export async function createNotification({ userId, actorId = null, type, entityType = null, entityId = null, message = "", metadata = {} } = {}) {
  if (!supabase || !userId || !type) return null;
  return safeSupabaseResult(
    supabase.from("notifications").insert({
      user_id: userId,
      actor_id: actorId,
      type,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      message,
      metadata
    }).select("*").single(),
    "notifications",
    "insert",
    null
  );
}

export async function markNotificationRead(notificationId, metadataPatch = {}) {
  if (!supabase || !notificationId) return null;
  return safeSupabaseResult(
    supabase.from("notifications").update({
      is_read: true,
      metadata: metadataPatch
    }).eq("id", notificationId).select("*").maybeSingle(),
    "notifications",
    "mark read",
    null
  );
}

export async function acceptFollowRequest(currentUserId, requesterId) {
  if (!supabase || !currentUserId || !requesterId) return null;
  return safeSupabaseResult(
    supabase.from("follows").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("follower_id", requesterId).eq("following_id", currentUserId).eq("status", "pending").select("id,status").maybeSingle(),
    "follows",
    "accept",
    null
  );
}

export async function declineFollowRequest(currentUserId, requesterId) {
  if (!supabase || !currentUserId || !requesterId) return null;
  return safeSupabaseResult(
    supabase.from("follows").update({ status: "declined", updated_at: new Date().toISOString() }).eq("follower_id", requesterId).eq("following_id", currentUserId).eq("status", "pending").select("id,status").maybeSingle(),
    "follows",
    "decline",
    null
  );
}

export async function loadNotifications(userId, limit = 30) {
  if (!supabase || !userId) return [];
  const rows = await safeSupabaseResult(
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(Math.min(Math.max(Number(limit) || 30, 1), 30)),
    "notifications",
    "load",
    []
  ) || [];
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))];
  if (!actorIds.length) return rows;
  const actors = await safeSupabaseResult(
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_private").in("id", actorIds),
    "profiles",
    "load notification actors",
    []
  ) || [];
  const actorMap = Object.fromEntries(actors.map((actor) => [actor.id, actor]));
  return rows.map((row) => ({ ...row, actor: actorMap[row.actor_id] || null }));
}

export async function loadProductStats(userId) {
  if (!supabase || !userId) return null;
  const count = async (table, column = "user_id", value = userId, filters = []) => {
    try {
      let request = supabase.from(table).select("*", { count: "exact", head: true }).eq(column, value);
      filters.forEach(([filterColumn, filterValue]) => {
        request = request.eq(filterColumn, filterValue);
      });
      const result = await request;
      if (result.error) {
        warnSupabase(table, "count", result.error);
        return null;
      }
      return result.count || 0;
    } catch (error) {
      warnSupabase(table, "count", error);
      return null;
    }
  };
  const [watched, watchlist, reviews, lists, followers, following] = await Promise.all([
    count("user_watched"),
    count("user_watchlist"),
    count("ratings_reviews"),
    count("user_lists"),
    count("follows", "following_id", userId, [["status", "accepted"]]),
    count("follows", "follower_id", userId, [["status", "accepted"]])
  ]);
  if ([watched, watchlist, reviews, lists, followers, following].every((value) => value === null)) return null;
  return { watched, watchlist, reviews, lists, followers, following };
}

function productRowToItem(row = {}) {
  return {
    id: row.tmdb_id,
    media_type: row.media_type,
    title: row.title,
    name: row.media_type === "tv" ? row.title : undefined,
    poster_path: row.poster_path || "",
    release_date: row.release_year && row.media_type === "movie" ? `${row.release_year}-01-01` : "",
    first_air_date: row.release_year && row.media_type === "tv" ? `${row.release_year}-01-01` : ""
  };
}

function aggregateRowsToItems(rows = [], scoreForRow = () => 1) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.item_key || `${row.media_type}:${row.tmdb_id}` || row.title;
    if (!key || !row.title) return;
    const existing = map.get(key) || { row, score: 0, count: 0 };
    existing.score += scoreForRow(row);
    existing.count += 1;
    existing.row = { ...existing.row, ...row, poster_path: existing.row.poster_path || row.poster_path };
    map.set(key, existing);
  });
  return Array.from(map.values())
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, 20)
    .map((entry) => ({ ...productRowToItem(entry.row), community_score: entry.score, community_count: entry.count }));
}

export async function loadCommunityCharts() {
  if (!supabase) return {};
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [watchedRows, reviewRows, watchlistRows, activityRows] = await Promise.all([
    safeSupabaseResult(
      supabase.from("user_watched").select("item_key,tmdb_id,media_type,title,poster_path,release_year,watched_at").gte("watched_at", weekAgo).order("watched_at", { ascending: false }).limit(200),
      "user_watched",
      "load community chart",
      []
    ),
    safeSupabaseResult(
      supabase.from("ratings_reviews").select("item_key,tmdb_id,media_type,title,poster_path,release_year,rating,updated_at").gte("updated_at", weekAgo).order("updated_at", { ascending: false }).limit(200),
      "ratings_reviews",
      "load community chart",
      []
    ),
    safeSupabaseResult(
      supabase.from("user_watchlist").select("item_key,tmdb_id,media_type,title,poster_path,release_year,created_at").gte("created_at", monthAgo).order("created_at", { ascending: false }).limit(200),
      "user_watchlist",
      "load community chart",
      []
    ),
    safeSupabaseResult(
      supabase.from("activity_events").select("item_key,tmdb_id,media_type,title,poster_path,metadata,created_at").gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(200),
      "activity_events",
      "load community chart",
      []
    )
  ]);
  const activitiesWithPoster = (activityRows || []).map((row) => ({ ...row, poster_path: row.poster_path || row.metadata?.poster_path || row.metadata?.metadata?.poster_path || "" }));
  return {
    mostWatched: aggregateRowsToItems(watchedRows),
    mostReviewed: aggregateRowsToItems(reviewRows),
    highestRated: aggregateRowsToItems((reviewRows || []).filter((row) => Number(row.rating) > 0), (row) => Number(row.rating) || 0),
    mostWatchlisted: aggregateRowsToItems(watchlistRows),
    activeThisWeek: aggregateRowsToItems(activitiesWithPoster)
  };
}

export async function loadReleaseReminders(userId) {
  if (!supabase || !userId) return [];
  return safeSupabaseResult(
    supabase.from("release_reminders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    "release_reminders",
    "load",
    []
  ) || [];
}

function pgTextInList(values) {
  return `(${values.map((value) => `"${String(value).replaceAll('"', '\\"')}"`).join(",")})`;
}

export function episodeProgressKey(row = {}) {
  return `tv:${row.show_id}:s${row.season_number}:e${row.episode_number}`;
}

let loggedMalformedEpisodeProgress = false;
let loggedSkippedUserItemsWithoutTmdb = false;
const remoteSyncDisabledTables = new Set();
const remoteSyncWarnedKeys = new Set();

function isRecoverableRemoteSyncError(error) {
  const message = `${error?.message || ""}`.toLowerCase();
  const code = `${error?.code || ""}`.toLowerCase();
  return message.includes("statement timeout")
    || message.includes("row-level security")
    || message.includes("violates row-level security")
    || code === "57014"
    || code === "42501";
}

function warnRemoteSync(table, action, error) {
  const key = `${table}:${action}:${error?.code || ""}:${error?.message || ""}`;
  if (remoteSyncWarnedKeys.has(key)) return;
  remoteSyncWarnedKeys.add(key);
  warnSupabase(table, action, error);
}

async function safeRemoteSync(resultPromise, table, action, { circuitBreak = false } = {}) {
  if (!supabase || remoteSyncDisabledTables.has(table)) return { ok: false, skipped: true };
  try {
    const result = await resultPromise;
    if (result.error) {
      warnRemoteSync(table, action, result.error);
      if (circuitBreak && isRecoverableRemoteSyncError(result.error)) remoteSyncDisabledTables.add(table);
      return { ok: false, error: result.error };
    }
    return { ok: true, data: result.data };
  } catch (error) {
    warnRemoteSync(table, action, error);
    if (circuitBreak && isRecoverableRemoteSyncError(error)) remoteSyncDisabledTables.add(table);
    return { ok: false, error };
  }
}

export async function loadMovieGramRemoteState(userId) {
  if (!supabase || !userId) return null;
  async function loadTable(table, request) {
    if (remoteSyncDisabledTables.has(table)) return { data: [], error: null, skipped: true };
    try {
      const result = await request;
      if (result.error) {
        warnRemoteSync(table, "load", result.error);
        if (isRecoverableRemoteSyncError(result.error)) remoteSyncDisabledTables.add(table);
        return { data: [], error: null, failed: true };
      }
      return { data: result.data || [], error: null };
    } catch (error) {
      warnRemoteSync(table, "load", error);
      if (isRecoverableRemoteSyncError(error)) remoteSyncDisabledTables.add(table);
      return { data: [], error: null, failed: true };
    }
  }
  const tableRequests = [
    ["user_items", supabase.from("user_items").select("item_key,tmdb_id,media_type,item_data,is_watched,is_watchlisted,is_favorite,user_rating,watched_at,watched_date_unknown,liked_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1000)],
    ["episode_progress", supabase.from("episode_progress").select("*").eq("user_id", userId).limit(2000)],
    ["reviews", supabase.from("reviews").select("*").eq("user_id", userId).limit(1000)],
    ["custom_lists", supabase.from("custom_lists").select("*").eq("user_id", userId).limit(200)],
    ["custom_list_items", supabase.from("custom_list_items").select("*").eq("user_id", userId).limit(2000)]
  ];
  const [items, episodes, reviews, lists, listItems] = await Promise.all(tableRequests.map(([table, request]) => loadTable(table, request)));

  const watchlist = {};
  const watched = {};
  const favorites = {};
  const ratings = {};

  (items.data || []).forEach((row) => {
    const item = { ...(row.item_data || {}), id: row.item_data?.id || row.tmdb_id, media_type: row.media_type };
    const key = row.item_key || `${row.media_type}:${row.tmdb_id}`;
    if (row.is_watchlisted) watchlist[key] = item;
    if (row.is_watched) watched[key] = { ...item, watchedAt: row.watched_at || undefined, watchedDateUnknown: row.watched_date_unknown || undefined };
    if (row.is_favorite) favorites[key] = { ...item, likedAt: row.liked_at || undefined };
    if (row.user_rating) ratings[key] = row.user_rating;
  });

  const episodeProgress = {};
  (episodes.data || []).forEach((row) => {
    const key = episodeProgressKey(row);
    episodeProgress[key] = {
      key,
      showId: row.show_id,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      watchedAt: row.watched_at || undefined,
      watchedDateUnknown: row.watched_date_unknown || undefined
    };
  });

  const reviewMap = {};
  (reviews.data || []).forEach((row) => {
    if (row.review_text) reviewMap[row.item_key] = {
      item: row.item_data,
      text: row.review_text,
      reviewedAt: row.updated_at || row.created_at
    };
  });

  const customLists = {};
  (lists.data || []).forEach((row) => {
    customLists[row.list_key] = { id: row.list_key, title: row.title, createdAt: row.created_at, items: [] };
  });
  (listItems.data || []).forEach((row) => {
    if (customLists[row.list_key]) customLists[row.list_key].items.push(row.item_data);
  });

  return { watchlist, watched, favorites, ratings, reviews: reviewMap, episodeProgress, customLists };
}

export async function saveMovieGramRemoteState(userId, state) {
  if (!supabase || !userId || !state) return { ok: false, skipped: true };
  const keys = new Set([
    ...Object.keys(state.watchlist || {}),
    ...Object.keys(state.watched || {}),
    ...Object.keys(state.favorites || {}),
    ...Object.keys(state.ratings || {}),
    ...Object.keys(state.reviews || {})
  ]);

  const itemRows = [...keys].map((key) => {
    const item = state.watched?.[key] || state.watchlist?.[key] || state.favorites?.[key] || state.reviews?.[key]?.item || {};
    const { itemKey: stableKey, mediaType, tmdbId } = stableItemParts(key, item);
    if (!tmdbId) {
      if (!loggedSkippedUserItemsWithoutTmdb && process.env.NODE_ENV !== "production") {
        loggedSkippedUserItemsWithoutTmdb = true;
        console.warn("MovieGram skipped user_items save without tmdb_id");
      }
      return null;
    }
    return {
      user_id: userId,
      item_key: stableKey,
      media_type: mediaType,
      tmdb_id: tmdbId,
      item_data: cleanJson({ ...item, id: tmdbId, media_type: mediaType }),
      is_watched: Boolean(state.watched?.[key]),
      is_watchlisted: Boolean(state.watchlist?.[key]) && !state.watched?.[key],
      is_favorite: Boolean(state.favorites?.[key]),
      user_rating: state.ratings?.[key] || null,
      watched_at: state.watched?.[key]?.watchedAt || null,
      watched_date_unknown: Boolean(state.watched?.[key] && !state.watched?.[key]?.watchedAt),
      liked_at: state.favorites?.[key]?.likedAt || null,
      updated_at: new Date().toISOString()
    };
  }).filter(Boolean);

  const syncResults = [];

  syncResults.push(...await Promise.all([
    safeRemoteSync(supabase.from("reviews").delete().eq("user_id", userId), "reviews", "delete"),
    safeRemoteSync(supabase.from("custom_list_items").delete().eq("user_id", userId), "custom_list_items", "delete"),
    safeRemoteSync(supabase.from("custom_lists").delete().eq("user_id", userId), "custom_lists", "delete")
  ]));

  if (itemRows.length) {
    const chunkSize = 75;
    for (let index = 0; index < itemRows.length; index += chunkSize) {
      const chunk = itemRows.slice(index, index + chunkSize);
      syncResults.push(await safeRemoteSync(
        supabase.from("user_items").upsert(chunk, { onConflict: "user_id,item_key" }),
        "user_items",
        "upsert",
        { circuitBreak: true }
      ));
      if (remoteSyncDisabledTables.has("user_items")) break;
    }
  }

  const malformedEpisodeRows = [];
  const episodeRowsByPrimaryKey = new Map();
  Object.values(state.episodeProgress || {}).forEach((entry) => {
    const showId = Number(entry?.showId);
    const seasonNumber = Number(entry?.seasonNumber);
    const episodeNumber = Number(entry?.episodeNumber);
    if (!Number.isFinite(showId) || showId <= 0 || !Number.isFinite(seasonNumber) || seasonNumber < 0 || !Number.isFinite(episodeNumber) || episodeNumber <= 0) {
      malformedEpisodeRows.push(entry);
      return;
    }
    const primaryKey = `${userId}:${showId}:${seasonNumber}:${episodeNumber}`;
    episodeRowsByPrimaryKey.set(primaryKey, {
      user_id: userId,
      show_id: showId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      watched_at: entry.watchedAt || null,
      watched_date_unknown: Boolean(!entry.watchedAt),
      updated_at: new Date().toISOString()
    });
  });
  const episodeRows = [...episodeRowsByPrimaryKey.values()];
  if (malformedEpisodeRows.length && !loggedMalformedEpisodeProgress) {
    loggedMalformedEpisodeProgress = true;
    console.warn("MovieGram skipped malformed episode_progress rows", {
      count: malformedEpisodeRows.length
    });
  }
  if (episodeRows.length) {
    syncResults.push(await safeRemoteSync(
      supabase
        .from("episode_progress")
        .upsert(episodeRows, { onConflict: "user_id,show_id,season_number,episode_number" }),
      "episode_progress",
      "upsert",
      { circuitBreak: true }
    ));

    if (!remoteSyncDisabledTables.has("episode_progress")) {
      const existing = await safeRemoteSync(
        supabase
          .from("episode_progress")
          .select("show_id,season_number,episode_number")
          .eq("user_id", userId),
        "episode_progress",
        "load stale",
        { circuitBreak: true }
      );
      syncResults.push(existing);
      const currentKeys = new Set(episodeRows.map((row) => `${row.show_id}:${row.season_number}:${row.episode_number}`));
      const staleRows = (existing.data || []).filter((row) => !currentKeys.has(`${row.show_id}:${row.season_number}:${row.episode_number}`));
      if (staleRows.length) {
        syncResults.push(...await Promise.all(staleRows.slice(0, 50).map((row) => safeRemoteSync(
          supabase
            .from("episode_progress")
            .delete()
            .eq("user_id", userId)
            .eq("show_id", row.show_id)
            .eq("season_number", row.season_number)
            .eq("episode_number", row.episode_number),
          "episode_progress",
          "delete stale",
          { circuitBreak: true }
        ))));
      }
    }
  }

  const reviewRows = Object.entries(state.reviews || {})
    .filter(([, review]) => review?.text?.trim())
    .map(([key, review]) => {
      const parts = stableItemParts(key, review.item);
      return {
        user_id: userId,
        item_key: parts.itemKey,
        media_type: parts.mediaType,
        tmdb_id: parts.tmdbId,
        item_data: cleanJson({ ...(review.item || {}), id: parts.tmdbId, media_type: parts.mediaType }),
        review_text: review.text.trim(),
        updated_at: new Date().toISOString()
      };
    });
  if (reviewRows.length) {
    syncResults.push(await safeRemoteSync(supabase.from("reviews").insert(reviewRows), "reviews", "insert"));
  }

  const listRows = Object.values(state.customLists || {}).map((list) => ({
    user_id: userId,
    list_key: list.id,
    title: list.title,
    updated_at: new Date().toISOString()
  }));
  if (listRows.length) {
    syncResults.push(await safeRemoteSync(supabase.from("custom_lists").insert(listRows), "custom_lists", "insert"));
  }

  const customListItems = [];
  Object.values(state.customLists || {}).forEach((list) => {
    (list.items || []).forEach((item) => {
      const parts = stableItemParts(itemKey(item), item);
      customListItems.push({
        user_id: userId,
        list_key: list.id,
        item_key: parts.itemKey,
        media_type: parts.mediaType,
        tmdb_id: parts.tmdbId,
        item_data: cleanJson({ ...item, id: parts.tmdbId, media_type: parts.mediaType })
      });
    });
  });
  if (customListItems.length) {
    syncResults.push(await safeRemoteSync(supabase.from("custom_list_items").insert(customListItems), "custom_list_items", "insert"));
  }
  return {
    ok: syncResults.some((result) => result.ok),
    skippedTables: [...remoteSyncDisabledTables],
    failed: syncResults.filter((result) => result.error).length
  };
}

export async function createActivityEvent(userId, action, item, metadata = {}) {
  if (!supabase || !userId || !action) return;
  const hasItem = Boolean(item);
  const key = hasItem ? itemKey(item) : (metadata.itemKey || `${action}:${metadata.entityId || userId}`);
  const parts = hasItem ? stableItemParts(key, item) : { tmdbId: null, mediaType: metadata.mediaType || null };
  const scoped = metadata.episodeKey || metadata.listKey || "";
  const eventKey = `${action}:${key}:${scoped}:${new Date().toISOString().slice(0, 10)}`;
  const { error } = await supabase.from("activity_events").upsert({
    user_id: userId,
    event_key: eventKey,
    action,
    type: action,
    item_key: key,
    tmdb_id: parts.tmdbId,
    media_type: parts.mediaType,
    title: hasItem ? titleOfItem(item) : metadata.title || null,
    poster_path: hasItem ? (item.poster_path || metadata.poster_path || null) : (metadata.poster_path || null),
    item_data: hasItem ? { ...item, poster_path: item.poster_path || metadata.poster_path || "" } : {},
    metadata,
    created_at: new Date().toISOString()
  }, { onConflict: "user_id,event_key" });
  if (error) warnSupabase("activity_events", "upsert", error);
}

export async function backfillActivityEventPoster(userId, item, { posterPath = "", backdropPath = "" } = {}) {
  if (!supabase || !userId || !item || !posterPath) return null;
  const key = itemKey(item);
  const parts = stableItemParts(key, item);
  let rows = await safeSupabaseResult(
    supabase.from("activity_events").select("id,metadata").eq("user_id", userId).eq("item_key", parts.itemKey).limit(5),
    "activity_events",
    "poster select",
    []
  ) || [];
  if (!rows.length && parts.tmdbId) {
    rows = await safeSupabaseResult(
      supabase.from("activity_events").select("id,metadata").eq("user_id", userId).eq("tmdb_id", parts.tmdbId).eq("media_type", parts.mediaType).limit(5),
      "activity_events",
      "poster select",
      []
    ) || [];
  }
  if (!rows.length) return null;
  const settled = await Promise.allSettled(rows.map(async (row) => {
    const metadata = {
      ...(row.metadata || {}),
      poster_path: posterPath,
      backdrop_path: backdropPath || row.metadata?.backdrop_path || ""
    };
    const updateWithPoster = await supabase.from("activity_events").update({ poster_path: posterPath, metadata }).eq("id", row.id);
    if (updateWithPoster.error) {
      warnSupabase("activity_events", "poster update", updateWithPoster.error);
      const metadataOnly = await supabase.from("activity_events").update({ metadata }).eq("id", row.id);
      if (metadataOnly.error) warnSupabase("activity_events", "metadata poster update", metadataOnly.error);
    }
  }));
  return { updated: settled.filter((result) => result.status === "fulfilled").length };
}

export async function saveReleaseReminder(userId, item, { reminderType = "release", providerName = "" } = {}) {
  if (!supabase || !userId || !item) return null;
  const type = item.media_type || (item.first_air_date || item.name ? "tv" : "movie");
  const releaseDate = item.release_date || item.first_air_date || null;
  return safeSupabaseResult(
    supabase.from("release_reminders").upsert({
      ...productItemRow(userId, { ...item, media_type: type }),
      release_date: releaseDate,
      reminder_type: reminderType,
      provider_name: providerName || null
    }, { onConflict: "user_id,item_key,reminder_type" }).select("id,item_key,reminder_type").single(),
    "release_reminders",
    "upsert",
    null
  );
}

export async function removeReleaseReminder(userId, item, reminderType = "release") {
  if (!supabase || !userId || !item) return null;
  return safeSupabaseResult(
    supabase
      .from("release_reminders")
      .delete()
      .eq("user_id", userId)
      .eq("item_key", stableItemParts(itemKey(item), item).itemKey)
      .eq("reminder_type", reminderType),
    "release_reminders",
    "delete",
    null
  );
}
