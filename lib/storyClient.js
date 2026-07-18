"use client";

import { getCurrentUserSafe, supabase } from "./supabaseClient";

const STORY_BUCKET = "moviegram-stories";
const STORY_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const STORY_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function storyError(error, fallback) {
  const next = new Error(error?.message || fallback);
  next.code = error?.code;
  return next;
}

function validateStoryFile(file) {
  if (!file) return;
  const isImage = String(file.type || "").startsWith("image/");
  const isVideo = String(file.type || "").startsWith("video/");
  if (!isImage && !isVideo) throw new Error("Choose a supported photo or video.");
  const limit = isVideo ? STORY_MAX_VIDEO_BYTES : STORY_MAX_IMAGE_BYTES;
  if (file.size > limit) throw new Error(isVideo ? "Story videos can be up to 50 MB." : "Story photos can be up to 10 MB.");
}

async function signedStoryUrl(path) {
  if (!path || !supabase) return "";
  const { data, error } = await supabase.storage.from(STORY_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw storyError(error, "Story media is temporarily unavailable.");
  return data?.signedUrl || "";
}

export async function loadVisibleStoryGroups(userId) {
  if (!supabase || !userId) return [];
  const now = new Date().toISOString();
  const { data: stories, error } = await supabase
    .from("stories")
    .select("id,user_id,kind,asset_path,mime_type,note,media_type,tmdb_id,item_key,title,poster_path,backdrop_path,reel_reference,created_at,expires_at")
    .is("deleted_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: true });
  if (error) throw storyError(error, "Stories are temporarily unavailable.");
  if (!stories?.length) return [];

  const ownerIds = [...new Set(stories.map((story) => story.user_id).filter(Boolean))];
  const storyIds = stories.map((story) => story.id);
  const [{ data: profiles, error: profileError }, { data: views, error: viewError }] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,avatar_url,is_private").in("id", ownerIds),
    supabase.from("story_views").select("story_id").eq("user_id", userId).in("story_id", storyIds)
  ]);
  if (profileError) throw storyError(profileError, "Story profiles are temporarily unavailable.");
  if (viewError) throw storyError(viewError, "Story view state is temporarily unavailable.");

  const profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
  const viewed = new Set((views || []).map((row) => row.story_id));
  const hydrated = await Promise.all(stories.map(async (story) => ({
    ...story,
    profile: profileMap[story.user_id] || null,
    viewed: viewed.has(story.id),
    asset_url: story.asset_path ? await signedStoryUrl(story.asset_path) : ""
  })));
  const grouped = new Map();
  hydrated.forEach((story) => {
    if (!grouped.has(story.user_id)) grouped.set(story.user_id, { userId: story.user_id, profile: story.profile, stories: [] });
    grouped.get(story.user_id).stories.push(story);
  });
  return [...grouped.values()].sort((a, b) => {
    if (a.userId === userId) return -1;
    if (b.userId === userId) return 1;
    const aTime = new Date(a.stories.at(-1)?.created_at || 0).getTime();
    const bTime = new Date(b.stories.at(-1)?.created_at || 0).getTime();
    return bTime - aTime;
  });
}

export async function createStory({ kind, file = null, note = "", media = null, reel = null }) {
  if (!supabase) throw new Error("Stories require Supabase.");
  const user = await getCurrentUserSafe();
  if (!user?.id) throw new Error("Sign in to post a Story.");
  validateStoryFile(file);

  let assetPath = "";
  if (file) {
    const extension = String(file.name || "story").split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || (file.type.startsWith("video/") ? "mp4" : "jpg");
    assetPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(STORY_BUCKET).upload(assetPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw storyError(uploadError, "Story media could not be uploaded.");
  }

  const itemType = media
    ? (media.media_type === "tv" || (!media.media_type && media.name) ? "tv" : "movie")
    : null;
  const payload = {
    user_id: user.id,
    kind,
    asset_path: assetPath || null,
    mime_type: file?.type || null,
    note: String(note || "").trim().slice(0, 280) || null,
    media_type: itemType,
    tmdb_id: media?.id ? Number(media.id) : null,
    item_key: media?.id && itemType ? `${itemType}:${media.id}` : null,
    title: media?.title || media?.name || null,
    poster_path: media?.poster_path || null,
    backdrop_path: media?.backdrop_path || null,
    reel_reference: reel || {}
  };
  const { data, error } = await supabase.from("stories").insert(payload).select("*").single();
  if (error) {
    if (assetPath) await supabase.storage.from(STORY_BUCKET).remove([assetPath]);
    throw storyError(error, "Story could not be posted.");
  }
  return { ...data, asset_url: assetPath ? await signedStoryUrl(assetPath) : "" };
}

export async function markStoryViewed(storyId, userId) {
  if (!supabase || !storyId || !userId) return;
  const { error } = await supabase.from("story_views").upsert({ story_id: storyId, user_id: userId }, { onConflict: "story_id,user_id", ignoreDuplicates: true });
  if (error) throw storyError(error, "Story view state could not be saved.");
}

export async function deleteOwnStory(story) {
  if (!supabase || !story?.id) return;
  const { error } = await supabase.from("stories").update({ deleted_at: new Date().toISOString() }).eq("id", story.id);
  if (error) throw storyError(error, "Story could not be deleted.");
  if (story.asset_path) await supabase.storage.from(STORY_BUCKET).remove([story.asset_path]);
}

export function subscribeStories(onChange) {
  if (!supabase) return () => {};
  const channel = supabase.channel("moviegram-home-stories")
    .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
