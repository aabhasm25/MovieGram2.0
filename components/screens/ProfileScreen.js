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

export default function ProfileScreen() {
  return (
    <section className="profile-screen">
      <div className="profile-head">
        <Avatar className="avatar-one" size="lg" />
        <div>
          <h2>Aabhas</h2>
          <p>@aabhas_07</p>
          <div className="profile-stats">
            <strong>526<small>Watched</small></strong>
            <strong>91<small>Saved</small></strong>
            <strong>132<small>Reviews</small></strong>
          </div>
        </div>
      </div>
      <p className="bio">Movies, TV shows and everything in between. Coffee &gt; People</p>
      <div className="profile-actions">
        <Link href="/watchlist" className="primary-button secondary">Watchlist</Link>
      </div>
      <div className="profile-tabs" aria-label="Profile sections">
        <span className="selected">Posts</span>
        <span>Saved</span>
        <span>Reviews</span>
      </div>
      <div className="poster-grid">
        {profileMovies.map((movie) => (
          <Poster key={movie.slug} className={movie.poster} title={movie.title} slug={movie.slug} />
        ))}
      </div>
    </section>
  );
}
