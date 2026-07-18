"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import {
  loadNotificationPage,
  loadPendingFollowRequests,
  loadSocialUser,
  markNotificationsVisibleRead,
  relativeSocialTime,
  respondToFollowRequest
} from "@/lib/socialClient";

const PAGE_SIZE = 25;

function SocialAvatar({ profile, className = "" }) {
  const label = profile?.display_name || profile?.username || "MovieGram";
  if (profile?.avatar_url) return <img className={`mg-social-avatar ${className}`} src={profile.avatar_url} alt={`${label} profile`} />;
  return <span className={`mg-social-avatar fallback ${className}`} aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span>;
}

function notificationCopy(notification) {
  if (notification.message) return notification.message;
  const actor = notification.actor?.display_name || notification.actor?.username || "Someone";
  const titles = {
    follow_request: `${actor} requested to follow you`,
    follow_accepted: `${actor} accepted your follow request`,
    follow_accept: `${actor} accepted your follow request`,
    new_follower: `${actor} started following you`,
    follow: `${actor} started following you`,
    like: `${actor} liked your post`,
    comment: `${actor} commented on your post`,
    reply: `${actor} replied to your comment`,
    shared_list: `${actor} shared a list with you`,
    list_collaboration_invite: `${actor} invited you to collaborate on a list`
  };
  return titles[notification.type] || `${actor} sent a MovieGram update`;
}

function notificationHref(notification) {
  if (notification.metadata?.href) return notification.metadata.href;
  const entityId = notification.entity_id || notification.actor_id;
  if (!entityId) return null;
  if (notification.entity_type === "profile" || notification.type?.startsWith("follow") || notification.type === "new_follower") {
    return `/profile?user=${encodeURIComponent(entityId)}`;
  }
  if (notification.entity_type === "reel") return `/reels?reel=${encodeURIComponent(entityId)}`;
  if (notification.entity_type === "list") return `/profile?list=${encodeURIComponent(entityId)}`;
  if (notification.entity_type === "comment" || notification.entity_type === "media") {
    return `/?entity=${encodeURIComponent(notification.entity_type)}&id=${encodeURIComponent(entityId)}`;
  }
  return null;
}

