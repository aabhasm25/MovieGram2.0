"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg width='500' height='750' viewBox='0 0 500 750' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='500' height='750' fill='%2311151b'/%3E%3Crect x='92' y='240' width='316' height='230' rx='18' fill='%23212731'/%3E%3Ccircle cx='184' cy='330' r='42' fill='%23394350'/%3E%3Cpath d='m122 440 86-92 62 70 50-48 66 70z' fill='%23394350'/%3E%3Ctext x='250' y='570' fill='%239aa3af' font-family='Arial' font-size='30' text-anchor='middle'%3ENo Poster%3C/text%3E%3C/svg%3E";
const BACKDROP_FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg width='1280' height='720' viewBox='0 0 1280 720' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23070a0f'/%3E%3Cstop offset='1' stop-color='%23252b38'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3Ctext x='640' y='380' fill='%239aa3af' font-family='Arial' font-size='48' text-anchor='middle'%3EMovieGram%3C/text%3E%3C/svg%3E";

const tabs = [
  { id: "home", label: "Home", icon: "home" },
  { id: "reels", label: "Reels", icon: "reels" },
  { id: "log", label: "Log", icon: "log" },
  { id: "explore", label: "Explore", icon: "search" },
  { id: "profile", label: "Profile", icon: "profile" }
];

const contentSections = [
  { id: "trending", title: "Trending", endpoint: "/trending/all/week" },
  { id: "movies", title: "Movies", endpoint: "/movie/popular" },
  { id: "series", title: "Web Series", endpoint: "/tv/popular" },
  { id: "anime", title: "Anime", endpoint: "/discover/tv", params: { with_genres: "16", with_origin_country: "JP", sort_by: "popularity.desc" } }
];

const exploreTabs = [
  { id: "trending", label: "Trending", endpoint: "/trending/all/week" },
  { id: "movies", label: "Movies", endpoint: "/movie/now_playing" },
  { id: "tv", label: "TV Shows", endpoint: "/tv/on_the_air" },
  { id: "top", label: "Top Rated", endpoint: "/movie/top_rated" },
  { id: "upcoming", label: "Upcoming", endpoint: "/movie/upcoming" }
];

const exploreHubSections = [
  { id: "today", title: "Trending Today", endpoint: "/trending/all/day" },
  { id: "week", title: "Trending This Week", endpoint: "/trending/all/week" },
  { id: "popularMovies", title: "Popular Movies", endpoint: "/movie/popular" },
  { id: "popularTv", title: "Popular TV Shows", endpoint: "/tv/popular" },
  { id: "topRated", title: "Top Rated", endpoint: "/movie/top_rated" },
  { id: "upcoming", title: "Upcoming", endpoint: "/movie/upcoming" }
];

const friends = [
  { id: "aabhas", name: "Aabhas", handle: "@aabhas_07", avatar: "avatar-one" },
  { id: "shruti", name: "Shruti", handle: "@shruti", avatar: "avatar-two" },
  { id: "rohan", name: "Rohan", handle: "@rohan99", avatar: "avatar-three" },
  { id: "arjun", name: "Arjun", handle: "@arjunfilms", avatar: "avatar-four" },
  { id: "meera", name: "Meera", handle: "@meera", avatar: "avatar-five" }
];

const conversations = [
  {
    id: "rohan",
    friend: friends[2],
    unread: 2,
    messages: [
      { id: 1, from: "them", text: "That ending in Dune still has me thinking.", time: "2:11 PM" },
      { id: 2, from: "me", text: "Same. The sound design carried the whole theater.", time: "2:14 PM" },
      { id: 3, from: "them", text: "Weekend rewatch?", time: "2:16 PM" }
    ]
  },
  {
    id: "shruti",
    friend: friends[1],
    unread: 1,
    messages: [
      { id: 1, from: "them", text: "Add The Batman to tonight's watch party?", time: "6:48 PM" },
      { id: 2, from: "me", text: "Yes. Dark, rainy, perfect.", time: "6:51 PM" }
    ]
  },
  {
    id: "arjun",
    friend: friends[3],
    unread: 0,
    messages: [
      { id: 1, from: "them", text: "Sent you a list: neo-noir favorites.", time: "Yesterday" },
      { id: 2, from: "me", text: "Saving it. Need more Fincher energy.", time: "Yesterday" }
    ]
  }
];

