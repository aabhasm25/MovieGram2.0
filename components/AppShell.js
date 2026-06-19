import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Icon from "@/components/Icon";

export default function AppShell({ title, activeTab, children }) {
  return (
    <main className="app-page">
      <section className="phone-shell">
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
              <span className="badge">3</span>
            </Link>
            <Link
              href="/notifications"
              className={`icon-button ${activeTab === "notifications" ? "active" : ""}`}
              aria-label="Notifications"
            >
              <Icon name="bell" />
              <span className="badge">8</span>
            </Link>
          </div>
        </header>

        <div className="screen-content">{children}</div>
        <BottomNav activeTab={activeTab} />
      </section>
    </main>
  );
}
