"use client";

import { useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Icon from "@/components/Icon";
import { useSocialBadges } from "@/lib/socialClient";

function badgeLabel(value) {
  const count = Number(value || 0);
  return count > 99 ? "99+" : String(count);
}

export default function AppShell({ title, activeTab, children, hideBottomNav = false }) {
  const badges = useSocialBadges();
  useEffect(() => {
    const refresh = () => badges.refresh();
    window.addEventListener("moviegram:social-counts-dirty", refresh);
    return () => window.removeEventListener("moviegram:social-counts-dirty", refresh);
  }, [badges.refresh]);

  return (
    <main className="app-page">
      <section className={`phone-shell${hideBottomNav ? " social-full" : ""}`}>
        <div className="status-bar">
          <span>9:41</span>
          <span>Wi-Fi</span>
        </div>

        <header className="top-nav">
          <h1>{title}</h1>
          <div className="top-actions" aria-label="Global navigation">
            <Link
              href="/messages"
              className={`icon-button ${activeTab === "messages" ? "active" : ""}`}
              aria-label="Messages"
            >
              <Icon name="messages" />
              {badges.messages > 0 && <span className="badge">{badgeLabel(badges.messages)}</span>}
            </Link>
            <Link
              href="/notifications"
              className={`icon-button ${activeTab === "notifications" ? "active" : ""}`}
              aria-label="Notifications"
            >
              <Icon name="bell" />
              {badges.notifications > 0 && <span className="badge">{badgeLabel(badges.notifications)}</span>}
            </Link>
          </div>
        </header>

        <div className="screen-content">{children}</div>
        {!hideBottomNav && <BottomNav activeTab={activeTab} />}
      </section>
    </main>
  );
}
