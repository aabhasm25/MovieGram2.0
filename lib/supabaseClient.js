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
  console.error(`MovieGram Supabase ${action} failed for ${table}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    error
  });
}

function pgTextInList(values) {
  return `(${values.map((value) => `"${String(value).replaceAll('"', '\\"')}"`).join(",")})`;
}

export function episodeProgressKey(row = {}) {
  return `tv:${row.show_id}:s${row.season_number}:e${row.episode_number}`;
}

export async function loadMovieGramRemoteState(userId) {
  if (!supabase || !userId) return null;
  const tableRequests = [
    ["user_items", supabase.from("user_items").select("*").eq("user_id", userId)],
    ["episode_progress", supabase.from("episode_progress").select("*").eq("user_id", userId)],
    ["reviews", supabase.from("reviews").select("*").eq("user_id", userId)],
    ["custom_lists", supabase.from("custom_lists").select("*").eq("user_id", userId)],
    ["custom_list_items", supabase.from("custom_list_items").select("*").eq("user_id", userId)]
  ];
  const [items, episodes, reviews, lists, listItems] = await Promise.all(tableRequests.map(([, request]) => request));

  const results = { user_items: items, episode_progress: episodes, reviews, custom_lists: lists, custom_list_items: listItems };
  const failed = Object.entries(results).find(([, result]) => result.error);
  if (failed) {
    const [table, result] = failed;
    logSupabaseError(table, "load", result.error);
    const error = new Error(`${table}: ${result.error.message || "Supabase load failed"}`);
    error.cause = result.error;
    error.table = table;
    throw error;
  }

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
  if (!supabase || !userId) return;
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
      console.warn("MovieGram skipped user_items save without tmdb_id", { key, item });
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

  async function assertSupabase(resultPromise, table, action) {
    const result = await resultPromise;
    if (result.error) {
      logSupabaseError(table, action, result.error);
      const error = new Error(`${table}: ${result.error.message || `Supabase ${action} failed`}`);
      error.cause = result.error;
      error.table = table;
      throw error;
    }
    return result;
  }

  await Promise.all([
    assertSupabase(supabase.from("episode_progress").delete().eq("user_id", userId), "episode_progress", "delete"),
    assertSupabase(supabase.from("reviews").delete().eq("user_id", userId), "reviews", "delete"),
    assertSupabase(supabase.from("custom_list_items").delete().eq("user_id", userId), "custom_list_items", "delete"),
    assertSupabase(supabase.from("custom_lists").delete().eq("user_id", userId), "custom_lists", "delete")
  ]);

  if (itemRows.length) {
    await assertSupabase(supabase.from("user_items").upsert(itemRows, { onConflict: "user_id,item_key" }), "user_items", "upsert");
    await assertSupabase(
      supabase.from("user_items").delete().eq("user_id", userId).not("item_key", "in", pgTextInList(itemRows.map((row) => row.item_key))),
      "user_items",
      "delete stale"
    );
  } else {
    await assertSupabase(supabase.from("user_items").delete().eq("user_id", userId), "user_items", "delete all");
  }

  const episodeRows = Object.values(state.episodeProgress || {}).map((entry) => ({
    user_id: userId,
    show_id: Number(entry.showId),
    season_number: Number(entry.seasonNumber),
    episode_number: Number(entry.episodeNumber),
    watched_at: entry.watchedAt || null,
    watched_date_unknown: Boolean(!entry.watchedAt),
    updated_at: new Date().toISOString()
  }));
  if (episodeRows.length) {
    await assertSupabase(supabase.from("episode_progress").insert(episodeRows), "episode_progress", "insert");
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
    await assertSupabase(supabase.from("reviews").insert(reviewRows), "reviews", "insert");
  }

  const listRows = Object.values(state.customLists || {}).map((list) => ({
    user_id: userId,
    list_key: list.id,
    title: list.title,
    updated_at: new Date().toISOString()
  }));
  if (listRows.length) {
    await assertSupabase(supabase.from("custom_lists").insert(listRows), "custom_lists", "insert");
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
    await assertSupabase(supabase.from("custom_list_items").insert(customListItems), "custom_list_items", "insert");
  }
}

export async function createActivityEvent(userId, action, item, metadata = {}) {
  if (!supabase || !userId || !item) return;
  const key = itemKey(item);
  const scoped = metadata.episodeKey || metadata.listKey || "";
  const eventKey = `${action}:${key}:${scoped}:${new Date().toISOString().slice(0, 10)}`;
  await supabase.from("activity_events").upsert({
    user_id: userId,
    event_key: eventKey,
    action,
    item_key: key,
    item_data: item,
    metadata,
    created_at: new Date().toISOString()
  }, { onConflict: "user_id,event_key" });
}
