"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentUserSafe, supabase } from "./supabaseClient";

const NOTIFICATION_PAGE_SIZE = 25;
const MESSAGE_PAGE_SIZE = 40;

function socialError(error, fallback) {
  const next = new Error(error?.message || fallback);
  next.code = error?.code;
  return next;
}

export function relativeSocialTime(value) {
  const timestamp = new Date(value || 0).getTime();
  if (!timestamp) return "";
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function loadSocialUser() {
  return getCurrentUserSafe();
}

export async function loadSocialBadges() {
  if (!supabase) return { notifications: 0, messages: 0 };
  const { data, error } = await supabase.rpc("moviegram_social_badge_counts");
  if (error) throw socialError(error, "Could not load social badges.");
  const row = Array.isArray(data) ? data[0] : data;
  return {
    notifications: Number(row?.unread_notifications || 0),
    messages: Number(row?.unread_conversations || 0)
  };
}

export function subscribeSocialEvents(userId, onEvent) {
  if (!supabase || !userId) return () => {};
  const channel = supabase
    .channel(`moviegram-social-${userId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`
    }, (payload) => onEvent?.({ table: "notifications", payload }))
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "conversation_participants",
      filter: `user_id=eq.${userId}`
    }, (payload) => onEvent?.({ table: "conversation_participants", payload }))
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages"
    }, (payload) => onEvent?.({ table: "messages", payload }))
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onEvent?.({ table: "realtime", status });
      }
    });
  return () => {
    supabase.removeChannel(channel);
  };
}

export function useSocialBadges(explicitUserId = null) {
  const [counts, setCounts] = useState({ notifications: 0, messages: 0 });
  const [userId, setUserId] = useState(explicitUserId || null);
  const refreshTimer = useRef(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    try {
      const next = await loadSocialBadges();
      setCounts(next);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("MovieGram social badge refresh skipped", error?.message);
    }
  }, []);

  useEffect(() => {
    setUserId(explicitUserId || null);
    if (explicitUserId) return;
    let active = true;
    loadSocialUser().then((user) => {
      if (active) setUserId(user?.id || null);
    });
    const { data: authListener } = supabase?.auth?.onAuthStateChange?.((_event, session) => {
      if (active) setUserId(session?.user?.id || null);
    }) || { data: null };
    return () => {
      active = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [explicitUserId]);

  useEffect(() => {
    if (!userId) {
      setCounts({ notifications: 0, messages: 0 });
      return undefined;
    }
    refresh();
    const unsubscribe = subscribeSocialEvents(userId, (event) => {
      window.dispatchEvent(new CustomEvent("moviegram:social-realtime", { detail: event }));
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(refresh, 120);
    });
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(refreshTimer.current);
      window.removeEventListener("focus", onFocus);
      unsubscribe();
    };
  }, [refresh, userId]);

  return { ...counts, refresh };
}

export async function loadNotificationPage(userId, { before = null, limit = NOTIFICATION_PAGE_SIZE } = {}) {
  if (!supabase || !userId) return [];
  let query = supabase
    .from("notifications")
    .select("id,user_id,actor_id,type,entity_type,entity_id,message,is_read,read_at,resolved_at,metadata,artwork_url,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (before) query = query.lt("created_at", before);
  const { data: rows, error } = await query;
  if (error) throw socialError(error, "Could not load notifications.");
  const actorIds = [...new Set((rows || []).map((row) => row.actor_id).filter(Boolean))];
  if (!actorIds.length) return rows || [];
  const { data: actors, error: actorError } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,is_private")
    .in("id", actorIds);
  if (actorError) throw socialError(actorError, "Could not load notification profiles.");
  const actorMap = Object.fromEntries((actors || []).map((actor) => [actor.id, actor]));
  return (rows || []).map((row) => ({ ...row, actor: actorMap[row.actor_id] || null }));
}

export async function loadPendingFollowRequests(userId) {
  if (!supabase || !userId) return [];
  const { data: requests, error } = await supabase
    .from("follows")
    .select("id,follower_id,following_id,status,created_at")
    .eq("following_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw socialError(error, "Could not load follow requests.");
  const ids = [...new Set((requests || []).map((request) => request.follower_id))];
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,bio,is_private")
    .in("id", ids);
  if (profileError) throw socialError(profileError, "Could not load follow request profiles.");
  const map = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
  return (requests || []).map((request) => ({ ...request, actor: map[request.follower_id] || null }));
}

export async function respondToFollowRequest(requesterId, accept) {
  if (!supabase || !requesterId) throw new Error("Follow request is unavailable.");
  const { data, error } = await supabase.rpc("respond_to_follow_request", {
    p_requester_id: requesterId,
    p_accept: Boolean(accept)
  });
  if (error) throw socialError(error, "Could not update the follow request.");
  return Array.isArray(data) ? data[0] : data;
}

export async function markNotificationsVisibleRead(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!supabase || !uniqueIds.length) return 0;
  const { data, error } = await supabase.rpc("mark_notifications_read", { p_notification_ids: uniqueIds });
  if (error) throw socialError(error, "Could not mark notifications read.");
  return Number(data || 0);
}

export async function loadConversationPage({ limit = 30, offset = 0 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_my_conversations", {
    p_limit: Math.min(Math.max(limit, 1), 50),
    p_offset: Math.max(offset, 0)
  });
  if (error) throw socialError(error, "Could not load conversations.");
  return data || [];
}

export async function searchMessageProfiles(query, currentUserId) {
  if (!supabase || !currentUserId) return [];
  const trimmed = String(query || "").trim();
  let request = supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,is_private")
    .neq("id", currentUserId)
    .order("display_name", { ascending: true })
    .limit(20);
  if (trimmed) request = request.or(`username.ilike.%${trimmed.replaceAll(",", "")}%,display_name.ilike.%${trimmed.replaceAll(",", "")}%`);
  const { data, error } = await request;
  if (error) throw socialError(error, "Could not search profiles.");
  return data || [];
}

export async function openDirectConversation(otherUserId) {
  if (!supabase || !otherUserId) throw new Error("Choose another MovieGram user.");
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: otherUserId });
  if (error) throw socialError(error, "Could not open the conversation.");
  return data;
}

export async function loadMessagePage(conversationId, { before = null, limit = MESSAGE_PAGE_SIZE } = {}) {
  if (!supabase || !conversationId) return [];
  let query = supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,content_reference,client_id,created_at,edited_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 80));
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw socialError(error, "Could not load messages.");
  return (data || []).reverse();
}

export async function sendConversationMessage({ conversationId, senderId, body, clientId, contentReference = {} }) {
  if (!supabase || !conversationId || !senderId) throw new Error("Message is unavailable.");
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("Write a message first.");
  if (trimmed.length > 2000) throw new Error("Messages can be up to 2,000 characters.");
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: trimmed,
      client_id: clientId,
      content_reference: contentReference || {}
    })
    .select("id,conversation_id,sender_id,body,content_reference,client_id,created_at,edited_at")
    .single();
  if (error) throw socialError(error, "Message could not be sent.");
  return data;
}

export async function markConversationVisibleRead(conversationId) {
  if (!supabase || !conversationId) return;
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  if (error) throw socialError(error, "Could not mark the conversation read.");
}
