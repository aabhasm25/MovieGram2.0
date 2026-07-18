"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import {
  loadConversationPage,
  loadMessagePage,
  loadSocialUser,
  markConversationVisibleRead,
  openDirectConversation,
  relativeSocialTime,
  searchMessageProfiles,
  sendConversationMessage
} from "@/lib/socialClient";

const MESSAGE_PAGE_SIZE = 40;

function SocialAvatar({ profile, className = "" }) {
  const label = profile?.display_name || profile?.other_display_name || profile?.username || profile?.other_username || "MovieGram";
  const url = profile?.avatar_url || profile?.other_avatar_url;
  if (url) return <img className={`mg-social-avatar ${className}`} src={url} alt={`${label} profile`} />;
  return <span className={`mg-social-avatar fallback ${className}`} aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span>;
}

function profileFromConversation(conversation) {
  return {
    id: conversation.other_user_id,
    username: conversation.other_username,
    display_name: conversation.other_display_name,
    avatar_url: conversation.other_avatar_url
  };
}

function mergeMessages(current, incoming) {
  const map = new Map();
  [...current, ...incoming].forEach((message) => {
    const key = message.id || message.client_id;
    const optimisticKey = message.client_id ? `client:${message.client_id}` : null;
    if (optimisticKey && map.has(optimisticKey)) map.delete(optimisticKey);
    if (key) map.set(message.id ? `id:${message.id}` : optimisticKey, message);
  });
  return [...map.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function messageDayKey(value) {
  const date = new Date(value || 0);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function messageDayLabel(value) {
  const date = new Date(value || 0);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (messageDayKey(date) === messageDayKey(today)) return "Today";
  if (messageDayKey(date) === messageDayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

export default function MessagesScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const conversationListPageRef = useRef(null);
  const conversationScrollTopRef = useRef(0);
  const restoreConversationScrollRef = useRef(false);
  const messageListRef = useRef(null);
  const composerRef = useRef(null);
  const activeConversationRef = useRef(null);
  const userRef = useRef(null);
  const initialScrollPending = useRef(false);

  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);
  useEffect(() => { userRef.current = user; }, [user]);

  const refreshConversations = useCallback(async () => {
    try {
      const rows = await loadConversationPage({ limit: 40 });
      setConversations(rows);
      setError("");
    } catch (nextError) {
      setError(nextError.message || "Conversations are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadSocialUser().then((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      if (nextUser) refreshConversations();
      else setLoading(false);
    });
    return () => { active = false; };
  }, [refreshConversations]);

  const markOpenChatRead = useCallback(async (conversationId) => {
    if (!conversationId || document.visibilityState !== "visible") return;
    try {
      await markConversationVisibleRead(conversationId);
      setConversations((current) => current.map((item) => item.conversation_id === conversationId ? { ...item, unread_count: 0 } : item));
      window.dispatchEvent(new CustomEvent("moviegram:social-counts-dirty"));
    } catch (nextError) {
      if (process.env.NODE_ENV !== "production") console.warn("MovieGram conversation read state skipped", nextError?.message);
    }
  }, []);

  const openConversation = useCallback(async (conversation) => {
    conversationScrollTopRef.current = conversationListPageRef.current?.scrollTop || 0;
    setActiveConversation(conversation);
    setMessages([]);
    setLoadingMessages(true);
    setError("");
    initialScrollPending.current = true;
    try {
      const rows = await loadMessagePage(conversation.conversation_id, { limit: MESSAGE_PAGE_SIZE });
      setMessages(rows);
      setHasOlder(rows.length === MESSAGE_PAGE_SIZE);
      await markOpenChatRead(conversation.conversation_id);
    } catch (nextError) {
      setError(nextError.message || "Messages are temporarily unavailable.");
    } finally {
      setLoadingMessages(false);
    }
  }, [markOpenChatRead]);

  useLayoutEffect(() => {
    if (activeConversation || !restoreConversationScrollRef.current || !conversationListPageRef.current) return;
    conversationListPageRef.current.scrollTop = conversationScrollTopRef.current;
    restoreConversationScrollRef.current = false;
  }, [activeConversation, conversations]);

  useLayoutEffect(() => {
    if (!initialScrollPending.current || loadingMessages || !messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    initialScrollPending.current = false;
  }, [loadingMessages, messages]);

  useLayoutEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(92, Math.max(24, textarea.scrollHeight))}px`;
  }, [draft]);

  useEffect(() => {
    const onRealtime = (event) => {
      const detail = event.detail;
      if (detail?.table === "messages") {
        const incoming = detail.payload?.new;
        const currentChat = activeConversationRef.current;
        if (incoming?.conversation_id === currentChat?.conversation_id) {
          setMessages((current) => mergeMessages(current, [incoming]));
          if (incoming.sender_id !== userRef.current?.id && document.visibilityState === "visible") {
            markOpenChatRead(currentChat.conversation_id);
          }
          requestAnimationFrame(() => {
            if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
          });
        }
        refreshConversations();
      } else if (detail?.table === "conversation_participants" || detail?.table === "realtime") {
        refreshConversations();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && activeConversationRef.current) {
        markOpenChatRead(activeConversationRef.current.conversation_id);
      }
    };
    window.addEventListener("moviegram:social-realtime", onRealtime);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("moviegram:social-realtime", onRealtime);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [markOpenChatRead, refreshConversations]);

  useEffect(() => {
    if (!showNew || !user?.id) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await searchMessageProfiles(query, user.id);
        if (active) setProfiles(rows);
      } catch (nextError) {
        if (active) setError(nextError.message || "Profile search is unavailable.");
      } finally {
        if (active) setSearching(false);
      }
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, showNew, user]);

  async function startConversation(profile) {
    if (!user?.id || profile.id === user.id) return;
    setSearching(true);
    try {
      const conversationId = await openDirectConversation(profile.id);
      const next = {
        conversation_id: conversationId,
        other_user_id: profile.id,
        other_username: profile.username,
        other_display_name: profile.display_name,
        other_avatar_url: profile.avatar_url,
        latest_message: "",
        latest_message_at: null,
        unread_count: 0
      };
      setShowNew(false);
      setQuery("");
      await openConversation(next);
      refreshConversations();
    } catch (nextError) {
      setError(nextError.message || "Could not open this conversation.");
    } finally {
      setSearching(false);
    }
  }

  async function loadOlder() {
    if (!activeConversation || loadingOlder || !hasOlder || !messages.length) return;
    const list = messageListRef.current;
    const previousHeight = list?.scrollHeight || 0;
    setLoadingOlder(true);
    try {
      const rows = await loadMessagePage(activeConversation.conversation_id, {
        before: messages[0].created_at,
        limit: MESSAGE_PAGE_SIZE
      });
      setMessages((current) => mergeMessages(rows, current));
      setHasOlder(rows.length === MESSAGE_PAGE_SIZE);
      requestAnimationFrame(() => {
        if (list) list.scrollTop += list.scrollHeight - previousHeight;
      });
    } catch (nextError) {
      setError(nextError.message || "Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(event, retryMessage = null) {
    event?.preventDefault();
    const body = String(retryMessage?.body ?? draft).trim();
    if (!body || sending || !activeConversation || !user?.id) return;
    if (body.length > 2000) {
      setError("Messages can be up to 2,000 characters.");
      return;
    }
    const clientId = retryMessage?.client_id || crypto.randomUUID();
    const optimistic = {
      client_id: clientId,
      conversation_id: activeConversation.conversation_id,
      sender_id: user.id,
      body,
      content_reference: {},
      created_at: new Date().toISOString(),
      status: "sending"
    };
    setSending(true);
    if (!retryMessage) setDraft("");
    setMessages((current) => mergeMessages(current.filter((item) => item.client_id !== clientId), [optimistic]));
    requestAnimationFrame(() => {
      if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    });
    try {
      const saved = await sendConversationMessage({
        conversationId: activeConversation.conversation_id,
        senderId: user.id,
        body,
        clientId
      });
      setMessages((current) => mergeMessages(current.filter((item) => item.client_id !== clientId), [saved]));
      refreshConversations();
      window.dispatchEvent(new CustomEvent("moviegram:social-counts-dirty"));
    } catch (nextError) {
      setMessages((current) => current.map((item) => item.client_id === clientId ? { ...item, status: "failed" } : item));
      setError(nextError.message || "Message failed to send.");
    } finally {
      setSending(false);
    }
  }

  function closeChat() {
    restoreConversationScrollRef.current = true;
    setActiveConversation(null);
    setMessages([]);
    refreshConversations();
  }

  if (!user && !loading) return <div className="mg-social-state">Sign in to use Messages.</div>;

  if (activeConversation) {
    const otherProfile = profileFromConversation(activeConversation);
    return (
      <section className="mg-social-page mg-social-chat">
        <header className="mg-social-chat-header">
          <button type="button" aria-label="Back to conversations" onClick={closeChat}><Icon name="back" /></button>
          <SocialAvatar profile={otherProfile} />
          <span><strong>{otherProfile.display_name || otherProfile.username || "MovieGram user"}</strong><small>@{otherProfile.username || "moviegram"}</small></span>
        </header>
        <div className="mg-social-message-list" ref={messageListRef}>
          {error && <div className="mg-social-error" role="alert">{error}</div>}
          {hasOlder && <button className="mg-social-load-more" type="button" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? "Loading..." : "Load older messages"}</button>}
          {loadingMessages && <div className="mg-social-state">Loading messages...</div>}
          {!loadingMessages && !messages.length && <div className="mg-social-state compact">Start the conversation.</div>}
          {messages.map((message, index) => {
            const mine = message.sender_id === user.id;
            const reference = message.content_reference || {};
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const startsDay = !previous || messageDayKey(previous.created_at) !== messageDayKey(message.created_at);
            const grouped = previous && previous.sender_id === message.sender_id && (new Date(message.created_at) - new Date(previous.created_at)) < 5 * 60 * 1000;
            const endsGroup = !next || next.sender_id !== message.sender_id || (new Date(next.created_at) - new Date(message.created_at)) >= 5 * 60 * 1000;
            return (
              <div className={`mg-social-message-cluster${grouped ? " grouped" : ""}`} key={message.id || message.client_id}>
                {startsDay && <div className="mg-social-date-separator"><span>{messageDayLabel(message.created_at)}</span></div>}
                <article className={`mg-social-bubble${mine ? " mine" : ""}${message.status === "failed" ? " failed" : ""}${grouped ? " grouped" : ""}`}>
                  <p>{message.body}</p>
                  {reference.title && <div className="mg-social-message-reference">{reference.artwork_url && <img src={reference.artwork_url} alt="" />}<span><strong>{reference.title}</strong><small>{reference.type || "MovieGram"}</small></span></div>}
                  {endsGroup && <span>{message.status === "sending" ? "Sending..." : message.status === "failed" ? <button type="button" onClick={() => send(null, message)}>Retry</button> : mine ? `Sent - ${relativeSocialTime(message.created_at)}` : relativeSocialTime(message.created_at)}</span>}
                </article>
              </div>
            );
          })}
        </div>
        <form className="mg-social-composer" onSubmit={send}>
          <textarea
            ref={composerRef}
            value={draft}
            maxLength={2000}
            rows={1}
            placeholder="Message..."
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(event);
              }
            }}
          />
          <button type="submit" aria-label="Send message" disabled={!draft.trim() || sending}><Icon name="send" /></button>
        </form>
      </section>
    );
  }

  return (
    <section className="mg-social-page mg-social-messages" ref={conversationListPageRef}>
      <div className="mg-social-page-actions">
        <button type="button" className="mg-social-back-link" onClick={() => router.back()}><Icon name="back" /> Back</button>
        <button type="button" className="mg-social-primary" onClick={() => setShowNew((current) => !current)}>{showNew ? "Cancel" : "New message"}</button>
      </div>
      {error && <div className="mg-social-error" role="alert">{error}</div>}
      {showNew && (
        <section className="mg-social-new-message">
          <label><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search MovieGram users" autoFocus /></label>
          {searching && <div className="mg-social-state compact">Searching...</div>}
          {!searching && profiles.map((profile) => (
            <button type="button" key={profile.id} onClick={() => startConversation(profile)}>
              <SocialAvatar profile={profile} />
              <span><strong>{profile.display_name || profile.username}</strong><small>@{profile.username || "moviegram"}</small></span>
            </button>
          ))}
        </section>
      )}
      {loading && <div className="mg-social-state">Loading conversations...</div>}
      {!loading && !conversations.length && !showNew && !error && (
        <div className="mg-social-state"><Icon name="messages" /><strong>No conversations yet</strong><span>Start a real one-to-one chat with another MovieGram user.</span></div>
      )}
      <div className="mg-social-conversation-list">
        {conversations.map((conversation) => {
          const profile = profileFromConversation(conversation);
          return (
            <button type="button" key={conversation.conversation_id} onClick={() => openConversation(conversation)}>
              <SocialAvatar profile={profile} />
              <span><strong>{profile.display_name || profile.username || "MovieGram user"}</strong><small>{conversation.latest_message || "Start the conversation"}</small></span>
              <em>{conversation.latest_message_at ? relativeSocialTime(conversation.latest_message_at) : ""}{Number(conversation.unread_count) > 0 && <i>{Number(conversation.unread_count) > 99 ? "99+" : conversation.unread_count}</i>}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