const feedSeeds = [
  { id: "feed-1", friend: friends[0], action: "watched", title: "Dune: Part Two", body: "Absolutely stunning. The visuals, the scale, the storytelling.", poster: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg", rating: "8.6", time: "2h" },
  { id: "feed-2", friend: friends[1], action: "rated", title: "Interstellar", body: "A perfect late-night rewatch.", poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", rating: "5.0", time: "5h" },
  { id: "feed-3", friend: friends[2], action: "reviewed", title: "Joker", body: "Dark, intense and absolutely brilliant.", poster: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg", rating: "4.5", time: "8h" },
  { id: "feed-4", friend: friends[3], action: "added", title: "The Batman", body: "Added to watchlist.", poster: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", rating: "", time: "12h" },
  { id: "feed-5", friend: friends[4], action: "watched", title: "Friends - S2 E14", body: "Comfort episode unlocked.", poster: "/f496cm9enuEsZkSPzCwnTESEK5s.jpg", rating: "", time: "16h" }
];

const socialFeedSeeds = [
  {
    id: "social-1",
    friend: friends[0],
    activity: "watched",
    title: "Dune: Part Two",
    poster: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    time: "18 min",
    caption: "The sandworm sequence still has my whole brain vibrating.",
    likes: 342,
    comments: 26
  },
  {
    id: "social-2",
    friend: friends[1],
    activity: "rated",
    title: "Interstellar",
    poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    time: "1h",
    caption: "Five stars for making me stare quietly at the ceiling again.",
    rating: "5.0",
    likes: 219,
    comments: 18
  },
  {
    id: "social-3",
    friend: friends[2],
    activity: "reviewed",
    title: "Joker",
    poster: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    time: "3h",
    caption: "Dark, intense, and absolutely brilliant. Joaquin is unreal here.",
    rating: "4.5",
    likes: 188,
    comments: 14
  }
];

const socialFriendProfiles = [
  { ...friends[1], bio: "Sci-fi, prestige drama, and ruthless five-star restraint.", match: 94, mutuals: 8, genres: ["Sci-Fi", "Drama", "Thriller"], activity: "Rated Interstellar 5.0", stats: ["312 watched", "48 lists"] },
  { ...friends[2], bio: "Neo-noir lists, comic book rewatches, and big theater energy.", match: 88, mutuals: 6, genres: ["Crime", "Action", "Noir"], activity: "Reviewed Joker", stats: ["526 watched", "132 reviews"] },
  { ...friends[3], bio: "Slow cinema on weekdays, superhero chaos on weekends.", match: 81, mutuals: 4, genres: ["Action", "Drama", "Fantasy"], activity: "Added The Batman", stats: ["204 watched", "37 lists"] },
  { ...friends[4], bio: "Comfort shows, sharp thrillers, and very serious watch parties.", match: 76, mutuals: 5, genres: ["Comedy", "Thriller", "TV"], activity: "Watched Friends", stats: ["188 watched", "21 reviews"] }
];

const blendSeeds = [
  { id: "shruti-blend", title: "Aabhas + Shruti", friends: [socialFriendProfiles[0]], match: 94, genres: ["Sci-Fi", "Drama", "Thriller"] },
  { id: "night-crew", title: "Night Crew Blend", friends: [socialFriendProfiles[0], socialFriendProfiles[1], socialFriendProfiles[2]], match: 87, genres: ["Crime", "Action", "Sci-Fi"] },
  { id: "comfort-club", title: "Comfort Club", friends: [socialFriendProfiles[2], socialFriendProfiles[3]], match: 79, genres: ["TV", "Comedy", "Fantasy"] }
];

const fallbackRows = {
  trending: [
    { id: 693134, media_type: "movie", title: "Dune: Part Two", poster_path: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg", backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg", vote_average: 8.2, release_date: "2024-02-27", overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge." },
    { id: 414906, media_type: "movie", title: "The Batman", poster_path: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", backdrop_path: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", vote_average: 7.7, release_date: "2022-03-01", overview: "Batman ventures into Gotham City's underworld when a killer leaves cryptic clues." },
    { id: 1396, media_type: "tv", name: "Breaking Bad", poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg", backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg", vote_average: 8.9, first_air_date: "2008-01-20", overview: "A chemistry teacher turns to manufacturing methamphetamine." }
  ],
  movies: [
    { id: 157336, media_type: "movie", title: "Interstellar", poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", backdrop_path: "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg", vote_average: 8.4, release_date: "2014-11-05", overview: "Explorers travel through a wormhole in space in an attempt to save humanity." },
    { id: 872585, media_type: "movie", title: "Oppenheimer", poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", backdrop_path: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg", vote_average: 8.1, release_date: "2023-07-19", overview: "The story of J. Robert Oppenheimer and the creation of the atomic bomb." },
    { id: 496243, media_type: "movie", title: "Parasite", poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", backdrop_path: "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg", vote_average: 8.5, release_date: "2019-05-30", overview: "Greed and class discrimination threaten a newly formed symbiotic relationship." }
  ],
  series: [
    { id: 1399, media_type: "tv", name: "Game of Thrones", poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg", vote_average: 8.5, first_air_date: "2011-04-17", overview: "Noble families vie for control of the Iron Throne." },
    { id: 94997, media_type: "tv", name: "House of the Dragon", poster_path: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg", backdrop_path: "/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg", vote_average: 8.4, first_air_date: "2022-08-21", overview: "The Targaryen dynasty faces a succession crisis." },
    { id: 76479, media_type: "tv", name: "The Boys", poster_path: "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg", backdrop_path: "/mGVrXeIjyecj6TKmwPVpHlscEmw.jpg", vote_average: 8.4, first_air_date: "2019-07-25", overview: "Vigilantes take on corrupt superheroes." }
  ],
  anime: [
    { id: 37854, media_type: "tv", name: "One Piece", poster_path: "/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg", backdrop_path: "/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg", vote_average: 8.7, first_air_date: "1999-10-20", overview: "Monkey D. Luffy sails with his crew in search of the ultimate treasure." },
    { id: 1429, media_type: "tv", name: "Attack on Titan", poster_path: "/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg", backdrop_path: "/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg", vote_average: 8.7, first_air_date: "2013-04-07", overview: "Humanity fights for survival against man-eating giants." },
    { id: 95479, media_type: "tv", name: "Jujutsu Kaisen", poster_path: "/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg", backdrop_path: "/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg", vote_average: 8.6, first_air_date: "2020-10-03", overview: "A student joins a secret organization of sorcerers." }
  ]
};

const genreSeeds = [
  { id: 28, name: "Action", tone: "violet" },
  { id: 878, name: "Sci-Fi", tone: "blue" },
  { id: 18, name: "Drama", tone: "rose" },
  { id: 53, name: "Thriller", tone: "amber" },
  { id: 16, name: "Anime", tone: "green" },
  { id: 35, name: "Comedy", tone: "purple" },
  { id: 80, name: "Crime", tone: "red" }
];

const collectionSeeds = [
  { id: "sci-fi", title: "Mind-Bending Sci-Fi", subtitle: "12 titles", items: [fallbackRows.movies[0], fallbackRows.trending[0]] },
  { id: "prestige", title: "Prestige TV Nights", subtitle: "8 shows", items: [fallbackRows.trending[2], fallbackRows.series[1]] },
  { id: "dark", title: "Dark & Gritty", subtitle: "15 picks", items: [fallbackRows.trending[1], fallbackRows.movies[1]] },
  { id: "anime", title: "Anime Starter Pack", subtitle: "10 shows", items: [fallbackRows.anime[0], fallbackRows.anime[1]] }
];

const actorFallbacks = [
  { id: 1, name: "Cillian Murphy", known_for_department: "Acting", profile_path: "/llkbyWKwpfowZ6C8peBjIV9jj99.jpg" },
  { id: 2, name: "Zendaya", known_for_department: "Acting", profile_path: "/3WdOloHpjtjL96uVOhFRRCcYSwq.jpg" },
  { id: 3, name: "Robert Pattinson", known_for_department: "Acting", profile_path: "/8A4PS5iG7GWEAVFftyqMZKl3qcr.jpg" },
  { id: 4, name: "Anya Taylor-Joy", known_for_department: "Acting", profile_path: "/6bX3q6o7Qf9LhEDPH1v3cV6ZJYz.jpg" }
];

function mediaType(item) {
  if (item.media_type) return item.media_type;
  return item.first_air_date || item.name ? "tv" : "movie";
}

function titleOf(item) {
  return item.title || item.name || item.original_title || item.original_name || "Untitled";
}

function dateOf(item) {
  return item.release_date || item.first_air_date || "";
}

function yearOf(item) {
  return dateOf(item)?.slice(0, 4) || "TBA";
}

function keyOf(item) {
  return `${mediaType(item)}:${item.id}`;
}

function posterUrl(path, size = "w500") {
  return path ? `${IMAGE_BASE}/${size}${path}` : POSTER_FALLBACK;
}

function backdropUrl(path, size = "w1280") {
  return path ? `${IMAGE_BASE}/${size}${path}` : BACKDROP_FALLBACK;
}

function normalize(items = []) {
  return items.filter((item) => item?.id && ["movie", "tv"].includes(mediaType(item)));
}

function dedupe(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortResults(items = [], query = "") {
  const q = query.trim().toLowerCase();
  return [...items].sort((a, b) => {
    const at = titleOf(a).toLowerCase();
    const bt = titleOf(b).toLowerCase();
    const as = (at === q ? 100000 : 0) + (at.startsWith(q) ? 40000 : 0) + (at.includes(q) ? 12000 : 0) + (a.popularity || 0) * 12 + (a.vote_count || 0);
    const bs = (bt === q ? 100000 : 0) + (bt.startsWith(q) ? 40000 : 0) + (bt.includes(q) ? 12000 : 0) + (b.popularity || 0) * 12 + (b.vote_count || 0);
    return bs - as;
  });
}

function stored(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function Icon({ name }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
    search: "M11 17a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm5-1 5 5",
    reels: "M4 5h16v16H4zM8 5l3 5m3-5 3 5M4 10h16m-8 4 4 2.5-4 2.5z",
    log: "M12 5v14M5 12h14M5 5h14v14H5z",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
    feed: "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4",
    chat: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
    bell: "M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16zM10 21h4",
    bookmark: "M6 4h12v17l-6-4-6 4z",
    check: "m5 12 4 4L19 6",
    heart: "M12 21s-7-4.4-9-9a5 5 0 0 1 8-5 5 5 0 0 1 8 5c-2 4.6-9 9-9 9z",
    play: "m8 5 11 7-11 7z",
    send: "m3 11 18-8-8 18-2-8z",
    dots: "M5 12h.01M12 12h.01M19 12h.01",
    back: "M15 18 9 12l6-6"
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function Avatar({ friend, size = "" }) {
  return <span className={`mg2-avatar ${friend.avatar} ${size}`} aria-hidden="true" />;
}

function PhoneShell({ activeTab, setActiveTab, title, children, onOpenMessages, onOpenNotifications, socialActive, onCloseSocial }) {
  function activateTab(tabId) {
    if (socialActive) onCloseSocial();
    setActiveTab(tabId);
  }

  return (
    <main className="mg2-app">
      <section className={`mg2-phone${socialActive ? " social-active" : ""}`}>
        <div className="mg2-status"><span>9:41</span><span>Wi-Fi</span></div>
        <header className="mg2-topbar">
          {activeTab === "home" ? <h1 className="mg2-brand">Movie<span>Gram</span></h1> : <h1>{title}</h1>}
          <div className="mg2-top-actions">
            <button type="button" aria-label="Messages" onClick={onOpenMessages}>
              <Icon name="chat" />
              <em>3</em>
            </button>
            <button type="button" aria-label="Notifications" onClick={onOpenNotifications}>
              <Icon name="bell" />
              <em>7</em>
            </button>
          </div>
        </header>
        <div className={`mg2-screen${socialActive ? " social-active" : ""}`}>{children}</div>
        {!socialActive && (
          <nav className="mg2-bottom" aria-label="Primary navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                type="button"
                onClick={() => activateTab(tab.id)}
                onPointerUp={() => activateTab(tab.id)}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        )}
      </section>
    </main>
  );
}

function Spinner() {
  return <span className="mg2-spinner" aria-label="Loading" />;
}

function SkeletonRow() {
  return (
    <div className="mg2-row">
      {Array.from({ length: 5 }, (_, index) => <div className="mg2-skeleton" key={index} />)}
    </div>
  );
}

function PosterCard({ item, onOpen, saved, rating, compact = false }) {
  return (
    <button className={`mg2-poster ${compact ? "compact" : ""}`} type="button" onClick={() => onOpen(item)}>
      <img
        src={posterUrl(item.poster_path)}
        alt={titleOf(item)}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = POSTER_FALLBACK;
        }}
      />
      {rating && <span className="mg2-badge">You {rating}</span>}
      {saved && <span className="mg2-save-dot">Saved</span>}
      <strong>{titleOf(item)}</strong>
      <small>{item.vote_average ? item.vote_average.toFixed(1) : "NR"} / {yearOf(item)}</small>
    </button>
  );
}

function ContentRow({ title, items, loading, onOpen, watchlist, ratings }) {
  return (
    <section className="mg2-section">
      <div className="mg2-section-head"><h2>{title}</h2><span>See All</span></div>
      {loading ? <SkeletonRow /> : (
        <div className="mg2-row">
          {items.map((item) => (
            <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={Boolean(watchlist[keyOf(item)])} rating={ratings[keyOf(item)]} />
          ))}
        </div>
      )}
    </section>
  );
}

function GenreRow({ genres }) {
  return (
    <section className="mg2-section mg2-explore-section">
      <div className="mg2-section-head"><h2>Genres</h2><span>Browse</span></div>
      <div className="mg2-genre-row">
        {genres.map((genre) => (
          <button key={genre.id} className={`mg2-genre-card ${genre.tone}`} type="button">
            <strong>{genre.name}</strong>
            <span>Explore</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CollectionRow({ collections, onOpen }) {
  return (
    <section className="mg2-section mg2-explore-section">
      <div className="mg2-section-head"><h2>Collections</h2><span>Curated</span></div>
      <div className="mg2-collection-row">
        {collections.map((collection) => (
          <article className="mg2-collection-card" key={collection.id}>
            <div>
              {collection.items.map((item) => (
                <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
                  <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                </button>
              ))}
            </div>
            <strong>{collection.title}</strong>
            <span>{collection.subtitle}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActorRow({ actors, loading }) {
  return (
    <section className="mg2-section mg2-explore-section">
      <div className="mg2-section-head"><h2>Popular People</h2><span>People</span></div>
      {loading ? <SkeletonRow /> : (
        <div className="mg2-actor-row">
          {actors.map((actor) => (
            <article className="mg2-actor-card" key={actor.id}>
              <img src={posterUrl(actor.profile_path, "w185")} alt={actor.name} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
              <strong>{actor.name}</strong>
              <span>{actor.known_for_department || "Acting"}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ContinueWatchingRow({ items, onOpen }) {
  const rowItems = items.length > 0 ? items : [fallbackRows.movies[0], fallbackRows.trending[1], fallbackRows.trending[2], fallbackRows.series[0]];

  return (
    <section className="mg2-section">
      <div className="mg2-section-head"><h2>Continue Watching</h2><span>See All</span></div>
      <div className="mg2-continue-row">
        {rowItems.map((item, index) => (
          <button key={`${keyOf(item)}-${index}`} type="button" onClick={() => onOpen(item)}>
            <img src={backdropUrl(item.backdrop_path || item.poster_path, "w780")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }} />
            <span><Icon name="play" /></span>
            <strong>{titleOf(item)}</strong>
            <small>{index === 0 ? "1h 24m left" : index === 1 ? "45m left" : "S3 E7 - 32m left"}</small>
            <i style={{ width: `${72 - index * 12}%` }} />
          </button>
        ))}
      </div>
    </section>
  );
}

function ActivityCard({ item }) {
  const hasStars = item.rating || item.action === "rated" || item.action === "reviewed";

  return (
    <article className="mg2-activity-card">
      <Avatar friend={item.friend} size="sm" />
      <div>
        <p><strong>{item.friend.name}</strong> {item.action}</p>
        <h3>{item.title} {hasStars && <span>*****</span>} {item.rating && <em>{item.rating}</em>}</h3>
        {item.body && item.action === "reviewed" && <small>{item.body}</small>}
        <time>{item.time}</time>
      </div>
      <img src={posterUrl(item.poster, "w342")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
      <Icon name="dots" />
    </article>
  );
}

function SocialFeedCard({ item, liked, onLike }) {
  return (
    <article className="mg2-social-card">
      <div className="mg2-social-head">
        <Avatar friend={item.friend} size="sm" />
        <div>
          <strong>{item.friend.name}</strong>
          <span>{item.activity} {item.title}</span>
        </div>
        <time>{item.time}</time>
      </div>
      <div className="mg2-social-poster">
        <img src={posterUrl(item.poster, "w780")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
        {item.rating && <em>{item.rating}/5</em>}
      </div>
      <div className="mg2-social-actions">
        <button className={liked ? "active" : ""} type="button" onClick={() => onLike(item.id)} aria-label={`Like ${item.title}`}>
          <Icon name="heart" />
          <span>{liked ? item.likes + 1 : item.likes}</span>
        </button>
        <button type="button" aria-label={`Comment on ${item.title}`}>
          <Icon name="chat" />
          <span>{item.comments}</span>
        </button>
        <button type="button" aria-label={`Share ${item.title}`}>
          <Icon name="send" />
          <span>Share</span>
        </button>
      </div>
      <p><strong>{item.friend.name}</strong> {item.caption}</p>
    </article>
  );
}

function SocialHomeFeed({ likedFeed, toggleFeedLike }) {
  return (
    <section className="mg2-social-feed" aria-label="Social activity feed">
      {socialFeedSeeds.map((item) => (
        <SocialFeedCard key={item.id} item={item} liked={likedFeed[item.id]} onLike={toggleFeedLike} />
      ))}
    </section>
  );
}

function SearchPanel({ query, setQuery, loading, results, page, totalPages, loadNext, loadPrevious, onOpen, watchlist, ratings, sentinelRef }) {
  return (
    <section className="mg2-search-panel">
      <div className="mg2-search">
        <Icon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} onInput={(event) => setQuery(event.target.value)} placeholder="Search movies, shows, people..." />
        {loading && <Spinner />}
      </div>
      {query.trim() && (
        <>
          <div className="mg2-section-head"><h2>Search Results</h2><span>Page {page} / {totalPages}</span></div>
          {!loading && results.length === 0 && <div className="mg2-empty">No matches yet. Try another title.</div>}
          <div className="mg2-grid">
            {results.map((item) => <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={Boolean(watchlist[keyOf(item)])} rating={ratings[keyOf(item)]} compact />)}
          </div>
          <div ref={sentinelRef} className="mg2-sentinel" />
          <div className="mg2-page-controls">
            <button type="button" disabled={page <= 1 || loading} onClick={loadPrevious}>Previous</button>
            <button type="button" disabled={page >= totalPages || loading} onClick={loadNext}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}

function HomeScreen({ rows, loading, onOpen, watchlist, ratings, continueWatching, recommended, feedItems, toggleFeedLike, toggleFeedSave, likedFeed, savedFeed }) {
  return (
    <>
      <div className="mg2-stories">
        {friends.map((friend, index) => (
          <div className="mg2-story" key={friend.id}>
            <Avatar friend={friend} />
            <span>{index === 0 ? "Your story" : friend.name}</span>
          </div>
        ))}
      </div>

      <SocialHomeFeed likedFeed={likedFeed} toggleFeedLike={toggleFeedLike} />

      <section className="mg2-section mg2-activity-section">
        <div className="mg2-section-head"><h2>Friend Activity</h2><span>See All</span></div>
        {feedItems.slice(0, 5).map((item) => <ActivityCard key={item.id} item={item} />)}
      </section>

      <ContinueWatchingRow items={continueWatching} onOpen={onOpen} />
      <ContentRow title="Recommended for You" items={recommended} loading={loading && recommended.length === 0} onOpen={onOpen} watchlist={watchlist} ratings={ratings} />
      <ContentRow title="Trending This Week" items={rows.trending || []} loading={loading} onOpen={onOpen} watchlist={watchlist} ratings={ratings} />

      {contentSections.filter((section) => section.id !== "trending").map((section) => (
        <ContentRow key={section.id} title={section.title} items={rows[section.id] || []} loading={loading} onOpen={onOpen} watchlist={watchlist} ratings={ratings} />
      ))}
    </>
  );
}

function ExploreScreen({ activeExplore, setActiveExplore, queryProps, tabResults, tabLoading, exploreRows, exploreLoading, actors, actorsLoading, onOpen, watchlist, ratings }) {
  const activeFilter = exploreTabs.find((tab) => tab.id === activeExplore);

  return (
    <>
      <SearchPanel {...queryProps} onOpen={onOpen} watchlist={watchlist} ratings={ratings} />
      <section className="mg2-explore-hero">
        <span>Discovery Hub</span>
        <h2>Find your next obsession.</h2>
        <p>Live TMDB trends, curated collections, genres, and people picks in one place.</p>
      </section>
      <div className="mg2-chips">
        {exploreTabs.map((tab) => (
          <button key={tab.id} className={activeExplore === tab.id ? "active" : ""} type="button" onClick={() => setActiveExplore(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <ContentRow title={activeFilter ? activeFilter.label : "Featured Picks"} items={tabResults} loading={tabLoading} onOpen={onOpen} watchlist={watchlist} ratings={ratings} />
      {exploreHubSections.map((section) => (
        <ContentRow
          key={section.id}
          title={section.title}
          items={exploreRows[section.id] || []}
          loading={exploreLoading}
          onOpen={onOpen}
          watchlist={watchlist}
          ratings={ratings}
        />
      ))}
      <GenreRow genres={genreSeeds} />
      <CollectionRow collections={collectionSeeds} onOpen={onOpen} />
      <ActorRow actors={actors} loading={actorsLoading} />
    </>
  );
}

function FeedCard({ item, liked, saved, onLike, onSave }) {
  return (
    <article className="mg2-feed-card">
      <div className="mg2-feed-head">
        <Avatar friend={item.friend} size="sm" />
        <div><strong>{item.friend.name}</strong> {item.action}<small>{item.time}</small></div>
        <Icon name="dots" />
      </div>
      <img src={posterUrl(item.poster, "w780")} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }} />
      <div className="mg2-stars">***** <span>{item.rating}/10</span></div>
      <p>{item.body}</p>
      <div className="mg2-feed-actions">
        <button className={liked ? "active" : ""} type="button" onClick={() => onLike(item.id)}><Icon name="heart" /> {liked ? 343 : 342}</button>
        <button type="button"><Icon name="chat" /> 26</button>
        <button className={saved ? "active" : ""} type="button" onClick={() => onSave(item.id)}><Icon name="bookmark" /> Save</button>
      </div>
    </article>
  );
}

function FeedScreen({ items, loadMore, likedFeed, savedFeed, toggleFeedLike, toggleFeedSave }) {
  return (
    <section className="mg2-feed-list">
      {items.map((item) => <FeedCard key={item.id} item={item} liked={likedFeed[item.id]} saved={savedFeed[item.id]} onLike={toggleFeedLike} onSave={toggleFeedSave} />)}
      <button className="mg2-wide-button" type="button" onClick={loadMore}>Load more activity</button>
    </section>
  );
}

function ReelsScreen({ rows, watched = {}, watchlist = {}, onOpen, onWatchlist }) {
  const [reelTab, setReelTab] = useState("forYou");
  const [likedReels, setLikedReels] = useState({});
  const [savedReels, setSavedReels] = useState({});
  const baseReels = dedupe([...(rows.trending || []), ...(rows.movies || []), ...(rows.series || []), ...(rows.anime || []), ...fallbackRows.trending, ...fallbackRows.movies, ...fallbackRows.series]);
  const watchedReels = Object.values(watched);
  const friendReels = dedupe([...(rows.series || []), ...(rows.anime || []), ...fallbackRows.series, ...fallbackRows.trending]);
  const reels = (reelTab === "watched" ? (watchedReels.length ? watchedReels : fallbackRows.movies) : reelTab === "friends" ? friendReels : baseReels).slice(0, 10);
  const reelTabs = [
    { id: "forYou", label: "For You" },
    { id: "watched", label: "Watched" },
    { id: "friends", label: "Friends" }
  ];

  function toggleLike(key) {
    setLikedReels((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleSave(key) {
    setSavedReels((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section className="mg2-reel-screen">
      <div className="mg2-reel-tabs" aria-label="Reel feed filters">
        {reelTabs.map((tab) => <button key={tab.id} className={reelTab === tab.id ? "active" : ""} type="button" onClick={() => setReelTab(tab.id)}>{tab.label}</button>)}
      </div>
      {reels.length === 0 ? (
        <div className="mg2-reel-empty">Reels will appear after MovieGram loads trending titles.</div>
      ) : (
        <div className="mg2-reel-stack">
          {reels.map((reel, index) => {
            const key = keyOf(reel);
            const type = mediaType(reel);
            const saved = Boolean(watchlist[key]);
            const liked = Boolean(likedReels[key]);
            const reelGenres = type === "tv" ? ["Series", "Drama", "Binge"] : ["Movie", "Cinematic", "Popular"];
            return (
              <article key={key} className="mg2-reel-card">
                <img className="mg2-reel-bg" src={backdropUrl(reel.backdrop_path || reel.poster_path)} alt="" loading={index === 0 ? "eager" : "lazy"} onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }} />
                <img className="mg2-reel-poster" src={posterUrl(reel.poster_path, "w342")} alt={titleOf(reel)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                <div className="mg2-reel-actions">
                  <button className={liked ? "active" : ""} type="button" onClick={() => toggleLike(key)} aria-label="Like reel"><Icon name="heart" /></button><span>{liked ? "1.3k" : "1.2k"}</span>
                  <button type="button" aria-label="Comment on reel"><Icon name="chat" /></button><span>{32 + index}</span>
                  <button type="button" aria-label="Share reel"><Icon name="send" /></button><span>{78 + index}</span>
                  <button className="mg2-reel-details-button" type="button" onClick={() => onOpen({ ...reel, media_type: type })} aria-label={`Open details for ${titleOf(reel)}`}><Icon name="play" /></button><span>Details</span>
                  <button className={savedReels[key] ? "active" : ""} type="button" onClick={() => toggleSave(key)} aria-label="Save reel"><Icon name="bookmark" /></button><span>Save</span>
                  <button className={saved ? "active" : ""} type="button" onClick={() => onWatchlist(reel)} aria-label="Add to watchlist"><Icon name="check" /></button><span>{saved ? "Added" : "List"}</span>
                </div>
                <div className="mg2-reel-copy">
                  <button type="button" onClick={() => onOpen(reel)}><Icon name="play" /> Open</button>
                  <h2>{titleOf(reel)}</h2>
                  <p><Avatar friend={friends[index % friends.length]} size="sm" /> <strong>{reelTab === "friends" ? friends[index % friends.length].handle.replace("@", "") : "moviegram"}</strong></p>
                  <div className="mg2-reel-meta">
                    <span>{type === "tv" ? "TV Show" : "Movie"}</span>
                    <span>{reel.vote_average ? reel.vote_average.toFixed(1) : "NR"}/10</span>
                    <span>{yearOf(reel)}</span>
                  </div>
                  <div className="mg2-reel-genres">{reelGenres.map((genre) => <span key={genre}>{genre}</span>)}</div>
                  <small>{reel.overview || "A spoiler-free edit from the MovieGram queue."}</small>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LogScreen({ rows, watchlist = {}, watched = {}, ratings = {}, onOpen }) {
  const [logTab, setLogTab] = useState("watchlist");
  const [logQuery, setLogQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const saved = Object.values(watchlist);
  const watchedItems = Object.values(watched);
  const favorites = dedupe([...saved, ...watchedItems, ...(rows.movies || []), ...(rows.series || [])]).slice(0, 12);
  const listCards = [
    { id: "weekend", title: "Weekend Watch Party", subtitle: "Big-screen crowd pleasers", items: dedupe([...(rows.trending || []), ...fallbackRows.trending]).slice(0, 3) },
    { id: "comfort", title: "Comfort Rewatches", subtitle: "Reliable late-night picks", items: dedupe([...(rows.series || []), ...fallbackRows.series]).slice(0, 3) },
    { id: "prestige", title: "Prestige Queue", subtitle: "Awards, drama, long conversations", items: dedupe([...(rows.movies || []), ...fallbackRows.movies]).slice(0, 3) }
  ];
  const logTabs = [
    { id: "watchlist", label: "Watchlist" },
    { id: "watched", label: "Watched" },
    { id: "lists", label: "Lists" },
    { id: "favorites", label: "Favorites" }
  ];
  const sourceItems = logTab === "watchlist"
    ? (saved.length ? saved : dedupe([...(rows.trending || []), ...fallbackRows.trending]))
    : logTab === "watched"
      ? (watchedItems.length ? watchedItems : dedupe([...(rows.movies || []), ...fallbackRows.movies]))
      : favorites;
  const filteredItems = sourceItems.filter((item) => {
    const searchable = `${titleOf(item)} ${item.overview || ""}`.toLowerCase();
    const queryMatch = titleOf(item).toLowerCase().includes(logQuery.trim().toLowerCase());
    const typeMatch = typeFilter === "all" || mediaType(item) === typeFilter;
    const genreMatch = genreFilter === "all" || searchable.includes(genreFilter) || (genreFilter === "anime" && mediaType(item) === "tv");
    return queryMatch && typeMatch && genreMatch;
  });

  return (
    <section className="mg2-log-screen">
      <div className="mg2-log-search">
        <Icon name="search" />
        <input value={logQuery} onChange={(event) => setLogQuery(event.target.value)} placeholder="Search your movies and shows" />
      </div>
      <div className="mg2-log-tabs" aria-label="Log sections">
        {logTabs.map((tab) => <button key={tab.id} className={logTab === tab.id ? "active" : ""} type="button" onClick={() => setLogTab(tab.id)}>{tab.label}</button>)}
      </div>
      <div className="mg2-log-filters" aria-label="Log filters">
        <button className={typeFilter === "all" ? "active" : ""} type="button" onClick={() => setTypeFilter("all")}>All</button>
        <button className={typeFilter === "movie" ? "active" : ""} type="button" onClick={() => setTypeFilter("movie")}>Movie</button>
        <button className={typeFilter === "tv" ? "active" : ""} type="button" onClick={() => setTypeFilter("tv")}>TV</button>
        <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} aria-label="Genre filter">
          <option value="all">Genre</option>
          <option value="drama">Drama</option>
          <option value="sci-fi">Sci-Fi</option>
          <option value="anime">Anime</option>
        </select>
      </div>

      {logTab === "lists" ? (
        <div className="mg2-log-lists">
          {listCards.map((list) => (
            <button key={list.id} type="button">
              <span className="mg2-log-list-posters">
                {list.items.map((item) => <img key={keyOf(item)} src={posterUrl(item.poster_path, "w185")} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />)}
              </span>
              <span><strong>{list.title}</strong><small>{list.subtitle}</small></span>
              <em>{list.items.length}</em>
            </button>
          ))}
        </div>
      ) : filteredItems.length ? (
        <div className="mg2-log-grid">
          {filteredItems.map((item) => <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={Boolean(watchlist[keyOf(item)])} rating={ratings[keyOf(item)]} compact />)}
        </div>
      ) : (
        <div className="mg2-empty">{logTab === "watchlist" ? "Your watchlist is empty. Save titles from Home, Explore, or Details." : logTab === "watched" ? "Mark titles watched from Details to build your history." : "No titles match your current filters."}</div>
      )}
    </section>
  );
}

function ProfileScreen({ watchlist = {}, watched = {}, ratings = {}, loading, onOpen, onOpenBlend, onOpenStats }) {
  const [profileTab, setProfileTab] = useState("activity");
  const saved = Object.values(watchlist);
  const watchedItems = Object.values(watched);
  const ratedKeys = Object.keys(ratings);
  const localItems = dedupe([...watchedItems, ...saved]);
  const fallbackItems = [...fallbackRows.movies, ...fallbackRows.series, ...fallbackRows.trending];
  const recent = (localItems.length ? localItems : fallbackItems).slice(0, 9);
  const reviewItems = ratedKeys
    .map((key) => localItems.find((item) => keyOf(item) === key) || fallbackItems.find((item) => keyOf(item) === key))
    .filter(Boolean)
    .slice(0, 9);
  const watchedGrid = (watchedItems.length ? watchedItems : dedupe([...fallbackRows.movies, ...fallbackRows.series])).slice(0, 12);
  const watchlistGrid = (saved.length ? saved : dedupe([...fallbackRows.trending, ...fallbackRows.movies])).slice(0, 12);
  const statCards = [
    { label: "Watched", value: watchedItems.length || 526 },
    { label: "Watchlist", value: saved.length },
    { label: "Reviews", value: ratedKeys.length },
    { label: "Followers", value: "1.8k" },
    { label: "Following", value: 246 }
  ];
  const highlights = [
    { label: "Favorites", items: fallbackRows.movies },
    { label: "Lists", items: saved.length ? saved : fallbackRows.trending },
    { label: "Stats", items: watchedGrid },
    { label: "Friends", items: fallbackRows.series }
  ];
  const profileTabs = [
    { id: "activity", label: "Activity" },
    { id: "watched", label: "Watched" },
    { id: "watchlist", label: "Watchlist" },
    { id: "reviews", label: "Reviews" }
  ];
  const reviewCards = (reviewItems.length ? reviewItems : recent.slice(0, 3)).map((item, index) => ({
    item,
    rating: ratings[keyOf(item)] || [9, 8, 10][index] || 8,
    note: [
      "Still thinking about this one.",
      "A strong rewatch with friends.",
      "Saved a few favorite scenes."
    ][index] || "Logged on MovieGram."
  }));
  const gridItems = profileTab === "activity" ? recent : profileTab === "watched" ? watchedGrid : watchlistGrid;

  return (
    <section className="mg2-profile">
      <div className="mg2-profile-head">
        <Avatar friend={friends[0]} />
        <div className="mg2-profile-id">
          <h2>Aabhas</h2>
          <p>@aabhas_07</p>
          <span className="mg2-profile-bio">Movies, TV shows and everything in between. Coffee &gt; People</span>
        </div>
      </div>
      <button className="mg2-profile-edit" type="button">Edit Profile</button>

      <div className="mg2-profile-stats">
        {statCards.map((stat) => (
          <strong key={stat.label}>{stat.value}<small>{stat.label}</small></strong>
        ))}
      </div>

      <div className="mg2-profile-highlights" aria-label="Profile highlights">
        {highlights.map((highlight) => (
          <button
            key={highlight.label}
            type="button"
            onClick={() => {
              if (highlight.label === "Stats") onOpenStats();
              if (highlight.label === "Friends") onOpenBlend();
            }}
          >
            <span>
              {highlight.items.slice(0, 3).map((item) => (
                <img key={keyOf(item)} src={posterUrl(item.poster_path, "w185")} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
              ))}
            </span>
            <small>{highlight.label}</small>
          </button>
        ))}
      </div>

      <div className="mg2-profile-tabs" aria-label="Profile sections">
        {profileTabs.map((tab) => (
          <button key={tab.id} className={profileTab === tab.id ? "active" : ""} type="button" onClick={() => setProfileTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {loading && recent.length === 0 ? (
        <div className="mg2-profile-skeleton" aria-label="Loading profile">
          <span /><span /><span />
        </div>
      ) : (
        <>
          {profileTab !== "reviews" && (
            gridItems.length ? (
              <div className="mg2-profile-poster-grid">
                {gridItems.map((item) => (
                  <PosterCard key={keyOf(item)} item={item} onOpen={onOpen} saved={Boolean(watchlist[keyOf(item)])} rating={ratings[keyOf(item)]} compact />
                ))}
              </div>
            ) : <div className="mg2-empty">Add titles to this section from Home, Explore, or Details.</div>
          )}

          {profileTab === "reviews" && (
            reviewCards.length ? (
              <div className="mg2-profile-review-cards">
                {reviewCards.map(({ item, rating, note }) => (
                  <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
                    <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                    <span>
                      <strong>{titleOf(item)}</strong>
                      <small>{yearOf(item)} - {note}</small>
                    </span>
                    <em>{rating}/10</em>
                  </button>
                ))}
              </div>
            ) : <div className="mg2-empty">Rate a movie or show to fill your review cards.</div>
          )}
        </>
      )}
    </section>
  );
}

function FriendsScreen({ friendStates, onFriendAction, onOpenBlend }) {
  const [friendQuery, setFriendQuery] = useState("");
  const [previewFriend, setPreviewFriend] = useState(null);
  const filteredFriends = socialFriendProfiles.filter((friend) => `${friend.name} ${friend.handle} ${friend.genres.join(" ")}`.toLowerCase().includes(friendQuery.trim().toLowerCase()));

  function actionLabel(friendId) {
    const state = friendStates[friendId] || "add";
    if (state === "friends") return "Remove";
    if (state === "requested") return "Requested";
    return "Add";
  }

  return (
    <section className="mg2-friends-screen">
      <div className="mg2-social-search"><Icon name="search" /><input value={friendQuery} onChange={(event) => setFriendQuery(event.target.value)} placeholder="Search people, genres, taste" /></div>
      <div className="mg2-blend-row">
        {socialFriendProfiles.slice(0, 3).map((friend) => (
          <button key={`blend-${friend.id}`} type="button" onClick={() => onOpenBlend(friend.id)}>
            <strong>{friend.match}%</strong>
            <span>{friend.name}</span>
            <small>Blend preview</small>
          </button>
        ))}
      </div>
      <div className="mg2-friend-list">
        {filteredFriends.length ? filteredFriends.map((friend) => {
          const state = friendStates[friend.id] || "add";
          return (
            <article key={friend.id}>
              <button className="mg2-friend-main" type="button" onClick={() => setPreviewFriend(friend)}>
                <Avatar friend={friend} size="sm" />
                <span>
                  <strong>{friend.name}<small>{friend.match}% match</small></strong>
                  <em>{friend.mutuals} mutuals - {friend.genres.join(", ")}</em>
                  <i>{friend.activity}</i>
                </span>
              </button>
              <button className={state} type="button" onClick={() => onFriendAction(friend.id)}>{actionLabel(friend.id)}</button>
            </article>
          );
        }) : <div className="mg2-empty">No people match that search yet.</div>}
      </div>
      {previewFriend && (
        <div className="mg2-friend-preview" onMouseDown={() => setPreviewFriend(null)}>
          <article onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setPreviewFriend(null)}><Icon name="back" /> Back</button>
            <Avatar friend={previewFriend} />
            <h3>{previewFriend.name}</h3>
            <p>{previewFriend.bio}</p>
            <div className="mg2-friend-preview-stats">
              <strong>{previewFriend.match}%<small>Match</small></strong>
              <strong>{previewFriend.mutuals}<small>Mutuals</small></strong>
              <strong>{previewFriend.stats[0].split(" ")[0]}<small>Watched</small></strong>
            </div>
            <div className="mg2-friend-genres">{previewFriend.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            <small>Recent: {previewFriend.activity}</small>
          </article>
        </div>
      )}
    </section>
  );
}

function BlendScreen({ rows, savedBlendLists, onSaveBlend }) {
  const [selectedBlend, setSelectedBlend] = useState(blendSeeds[0].id);
  const [blendTab, setBlendTab] = useState("feed");
  const [createdBlend, setCreatedBlend] = useState(false);
  const blend = blendSeeds.find((item) => item.id === selectedBlend) || blendSeeds[0];
  const members = [{ ...friends[0], match: 100 }, ...blend.friends];
  const commonWatched = dedupe([...fallbackRows.movies, ...fallbackRows.trending]).slice(0, 4);
  const sharedFavorites = dedupe([fallbackRows.movies[0], fallbackRows.trending[0], fallbackRows.series[2], fallbackRows.movies[1]]).slice(0, 4);
  const recommendations = dedupe([...(rows.series || []), ...(rows.anime || []), ...fallbackRows.series, ...fallbackRows.anime]).slice(0, 6);
  const sharedList = dedupe([...(rows.trending || []), ...fallbackRows.movies, ...fallbackRows.series]).slice(0, 5);
  const saved = Boolean(savedBlendLists[blend.id]);
  const savedLists = Object.values(savedBlendLists || {});
  const blendTabs = [
    { id: "feed", label: "Feed" },
    { id: "reels", label: "Reels" },
    { id: "lists", label: "Lists" },
    { id: "match", label: "Match" }
  ];
  const reelItems = dedupe([...commonWatched, ...recommendations]).slice(0, 4);

  return (
    <section className="mg2-blend-screen">
      <div className="mg2-blend-switcher">
        {blendSeeds.map((item) => <button key={item.id} className={item.id === blend.id ? "active" : ""} type="button" onClick={() => setSelectedBlend(item.id)}>{item.title}</button>)}
      </div>
      <div className="mg2-blend-hero">
        <div className="mg2-blend-member-stack">
          {members.slice(0, 4).map((friend) => <Avatar key={friend.id} friend={friend} size="sm" />)}
        </div>
        <strong>{blend.match}%</strong>
        <span>{blend.title}</span>
        <small>{members.map((friend) => friend.name).join(" + ")}</small>
      </div>
      <div className="mg2-blend-genres">{blend.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
      <div className="mg2-blend-insight">
        <strong>Why this works</strong>
        <small>{blend.genres[0]} overlap, {commonWatched.length} common watches, and a shared pull toward high-rated TV nights.</small>
      </div>
      <div className="mg2-blend-actions">
        <button type="button" onClick={() => setCreatedBlend(true)}>{createdBlend ? "Blend Created" : "Create Blend"}</button>
        <button className={saved ? "active" : ""} type="button" onClick={() => onSaveBlend(blend.id, sharedList)}>{saved ? "Saved" : "Save Blend List"}</button>
      </div>
      <div className="mg2-blend-tabs" aria-label="Blend sections">
        {blendTabs.map((tab) => <button key={tab.id} className={blendTab === tab.id ? "active" : ""} type="button" onClick={() => setBlendTab(tab.id)}>{tab.label}</button>)}
      </div>

      {blendTab === "feed" && (
        <div className="mg2-blend-feed">
          {recommendations.map((item, index) => (
            <article key={keyOf(item)}>
              <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
              <span>
                <strong>{titleOf(item)}</strong>
                <small>Because {members[index % members.length].name} likes {blend.genres[index % blend.genres.length]} and you share {commonWatched.length} watched titles.</small>
              </span>
              <button type="button" onClick={() => onSaveBlend(`${blend.id}-feed-${item.id}`, [item])}>Save</button>
            </article>
          ))}
        </div>
      )}

      {blendTab === "reels" && (
        <div className="mg2-blend-reel-grid">
          {reelItems.map((item) => (
            <article key={keyOf(item)}>
              <img src={backdropUrl(item.backdrop_path || item.poster_path, "w780")} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }} />
              <span><Icon name="play" /></span>
              <strong>{titleOf(item)}</strong>
              <small>Spoiler-free edit for this Blend</small>
            </article>
          ))}
        </div>
      )}

      {blendTab === "lists" && (
        <>
          <div className="mg2-social-section"><h3>Shared Watchlist</h3>{sharedList.map((item) => <p key={keyOf(item)}>{titleOf(item)} <small>{mediaType(item) === "tv" ? "TV" : "Movie"}</small></p>)}</div>
          <div className="mg2-social-section">
            <h3>Saved Blend Lists</h3>
            {savedLists.length ? savedLists.map((list) => <p key={list.id}>{list.id.replaceAll("-", " ")} <small>{list.items?.length || 0} titles</small></p>) : <p>No saved Blend lists yet <small>Save one from Feed</small></p>}
          </div>
          <button className="mg2-blend-wide-save" type="button" onClick={() => onSaveBlend(blend.id, sharedList)}>Save Shared Watchlist</button>
        </>
      )}

      {blendTab === "match" && (
        <>
          <div className="mg2-social-section"><h3>People in Blend</h3><div className="mg2-blend-people">{members.map((friend) => <span key={friend.id}><Avatar friend={friend} size="sm" /><strong>{friend.name}</strong><small>{friend.match || blend.match}% match</small></span>)}</div></div>
          <div className="mg2-social-section"><h3>Shared Favorites</h3><div className="mg2-mini-poster-row">{commonWatched.map((item) => <img key={keyOf(item)} src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />)}</div></div>
          <div className="mg2-social-section"><h3>Common Watched</h3>{sharedFavorites.map((item) => <p key={keyOf(item)}>{titleOf(item)} <small>{item.vote_average ? `${item.vote_average.toFixed(1)}/10` : yearOf(item)}</small></p>)}</div>
          <div className="mg2-social-section"><h3>Compatibility Stats</h3>{blend.genres.map((genre, index) => <p key={genre}>{genre}<small>{blend.match - index * 7}% overlap</small></p>)}</div>
        </>
      )}
    </section>
  );
}

function StatsScreen({ watched = {}, ratings = {} }) {
  const watchedCount = Object.keys(watched).length || 78;
  const ratingValues = Object.values(ratings);
  const avgRating = ratingValues.length ? (ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(1) : "4.3";
  const stats = [
    { label: "Watched", value: watchedCount },
    { label: "Hours", value: Math.round(watchedCount * 2.1) },
    { label: "Avg Rating", value: avgRating },
    { label: "Favorite Genre", value: "Sci-Fi" },
    { label: "Top Actor", value: "Cillian" },
    { label: "Top Director", value: "Nolan" }
  ];

  return (
    <section className="mg2-stats-screen">
      <div className="mg2-stats-grid">{stats.map((stat) => <article key={stat.label}><strong>{stat.value}</strong><small>{stat.label}</small></article>)}</div>
      <div className="mg2-social-section">
        <h3>By Genre</h3>
        {["Sci-Fi", "Drama", "Action"].map((genre, index) => <p key={genre}><span style={{ width: `${70 - index * 16}%` }} />{genre}<small>{32 - index * 7}%</small></p>)}
      </div>
      <div className="mg2-social-section">
        <h3>Year Preview</h3>
        <div className="mg2-stats-bars">{[24, 48, 67, 81, 91, 63].map((value, index) => <span key={index} style={{ height: `${value}%` }} />)}</div>
      </div>
    </section>
  );
}

function MessagesScreen({ selectedConversation, setSelectedConversation, friendStates, onFriendAction, onOpenBlend, onClose }) {
  const [socialTab, setSocialTab] = useState("messages");
  const [chatId, setChatId] = useState(null);
  const conversation = conversations.find((item) => item.id === chatId) || conversations.find((item) => item.id === selectedConversation) || conversations[0];

  return (
    <section className={`mg2-social-screen${chatId ? " chat-active" : ""}`}>
      {!chatId && (
        <>
          <div className="mg2-social-header">
            <button className="mg2-social-back" type="button" onClick={onClose}><Icon name="back" /></button>
            <h2>Messages</h2>
          </div>
          <div className="mg2-social-tabs">
            <button className={socialTab === "messages" ? "active" : ""} type="button" onClick={() => { setChatId(null); setSocialTab("messages"); }}>Messages</button>
            <button className={socialTab === "friends" ? "active" : ""} type="button" onClick={() => { setChatId(null); setSocialTab("friends"); }}>Friends</button>
          </div>
        </>
      )}
      {socialTab === "friends" ? (
        <FriendsScreen friendStates={friendStates} onFriendAction={onFriendAction} onOpenBlend={onOpenBlend} />
      ) : chatId ? (
        <div className="mg2-chat native">
          <div className="mg2-chat-head">
            <button type="button" onClick={() => setChatId(null)}><Icon name="back" /></button>
            <Avatar friend={conversation.friend} size="sm" />
            <strong>{conversation.friend.name}</strong>
            <small>{conversation.friend.handle}</small>
          </div>
          <div className="mg2-chat-body">
            {conversation.messages.map((message) => (
              <p key={message.id} className={message.from === "me" ? "me" : ""}>{message.text}<span>{message.time}</span></p>
            ))}
          </div>
          <form className="mg2-composer" onSubmit={(event) => event.preventDefault()}>
            <input placeholder={`Message ${conversation.friend.name}...`} />
            <button type="submit"><Icon name="send" /></button>
          </form>
        </div>
      ) : (
        <div className="mg2-conversations native">
          {conversations.map((item) => (
            <button key={item.id} type="button" onClick={() => { setChatId(item.id); setSelectedConversation(item.id); }}>
              <Avatar friend={item.friend} size="sm" />
              <span><strong>{item.friend.name}</strong><small>{item.messages.at(-1)?.text}</small></span>
              <span className="mg2-conversation-meta">
                <small>{item.messages.at(-1)?.time || "Now"}</small>
                {item.unread > 0 && <em>{item.unread}</em>}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationsScreen() {
  const groups = [
    { label: "Today", items: [
      { friend: socialFriendProfiles[0], title: "Shruti followed you", detail: "You both love sci-fi and prestige drama.", time: "20m" },
      { friend: socialFriendProfiles[1], title: "Rohan liked your Joker review", detail: "Your review is getting attention.", time: "2h" },
      { friend: socialFriendProfiles[2], title: "New Blend ready", detail: "Arjun has 81% taste overlap with you.", time: "5h" }
    ] },
    { label: "This Week", items: [
      { friend: socialFriendProfiles[3], title: "Meera watched Friends", detail: "Comfort episode unlocked.", time: "1d" },
      { friend: socialFriendProfiles[0], title: "Shruti reviewed Interstellar", detail: "Rated it 5.0 after a weekend rewatch.", time: "2d" },
      { friend: friends[0], title: "Recommendation for you", detail: "Because you saved Dune, try Foundation next.", time: "3d" }
    ] },
    { label: "Earlier", items: [
      { friend: socialFriendProfiles[1], title: "Rohan added The Batman", detail: "Added to a neo-noir watchlist.", time: "1w" },
      { friend: socialFriendProfiles[2], title: "Arjun liked your list", detail: "Best rainy-night movies got a new like.", time: "2w" }
    ] }
  ];

  return (
    <section className="mg2-notifications-screen">
      {groups.map((group) => (
        <div key={group.label} className="mg2-notification-group">
          <h3>{group.label}</h3>
          {group.items.map((notification) => (
            <article key={`${group.label}-${notification.title}`}>
              <Avatar friend={notification.friend} size="sm" />
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.detail}</small>
              </span>
              <em>{notification.time}</em>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function WatchlistScreen({ items, onOpen, watchlist, ratings }) {
  return (
    <section>
      <div className="mg2-chips two"><button className="active" type="button">Movies</button><button type="button">TV Shows</button></div>
      {items.length === 0 && <div className="mg2-empty">Your watchlist is empty. Add titles from Home or Explore.</div>}
      <div className="mg2-watch-list">
        {items.map((item) => (
          <button key={keyOf(item)} type="button" onClick={() => onOpen(item)}>
            <img src={posterUrl(item.poster_path, "w185")} alt={titleOf(item)} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
            <span><strong>{titleOf(item)}</strong><small>{yearOf(item)} {ratings[keyOf(item)] ? `- You ${ratings[keyOf(item)]}/10` : ""}</small></span>
            <Icon name="dots" />
          </button>
        ))}
      </div>
    </section>
  );
}

function RatingControl({ value, onRate }) {
  return (
    <div className="mg2-rating">
      {Array.from({ length: 5 }, (_, index) => {
        const rating = (index + 1) * 2;
        return <button key={rating} className={Number(value || 0) >= rating ? "active" : ""} type="button" onClick={() => onRate(rating)}>*</button>;
      })}
    </div>
  );
}

function DetailModal({ item, details, loading, onClose, onWatchlist, saved, watched, onWatched, rating, onRate, onOpen }) {
  const shown = details || item;
  const similar = normalize(details?.similar?.results || []).slice(0, 8);
  const recs = normalize(details?.recommendations?.results || []).slice(0, 8);
  const cast = details?.credits?.cast?.slice(0, 10) || [];
  const trailer = details?.videos?.results?.find((video) => video.site === "YouTube" && video.type === "Trailer") ||
    details?.videos?.results?.find((video) => video.site === "YouTube");
  const type = mediaType(shown);
  const releaseDate = dateOf(shown) || "Release date unavailable";
  const runtimeLabel = type === "tv"
    ? `${details?.number_of_seasons || 1} season${(details?.number_of_seasons || 1) === 1 ? "" : "s"} - ${details?.number_of_episodes || 0} episodes`
    : `${details?.runtime || "Runtime unavailable"}${details?.runtime ? " min" : ""}`;
  const hasBackdrop = Boolean(shown.backdrop_path);
  const heroImage = hasBackdrop
    ? backdropUrl(shown.backdrop_path)
    : (shown.poster_path ? posterUrl(shown.poster_path, "w780") : BACKDROP_FALLBACK);

  return (
    <div className="mg2-modal-backdrop" onMouseDown={onClose}>
      <section className="mg2-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="mg2-back" type="button" onClick={onClose}><Icon name="back" /> Back</button>
        {loading ? (
          <div className="mg2-detail-skeleton" aria-label="Loading details">
            <div />
            <span />
            <span />
            <i />
            <i />
            <i />
          </div>
        ) : (
          <>
            <div className="mg2-detail-hero">
              <img
                className={`mg2-detail-backdrop${hasBackdrop ? "" : " poster-fallback"}`}
                src={heroImage}
                alt=""
                onError={(event) => { event.currentTarget.src = BACKDROP_FALLBACK; }}
              />
              <div className="mg2-detail-hero-copy">
                <img className="mg2-detail-poster" src={posterUrl(shown.poster_path)} alt={titleOf(shown)} onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                <div>
                  <span className="mg2-detail-type">{type === "tv" ? "TV Show" : "Movie"}</span>
                  <h2>{titleOf(shown)}</h2>
                  <p>{releaseDate} - {runtimeLabel}</p>
                  <strong>{shown.vote_average ? shown.vote_average.toFixed(1) : "NR"}/10</strong>
                </div>
              </div>
            </div>
            <div className="mg2-detail-actions">
              <button className={saved ? "active" : ""} type="button" onClick={() => onWatchlist(shown)}>{saved ? "Saved" : "Watchlist"}</button>
              <button className={watched ? "active watched" : ""} type="button" onClick={() => onWatched(shown)}>
                {watched && <Icon name="check" />}
                {watched ? "Watched" : "Mark Watched"}
              </button>
              <button type="button">Like</button>
            </div>
            <section className="mg2-detail-panel">
              <div className="mg2-detail-panel-head">
                <h3>Your Rating</h3>
                <span>{rating ? `${rating}/10` : "Not rated"}</span>
              </div>
              <RatingControl value={rating} onRate={(next) => onRate(shown, next)} />
            </section>
            <section className="mg2-detail-panel">
              <h3>Overview</h3>
              <p className="mg2-overview">{shown.overview || "No overview available for this title yet."}</p>
              <div className="mg2-genre-list">
                {details?.genres?.length ? details.genres.map((genre) => <span key={genre.id}>{genre.name}</span>) : <span>Genre unavailable</span>}
              </div>
            </section>
            <section className="mg2-detail-panel">
              <div className="mg2-detail-panel-head">
                <h3>Cast</h3>
                <span>{cast.length ? `${cast.length} featured` : "Unavailable"}</span>
              </div>
              <div className="mg2-cast-row">
                {cast.length ? cast.map((person) => (
                  <article key={`${person.id}-${person.character}`}>
                    <img src={posterUrl(person.profile_path, "w185")} alt={person.name} loading="lazy" onError={(event) => { event.currentTarget.src = POSTER_FALLBACK; }} />
                    <strong>{person.name}</strong>
                    <span>{person.character || person.job || "Cast"}</span>
                  </article>
                )) : <p>No cast data available.</p>}
              </div>
            </section>
            {trailer && (
              <section className="mg2-detail-panel">
                <div className="mg2-detail-panel-head">
                  <h3>Trailer</h3>
                  <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer">Open YouTube</a>
                </div>
                <div className="mg2-trailer-frame">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title={`${titleOf(shown)} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            )}
            {similar.length > 0 && <ContentRow title="Similar Content" items={similar} loading={false} onOpen={onOpen} watchlist={{}} ratings={{}} />}
            {recs.length > 0 && <ContentRow title="Recommendations" items={recs} loading={false} onOpen={onOpen} watchlist={{}} ratings={{}} />}
          </>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  const cache = useRef(new Map());
  const observer = useRef(null);
  const [activeTab, setActiveTab] = useState("home");
  const [activeExplore, setActiveExplore] = useState("trending");
  const [rows, setRows] = useState(fallbackRows);
  const [loadingRows, setLoadingRows] = useState(false);
  const [tabResults, setTabResults] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [exploreRows, setExploreRows] = useState({
    today: fallbackRows.trending,
    week: fallbackRows.trending,
    popularMovies: fallbackRows.movies,
    popularTv: fallbackRows.series,
    topRated: fallbackRows.movies,
    upcoming: fallbackRows.trending
  });
  const [exploreLoading, setExploreLoading] = useState(false);
  const [popularActors, setPopularActors] = useState(actorFallbacks);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [watchlist, setWatchlist] = useState({});
  const [watched, setWatched] = useState({});
  const [ratings, setRatings] = useState({});
  const [continueWatching, setContinueWatching] = useState([]);
  const [clickSignals, setClickSignals] = useState({});
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(2);
  const [likedFeed, setLikedFeed] = useState({});
  const [savedFeed, setSavedFeed] = useState({});
  const [selectedConversation, setSelectedConversation] = useState(conversations[0].id);
  const [activeSocial, setActiveSocial] = useState(null);
  const [friendStates, setFriendStates] = useState({});
  const [savedBlendLists, setSavedBlendLists] = useState({});

  const apiFetch = useCallback(async (path, params = {}) => {
    if (!API_KEY) throw new Error("Missing NEXT_PUBLIC_TMDB_API_KEY.");
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    const key = url.toString();
    if (cache.current.has(key)) return cache.current.get(key);
    const promise = new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8000);

      fetch(key, { signal: controller.signal })
        .then((response) => {
          window.clearTimeout(timer);
          if (!response.ok) throw new Error(`TMDB ${response.status}`);
          return response.json();
        })
        .then(resolve)
        .catch((error) => {
          window.clearTimeout(timer);
          reject(error);
        });
    }).catch((error) => {
      cache.current.delete(key);
      throw error;
    });
    cache.current.set(key, promise);
    return promise;
  }, []);

  useEffect(() => {
    setWatchlist(stored("moviegram.watchlist", {}));
    setWatched(stored("moviegram.watched", {}));
    setRatings(stored("moviegram.ratings", {}));
    setContinueWatching(stored("moviegram.continueWatching", []));
    setClickSignals(stored("moviegram.clickSignals", {}));
    setLikedFeed(stored("moviegram.feedLikes", {}));
    setSavedFeed(stored("moviegram.feedSaves", {}));
    setFriendStates(stored("moviegram.friendStates", { shruti: "friends", rohan: "friends" }));
    setSavedBlendLists(stored("moviegram.blendLists", {}));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    async function loadRows() {
      setLoadingRows(true);
      try {
        const settled = await Promise.allSettled(contentSections.map(async (section) => {
          const data = await apiFetch(section.endpoint, { page: 1, ...(section.params || {}) });
          return [section.id, dedupe(normalize(data.results)).slice(0, 16)];
        }));
        const next = { ...fallbackRows };
        Object.assign(next, Object.fromEntries(
          settled
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
        ));
        setRows(next);
      } catch {
        setRows(fallbackRows);
      } finally {
        setLoadingRows(false);
      }
    }
    loadRows();
  }, [apiFetch]);

  useEffect(() => {
    async function loadExplore() {
      const tab = exploreTabs.find((item) => item.id === activeExplore);
      if (!tab) return;
      setTabLoading(true);
      try {
        const data = await apiFetch(tab.endpoint, { page: 1 });
        setTabResults(sortResults(dedupe(normalize(data.results))).slice(0, 20));
      } catch {
        setTabResults([]);
      } finally {
        setTabLoading(false);
      }
    }
    loadExplore();
  }, [activeExplore, apiFetch]);

  useEffect(() => {
    async function loadExploreHub() {
      setExploreLoading(true);
      try {
        const settled = await Promise.allSettled(exploreHubSections.map(async (section) => {
          const data = await apiFetch(section.endpoint, { page: 1 });
          return [section.id, dedupe(normalize(data.results)).slice(0, 16)];
        }));
        const next = { ...exploreRows };
        Object.assign(next, Object.fromEntries(
          settled
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
        ));
        setExploreRows(next);
      } catch {
        setExploreRows((current) => current);
      } finally {
        setExploreLoading(false);
      }
    }

    async function loadActors() {
      setActorsLoading(true);
      try {
        const data = await apiFetch("/person/popular", { page: 1 });
        setPopularActors((data.results || []).slice(0, 14));
      } catch {
        setPopularActors(actorFallbacks);
      } finally {
        setActorsLoading(false);
      }
    }

    loadExploreHub();
    loadActors();
  }, [apiFetch]);

  const search = useCallback(async (page = 1, append = false) => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchTotalPages(1);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await apiFetch("/search/multi", { query: debouncedQuery, include_adult: "false", page });
      const merged = append ? dedupe([...searchResults, ...normalize(data.results)]) : dedupe(normalize(data.results));
      setSearchResults(sortResults(merged, debouncedQuery));
      setSearchPage(data.page || page);
      setSearchTotalPages(Math.min(data.total_pages || 1, 500));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [apiFetch, debouncedQuery, searchResults]);

  useEffect(() => {
    search(1, false);
  }, [debouncedQuery]);

  const loadNextSearch = useCallback(() => {
    if (!debouncedQuery || searchLoading || searchPage >= searchTotalPages) return;
    search(searchPage + 1, true);
  }, [debouncedQuery, search, searchLoading, searchPage, searchTotalPages]);

  const sentinelRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    if (!node) return;
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadNextSearch();
    }, { rootMargin: "280px" });
    observer.current.observe(node);
  }, [loadNextSearch]);

  useEffect(() => {
    async function loadDetails() {
      if (!selected) return;
      setDetailsLoading(true);
      setDetails(null);
      try {
        const type = mediaType(selected);
        const data = await apiFetch(`/${type}/${selected.id}`, { append_to_response: "credits,videos,similar,recommendations" });
        setDetails({ ...data, media_type: type });
      } catch {
        setDetails(null);
      } finally {
        setDetailsLoading(false);
      }
    }
    loadDetails();
  }, [apiFetch, selected]);

  const feedItems = useMemo(() => {
    return Array.from({ length: feedPage }, (_, page) => feedSeeds.map((item, index) => ({
      ...item,
      id: `${item.id}-${page}`,
      time: page === 0 ? item.time : `${page + index + 1}d`
    }))).flat();
  }, [feedPage]);

  const recommended = useMemo(() => {
    const saved = Object.values(watchlist);
    const clickedKeys = Object.keys(clickSignals).sort((a, b) => clickSignals[b] - clickSignals[a]);
    const all = dedupe([...saved, ...(rows.trending || []), ...(rows.movies || []), ...(rows.series || []), ...(rows.anime || [])]);
    if (clickedKeys.length === 0 && saved.length === 0) return all.slice(0, 12);
    return all
      .sort((a, b) => (clickSignals[keyOf(b)] || 0) + (watchlist[keyOf(b)] ? 4 : 0) - ((clickSignals[keyOf(a)] || 0) + (watchlist[keyOf(a)] ? 4 : 0)))
      .slice(0, 12);
  }, [clickSignals, rows, watchlist]);

  function openItem(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const nextSignals = { ...clickSignals, [key]: (clickSignals[key] || 0) + 1 };
    const nextContinue = [normalized, ...continueWatching.filter((entry) => keyOf(entry) !== key)].slice(0, 10);
    setSelected(normalized);
    setClickSignals(nextSignals);
    setContinueWatching(nextContinue);
    persist("moviegram.clickSignals", nextSignals);
    persist("moviegram.continueWatching", nextContinue);
  }

  function toggleWatchlist(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const next = { ...watchlist };
    if (next[key]) delete next[key];
    else next[key] = normalized;
    setWatchlist(next);
    persist("moviegram.watchlist", next);
  }

  function toggleWatched(item) {
    const normalized = { ...item, media_type: mediaType(item) };
    const key = keyOf(normalized);
    const next = { ...watched };
    if (next[key]) delete next[key];
    else next[key] = {
      id: normalized.id,
      media_type: normalized.media_type,
      title: normalized.title,
      name: normalized.name,
      poster_path: normalized.poster_path,
      backdrop_path: normalized.backdrop_path,
      vote_average: normalized.vote_average,
      release_date: normalized.release_date,
      first_air_date: normalized.first_air_date,
      watchedAt: new Date().toISOString()
    };
    setWatched(next);
    persist("moviegram.watched", next);
  }

  function rateItem(item, value) {
    const key = keyOf({ ...item, media_type: mediaType(item) });
    const next = { ...ratings, [key]: value };
    setRatings(next);
    persist("moviegram.ratings", next);
  }

  function toggleFeedLike(id) {
    const next = { ...likedFeed, [id]: !likedFeed[id] };
    setLikedFeed(next);
    persist("moviegram.feedLikes", next);
  }

  function toggleFeedSave(id) {
    const next = { ...savedFeed, [id]: !savedFeed[id] };
    setSavedFeed(next);
    persist("moviegram.feedSaves", next);
  }

  function toggleFriendState(friendId) {
    const current = friendStates[friendId] || "add";
    const nextState = current === "add" ? "requested" : current === "requested" ? "friends" : "add";
    const next = { ...friendStates, [friendId]: nextState };
    setFriendStates(next);
    persist("moviegram.friendStates", next);
  }

  function saveBlendList(blendId, items) {
    const next = { ...savedBlendLists, [blendId]: { id: blendId, items, savedAt: new Date().toISOString() } };
    setSavedBlendLists(next);
    persist("moviegram.blendLists", next);
  }

  const title = activeSocial === "messages" ? "Messages" : activeSocial === "notifications" ? "Notifications" : activeSocial === "blend" ? "Blend" : activeSocial === "stats" ? "Stats" : tabs.find((tab) => tab.id === activeTab)?.label || "MovieGram";
  const selectedKey = selected ? keyOf(selected) : "";

  const queryProps = {
    query,
    setQuery,
    loading: searchLoading,
    results: searchResults,
    page: searchPage,
    totalPages: searchTotalPages,
    loadNext: loadNextSearch,
    loadPrevious: () => search(Math.max(1, searchPage - 1), false),
    sentinelRef
  };

  let screen = null;
  if (activeSocial === "messages") {
    screen = (
      <section className="mg2-native-social messages">
        <MessagesScreen selectedConversation={selectedConversation} setSelectedConversation={setSelectedConversation} friendStates={friendStates} onFriendAction={toggleFriendState} onOpenBlend={() => setActiveSocial("blend")} onClose={() => setActiveSocial(null)} />
      </section>
    );
  } else if (activeSocial === "notifications") {
    screen = (
      <section className="mg2-native-social">
        <div className="mg2-social-header">
          <button className="mg2-social-back" type="button" onClick={() => setActiveSocial(null)}><Icon name="back" /></button>
          <h2>Notifications</h2>
        </div>
        <NotificationsScreen />
      </section>
    );
  } else if (activeSocial === "blend") {
    screen = (
      <section className="mg2-native-social">
        <div className="mg2-social-header">
          <button className="mg2-social-back" type="button" onClick={() => setActiveSocial(null)}><Icon name="back" /></button>
          <h2>Blend</h2>
        </div>
        <BlendScreen rows={rows} savedBlendLists={savedBlendLists} onSaveBlend={saveBlendList} />
      </section>
    );
  } else if (activeSocial === "stats") {
    screen = (
      <section className="mg2-native-social">
        <div className="mg2-social-header">
          <button className="mg2-social-back" type="button" onClick={() => setActiveSocial(null)}><Icon name="back" /></button>
          <h2>Stats</h2>
        </div>
        <StatsScreen watched={watched} ratings={ratings} />
      </section>
    );
  } else if (activeTab === "home") {
    screen = <HomeScreen rows={rows} loading={loadingRows} onOpen={openItem} watchlist={watchlist} ratings={ratings} continueWatching={continueWatching} recommended={recommended} feedItems={feedItems} toggleFeedLike={toggleFeedLike} toggleFeedSave={toggleFeedSave} likedFeed={likedFeed} savedFeed={savedFeed} />;
  } else if (activeTab === "reels") {
    screen = <ReelsScreen rows={rows} watched={watched} watchlist={watchlist} onOpen={openItem} onWatchlist={toggleWatchlist} />;
  } else if (activeTab === "log") {
    screen = <LogScreen rows={rows} watchlist={watchlist} watched={watched} ratings={ratings} onOpen={openItem} />;
  } else if (activeTab === "explore") {
    screen = (
      <ExploreScreen
        activeExplore={activeExplore}
        setActiveExplore={setActiveExplore}
        queryProps={queryProps}
        tabResults={tabResults}
        tabLoading={tabLoading}
        exploreRows={exploreRows}
        exploreLoading={exploreLoading}
        actors={popularActors}
        actorsLoading={actorsLoading}
        onOpen={openItem}
        watchlist={watchlist}
        ratings={ratings}
      />
    );
  } else {
    screen = <ProfileScreen watchlist={watchlist} watched={watched} ratings={ratings} loading={loadingRows} onOpen={openItem} onOpenBlend={() => setActiveSocial("blend")} onOpenStats={() => setActiveSocial("stats")} />;
  }

  return (
    <PhoneShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title={title}
      onOpenMessages={() => setActiveSocial("messages")}
      onOpenNotifications={() => setActiveSocial("notifications")}
      socialActive={Boolean(activeSocial)}
      onCloseSocial={() => setActiveSocial(null)}
    >
      {!API_KEY && <div className="mg2-empty">Add NEXT_PUBLIC_TMDB_API_KEY to .env.local.</div>}
      {screen}
      {selected && (
        <DetailModal
          item={selected}
          details={details}
          loading={detailsLoading}
          onClose={() => setSelected(null)}
          onWatchlist={toggleWatchlist}
          saved={Boolean(watchlist[selectedKey])}
          watched={Boolean(watched[selectedKey])}
          onWatched={toggleWatched}
          rating={ratings[selectedKey]}
          onRate={rateItem}
          onOpen={openItem}
        />
      )}
    </PhoneShell>
  );
}
