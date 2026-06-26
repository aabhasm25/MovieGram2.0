"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Poster from "@/components/Poster";

const profileMovies = [
  { title: "Interstellar", poster: "poster-interstellar", slug: "interstellar" },
  { title: "Dune", poster: "poster-dune", slug: "dune" },
  { title: "Joker", poster: "poster-joker", slug: "joker" },
  { title: "The Batman", poster: "poster-batman", slug: "the-batman" },
  { title: "Oppenheimer", poster: "poster-oppenheimer", slug: "oppenheimer" },
  { title: "The Boys", poster: "poster-boys", slug: "the-boys" }
];

const favoriteTv = [
  { title: "The Boys", poster: "poster-boys", slug: "the-boys" },
  { title: "House of the Dragon", poster: "poster-dragon", slug: "house-of-the-dragon" },
  { title: "Breaking Bad", poster: "poster-joker", slug: "breaking-bad" }
];

const recentActivity = [
  { title: "Interstellar", action: "rated", meta: "5.0 - 2h", poster: "poster-interstellar", slug: "interstellar" },
  { title: "Dune: Part Two", action: "watched", meta: "Today", poster: "poster-dune", slug: "dune-part-two" },
  { title: "Joker", action: "reviewed", meta: "Dark, intense, brilliant", poster: "poster-joker", slug: "joker" }
];

const watchlistPreview = [
  { title: "The Batman", poster: "poster-batman", slug: "the-batman" },
  { title: "The Shawshank Redemption", poster: "poster-shawshank", slug: "the-shawshank-redemption" },
  { title: "Pulp Fiction", poster: "poster-pulp", slug: "pulp-fiction" }
];

export default function ProfileScreen() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const stats = [
    ["526", "Watched"],
    ["91", "Watchlist"],
    ["132", "Reviews"],
    ["1.8k", "Followers"],
    ["246", "Following"]
  ];
  const highlights = [
    { label: "Favorites", items: profileMovies.slice(0, 3) },
    { label: "Lists", items: watchlistPreview },
    { label: "Stats", items: profileMovies.slice(2, 5) },
    { label: "Friends", items: favoriteTv }
  ];
  const tabs = [
    { id: "activity", label: "Activity" },
    { id: "watched", label: "Watched" },
    { id: "watchlist", label: "Watchlist" },
    { id: "reviews", label: "Reviews" }
  ];
  const gridItems = activeTab === "activity" ? profileMovies.slice(0, 6) : activeTab === "watched" ? profileMovies : watchlistPreview;

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 160);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <section className="profile-screen">
        <div className="profile-skeleton" aria-label="Loading profile">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  return (
    <section className="profile-screen">
      <div className="profile-head">
        <Avatar className="avatar-one" size="lg" />
        <div>
          <h2>Aabhas</h2>
          <p>@aabhas_07</p>
          <p className="bio">Movies, TV shows and everything in between. Coffee &gt; People</p>
        </div>
      </div>
      <Link href="/profile" className="primary-button secondary profile-edit-button">Edit Profile</Link>

      <div className="profile-stats">
        {stats.map(([value, label]) => <strong key={label}>{value}<small>{label}</small></strong>)}
      </div>

      <div className="profile-highlights" aria-label="Profile highlights">
        {highlights.map((highlight) => (
          <button key={highlight.label} type="button">
            <span>
              {highlight.items.map((item) => <i key={item.slug} className={`poster-card ${item.poster}`} aria-hidden="true" />)}
            </span>
            <small>{highlight.label}</small>
          </button>
        ))}
      </div>

      <div className="profile-tabs" aria-label="Profile sections">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? "selected" : ""} type="button" onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {activeTab !== "reviews" ? (
        gridItems.length ? (
          <div className="poster-grid profile-post-grid">
            {gridItems.map((movie) => (
              <Poster key={`${activeTab}-${movie.slug}`} className={movie.poster} title={movie.title} slug={movie.slug} />
            ))}
          </div>
        ) : <div className="empty-state">Nothing here yet.</div>
      ) : (
        <div className="profile-review-cards">
          {recentActivity.map((item) => (
            <Link key={`${item.action}-${item.slug}`} href={`/movies/${item.slug}`}>
              <i className={`poster-card ${item.poster}`} aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </span>
              <em>{item.action === "rated" ? "5.0" : item.action === "reviewed" ? "4.5" : "8.6"}</em>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
