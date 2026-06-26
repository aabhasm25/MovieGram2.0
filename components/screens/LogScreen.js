"use client";

import { useMemo, useState } from "react";
import Poster from "@/components/Poster";
import Icon from "@/components/Icon";

const libraryItems = [
  { title: "Interstellar", poster: "poster-interstellar", slug: "interstellar", type: "movie", genre: "sci-fi" },
  { title: "Dune", poster: "poster-dune", slug: "dune", type: "movie", genre: "sci-fi" },
  { title: "The Batman", poster: "poster-batman", slug: "the-batman", type: "movie", genre: "drama" },
  { title: "Joker", poster: "poster-joker", slug: "joker", type: "movie", genre: "drama" },
  { title: "The Boys", poster: "poster-boys", slug: "the-boys", type: "tv", genre: "action" },
  { title: "House of the Dragon", poster: "poster-dragon", slug: "house-of-the-dragon", type: "tv", genre: "drama" }
];

const watchlistItems = libraryItems.slice(0, 4);
const watchedItems = libraryItems.slice(2);
const favoriteItems = [libraryItems[0], libraryItems[1], libraryItems[4], libraryItems[5]];
const lists = [
  { id: "weekend", title: "Weekend Watch Party", subtitle: "Big-screen crowd pleasers", items: [libraryItems[1], libraryItems[2], libraryItems[4]] },
  { id: "comfort", title: "Comfort Rewatches", subtitle: "Reliable late-night picks", items: [libraryItems[0], libraryItems[3], libraryItems[5]] },
  { id: "prestige", title: "Prestige Queue", subtitle: "Awards, drama, big feelings", items: [libraryItems[0], libraryItems[2], libraryItems[3]] }
];

const tabs = [
  { id: "watchlist", label: "Watchlist" },
  { id: "watched", label: "Watched" },
  { id: "lists", label: "Lists" },
  { id: "favorites", label: "Favorites" }
];

export default function LogScreen() {
  const [activeTab, setActiveTab] = useState("watchlist");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const sourceItems = activeTab === "watchlist" ? watchlistItems : activeTab === "watched" ? watchedItems : favoriteItems;
  const filteredItems = useMemo(() => sourceItems.filter((item) => {
    const queryMatch = item.title.toLowerCase().includes(query.trim().toLowerCase());
    const typeMatch = typeFilter === "all" || item.type === typeFilter;
    const genreMatch = genreFilter === "all" || item.genre === genreFilter;
    return queryMatch && typeMatch && genreMatch;
  }), [sourceItems, query, typeFilter, genreFilter]);

  return (
    <section className="log-screen">
      <div className="log-search">
        <Icon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your movies and shows" />
      </div>

      <div className="log-tabs" aria-label="Log sections">
        {tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? "selected" : ""} type="button" onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
      </div>

      <div className="log-filters" aria-label="Log filters">
        <button className={typeFilter === "all" ? "selected" : ""} type="button" onClick={() => setTypeFilter("all")}>All</button>
        <button className={typeFilter === "movie" ? "selected" : ""} type="button" onClick={() => setTypeFilter("movie")}>Movie</button>
        <button className={typeFilter === "tv" ? "selected" : ""} type="button" onClick={() => setTypeFilter("tv")}>TV</button>
        <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} aria-label="Genre filter">
          <option value="all">Genre</option>
          <option value="drama">Drama</option>
          <option value="sci-fi">Sci-Fi</option>
          <option value="action">Action</option>
        </select>
      </div>

      {activeTab === "lists" ? (
        <div className="log-list-cards">
          {lists.map((list) => (
            <article key={list.id}>
              <div className="log-list-posters">
                {list.items.map((item) => <i key={item.slug} className={`poster-card ${item.poster}`} aria-hidden="true" />)}
              </div>
              <strong>{list.title}</strong>
              <small>{list.subtitle}</small>
            </article>
          ))}
        </div>
      ) : filteredItems.length ? (
        <div className="poster-grid log-poster-grid">
          {filteredItems.map((item) => <Poster key={`${activeTab}-${item.slug}`} className={item.poster} title={item.title} slug={item.slug} />)}
        </div>
      ) : (
        <div className="empty-state">No titles match your current filters.</div>
      )}
    </section>
  );
}