function NotificationRow({ notification, onVisible, onOpen }) {
  const rowRef = useRef(null);
  useEffect(() => {
    if (notification.is_read || !rowRef.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.65) {
        onVisible(notification.id);
        observer.disconnect();
      }
    }, { threshold: [0.65] });
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [notification.id, notification.is_read, onVisible]);

  return (
    <article ref={rowRef} className={`mg-social-notification${notification.is_read ? "" : " unread"}`}>
      <button type="button" className="mg-social-notification-main" onClick={() => onOpen(notification)}>
        <SocialAvatar profile={notification.actor} />
        <span className="mg-social-notification-copy">
          <strong>{notificationCopy(notification)}</strong>
          {(notification.metadata?.comment_text || notification.metadata?.title || notification.metadata?.item_title) && (
            <small>{notification.metadata.comment_text || notification.metadata.title || notification.metadata.item_title}</small>
          )}
          <em>{relativeSocialTime(notification.created_at)}</em>
        </span>
        {(notification.artwork_url || notification.metadata?.artwork_url || notification.metadata?.poster_url) && (
          <img className="mg-social-notification-art" src={notification.artwork_url || notification.metadata.artwork_url || notification.metadata.poster_url} alt="" />
        )}
      </button>
    </article>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busyIds, setBusyIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const readQueue = useRef(new Set());
  const readTimer = useRef(null);

  const loadFirstPage = useCallback(async (currentUser) => {
    if (!currentUser?.id) return;
    setError("");
    try {
      const [rows, pending] = await Promise.all([
        loadNotificationPage(currentUser.id, { limit: PAGE_SIZE }),
        loadPendingFollowRequests(currentUser.id)
      ]);
      setNotifications(rows);
      setRequests(pending);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (nextError) {
      setError(nextError.message || "Notifications are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadSocialUser().then((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      if (nextUser) loadFirstPage(nextUser);
      else setLoading(false);
    });
    return () => { active = false; };
  }, [loadFirstPage]);

  useEffect(() => {
    const onRealtime = (event) => {
      if (event.detail?.table === "notifications" || event.detail?.table === "realtime") loadFirstPage(user);
    };
    window.addEventListener("moviegram:social-realtime", onRealtime);
    return () => window.removeEventListener("moviegram:social-realtime", onRealtime);
  }, [loadFirstPage, user]);

  useEffect(() => () => window.clearTimeout(readTimer.current), []);

  const queueRead = useCallback((id) => {
    if (!id) return;
    readQueue.current.add(id);
    window.clearTimeout(readTimer.current);
    readTimer.current = window.setTimeout(async () => {
      const ids = [...readQueue.current];
      readQueue.current.clear();
      setNotifications((current) => current.map((item) => ids.includes(item.id) ? { ...item, is_read: true } : item));
      try {
        await markNotificationsVisibleRead(ids);
        window.dispatchEvent(new CustomEvent("moviegram:social-counts-dirty"));
      } catch {
        setNotifications((current) => current.map((item) => ids.includes(item.id) ? { ...item, is_read: false } : item));
      }
    }, 180);
  }, []);

  async function respond(request, accept) {
    if (!request?.follower_id || busyIds[request.id]) return;
    setBusyIds((current) => ({ ...current, [request.id]: true }));
    try {
      await respondToFollowRequest(request.follower_id, accept);
      setRequests((current) => current.filter((item) => item.id !== request.id));
      await loadFirstPage(user);
      window.dispatchEvent(new CustomEvent("moviegram:social-counts-dirty"));
    } catch (nextError) {
      setError(nextError.message || "Could not update the follow request.");
    } finally {
      setBusyIds((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
    }
  }

  async function loadMore() {
    if (!user?.id || loadingMore || !hasMore || !notifications.length) return;
    setLoadingMore(true);
    try {
      const rows = await loadNotificationPage(user.id, {
        before: notifications.at(-1)?.created_at,
        limit: PAGE_SIZE
      });
      setNotifications((current) => {
        const map = new Map(current.map((item) => [item.id, item]));
        rows.forEach((item) => map.set(item.id, item));
        return [...map.values()];
      });
      setHasMore(rows.length === PAGE_SIZE);
    } catch (nextError) {
      setError(nextError.message || "Could not load more notifications.");
    } finally {
      setLoadingMore(false);
    }
  }

  function openNotification(notification) {
    queueRead(notification.id);
    const href = notificationHref(notification);
    if (href) router.push(href);
  }

  const visibleNotifications = useMemo(() => {
    const requestIds = new Set(requests.map((request) => request.follower_id));
    return notifications.filter((notification) => !(notification.type === "follow_request" && requestIds.has(notification.actor_id)));
  }, [notifications, requests]);

  if (!user && !loading) return <div className="mg-social-state">Sign in to see notifications.</div>;

  return (
    <section className="mg-social-page mg-social-notifications" aria-busy={loading}>
      <div className="mg-social-page-actions">
        <button type="button" className="mg-social-back-link" onClick={() => router.back()}><Icon name="back" /> Back</button>
      </div>
      {error && <div className="mg-social-error" role="alert">{error}</div>}
      {loading && <div className="mg-social-state">Loading notifications...</div>}

      {!loading && requests.length > 0 && (
        <section className="mg-social-request-section">
          <h2>Follow requests</h2>
          {requests.map((request) => (
            <article className="mg-social-request" key={request.id}>
              <SocialAvatar profile={request.actor} />
              <span><strong>{request.actor?.display_name || request.actor?.username || "MovieGram user"}</strong><small>@{request.actor?.username || "moviegram"}</small></span>
              <div>
                <button type="button" disabled={busyIds[request.id]} onClick={() => respond(request, true)}>{busyIds[request.id] ? "Working" : "Accept"}</button>
                <button type="button" className="ghost" disabled={busyIds[request.id]} onClick={() => respond(request, false)}>Decline</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && visibleNotifications.length > 0 && (
        <section className="mg-social-notification-list">
          <h2>Notifications</h2>
          {visibleNotifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onVisible={queueRead} onOpen={openNotification} />
          ))}
          {hasMore && <button className="mg-social-load-more" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading..." : "Load earlier"}</button>}
        </section>
      )}

      {!loading && !requests.length && !visibleNotifications.length && !error && (
        <div className="mg-social-state"><Icon name="bell" /><strong>You're all caught up</strong><span>Real activity from MovieGram will appear here.</span></div>
      )}
    </section>
  );
}
