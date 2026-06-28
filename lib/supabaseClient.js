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

export function episodeProgressKey(row = {}) {
  return `tv:${row.show_id}:s${row.season_number}:e${row.episode_number}`;
}

export async function loadMovieGramRemoteState(userId) {
  if (!supabase || !userId) return null;
  const [items, episodes, reviews, lists, listItems] = await Promise.all([
    supabase.from("user_items").select("*").eq("user_id", userId),
    supabase.from("episode_progress").select("*").eq("user_id", userId),
    supabase.from("reviews").select("*").eq("user_id", userId),
    supabase.from("custom_lists").select("*").eq("user_id", userId),
    supabase.from("custom_list_items").select("*").eq("user_id", userId)
  ]);

  const errors = [items.error, episodes.error, reviews.error, lists.error, listItems.error].filter(Boolean);
  if (errors.length) throw errors[0];

  const watchlist = {};
  const watched = {};
  const favorites = {};
  const ratings = {};

  (items.data || []).forEach((row) => {
    const item = row.item_data || { id: row.tmdb_id, media_type: row.media_type };
    const key = row.item_key || itemKey(item);
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
    const [mediaType, rawId] = key.split(":");
    return {
      user_id: userId,
      item_key: key,
      media_type: item.media_type || mediaType,
      tmdb_id: Number(rawId) || item.id || null,
      item_data: item,
      is_watched: Boolean(state.watched?.[key]),
      is_watchlisted: Boolean(state.watchlist?.[key]) && !state.watched?.[key],
      is_favorite: Boolean(state.favorites?.[key]),
      user_rating: state.ratings?.[key] || null,
      watched_at: state.watched?.[key]?.watchedAt || null,
      watched_date_unknown: Boolean(state.watched?.[key] && !state.watched?.[key]?.watchedAt),
      liked_at: state.favorites?.[key]?.likedAt || null,
      updated_at: new Date().toISOString()
    };
  });

  await Promise.all([
    supabase.from("user_items").delete().eq("user_id", userId),
    supabase.from("episode_progress").delete().eq("user_id", userId),
    supabase.from("reviews").delete().eq("user_id", userId),
    supabase.from("custom_list_items").delete().eq("user_id", userId),
    supabase.from("custom_lists").delete().eq("user_id", userId)
  ]);

  if (itemRows.length) {
    const { error } = await supabase.from("user_items").insert(itemRows);
    if (error) throw error;
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
    const { error } = await supabase.from("episode_progress").insert(episodeRows);
    if (error) throw error;
  }

  const reviewRows = Object.entries(state.reviews || {})
    .filter(([, review]) => review?.text?.trim())
    .map(([key, review]) => ({
      user_id: userId,
      item_key: key,
      media_type: review.item?.media_type || key.split(":")[0],
      tmdb_id: Number(key.split(":")[1]) || review.item?.id || null,
      item_data: review.item,
      review_text: review.text.trim(),
      updated_at: new Date().toISOString()
    }));
  if (reviewRows.length) {
    const { error } = await supabase.from("reviews").insert(reviewRows);
    if (error) throw error;
  }

  const listRows = Object.values(state.customLists || {}).map((list) => ({
    user_id: userId,
    list_key: list.id,
    title: list.title,
    updated_at: new Date().toISOString()
  }));
  if (listRows.length) {
    const { error } = await supabase.from("custom_lists").insert(listRows);
    if (error) throw error;
  }

  const customListItems = [];
  Object.values(state.customLists || {}).forEach((list) => {
    (list.items || []).forEach((item) => customListItems.push({
      user_id: userId,
      list_key: list.id,
      item_key: itemKey(item),
      media_type: item.media_type,
      tmdb_id: item.id || null,
      item_data: item
    }));
  });
  if (customListItems.length) {
    const { error } = await supabase.from("custom_list_items").insert(customListItems);
    if (error) throw error;
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
