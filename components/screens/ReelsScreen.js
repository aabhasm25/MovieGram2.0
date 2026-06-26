"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";

const reels = [
  { id: "joker", title: "Joker", type: "Movie", year: "2019", rating: "8.4", genres: ["Drama", "Crime"], poster: "poster-joker", author: "rohan99", caption: "A spoiler-free character edit with that slow-burn Gotham mood.", slug: "joker" },
  { id: "dune", title: "Dune: Part Two", type: "Movie", year: "2024", rating: "8.6", genres: ["Sci-Fi", "Epic"], poster: "poster-dune", author: "aabhas_07", caption: "Desert scale, thunderous score, and one very cinematic watchlist reminder.", slug: "dune-part-two" },
  { id: "boys", title: "The Boys", type: "TV Show", year: "2019", rating: "8.7", genres: ["Action", "Satire"], poster: "poster-boys", author: "shruti", caption: "Fast cuts, chaos energy, and a spoiler-safe reason to start the next episode.", slug: "the-boys" },
  { id: "interstellar", title: "Interstellar", type: "Movie", year: "2014", rating: "8.6", genres: ["Sci-Fi", "Drama"], poster: "poster-interstellar", author: "meera", caption: "A quiet cosmic edit for everyone who likes their movies enormous and emotional.", slug: "interstellar" }
];

const tabs = [
  { id: "forYou", label: "For You" },
  { id: "watched", label: "Watched" },
  { id: "friends", label: "Blend" }
];

export default function ReelsScreen() {
  const [activeTab, setActiveTab] = useState("forYou");
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const visibleReels = activeTab === "watched" ? reels.slice(1) : activeTab === "friends" ? [...reels].reverse() : reels;

  return (
    <section className="reel-view">
      <div className="reel-tabs" aria-label="Reel filters">
        {tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? "selected" : ""} type="button" onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
      </div>
      <div className="reel-stack">
        {visibleReels.map((reel, index) => (
          <article key={reel.id} className={`reel-card ${reel.poster}`}>
            <i className={`reel-poster poster-card ${reel.poster}`} aria-hidden="true" />
            <div className="reel-actions">
              <button className={liked[reel.id] ? "active" : ""} type="button" aria-label="Like" onClick={() => setLiked((current) => ({ ...current, [reel.id]: !current[reel.id] }))}><Icon name="heart" /></button><span>{liked[reel.id] ? "1.3k" : "1.2k"}</span>
              <button type="button" aria-label="Comment"><Icon name="comment" /></button><span>{32 + index}</span>
              <button type="button" aria-label="Share"><Icon name="send" /></button><span>{78 + index}</span>
              <button className={saved[reel.id] ? "active" : ""} type="button" aria-label="Save" onClick={() => setSaved((current) => ({ ...current, [reel.id]: !current[reel.id] }))}><Icon name="bookmark" /></button><span>Save</span>
              <Link className="reel-details-button" href={`/movies/${reel.slug}`} aria-label={`Open details for ${reel.title}`}><span aria-hidden="true" /></Link><span>Details</span>
            </div>
            <div className="reel-copy">
              <h2>{reel.title}</h2>
              <div className="reel-meta"><span>{reel.type}</span><span>{reel.rating}/10</span><span>{reel.year}</span></div>
              <div className="reel-genres">{reel.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
              <p className="reel-author"><Avatar className="avatar-three" size="sm" /> <strong>{reel.author}</strong></p>
              <p>{reel.caption}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
