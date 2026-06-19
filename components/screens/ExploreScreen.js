import Poster from "@/components/Poster";
import { trending } from "@/data/movieData";

export default function ExploreScreen() {
  return (
    <section>
      <div className="search-box">Search movies, shows, people...</div>
      <div className="chips">
        <span className="selected">Trending</span>
        <span>Movies</span>
        <span>TV Shows</span>
        <span>Lists</span>
        <span>People</span>
      </div>

      <div className="explore-grid">
        {[...trending, ...trending, ...trending].map((movie, index) => (
          <div className={`explore-tile tile-${index % 5}`} key={`${movie.title}-${index}`}>
            <Poster className={movie.poster} title={movie.title} slug={movie.slug} />
            <small>{movie.score}</small>
          </div>
        ))}
      </div>

      <div className="section-title">
        <h2>Curated rows</h2>
      </div>
      <article className="list-card">
        <div className="stacked-posters">
          <Poster className="poster-dune" title="Dune" slug="dune" />
          <Poster className="poster-interstellar" title="Interstellar" slug="interstellar" />
        </div>
        <div><strong>Best Sci-Fi Movies</strong><small>by Rohan</small></div>
      </article>
      <article className="list-card">
        <div className="stacked-posters">
          <Poster className="poster-batman" title="The Batman" slug="the-batman" />
          <Poster className="poster-boys" title="The Boys" slug="the-boys" />
        </div>
        <div><strong>Top 250 Movies</strong><small>by Aabhas</small></div>
      </article>
    </section>
  );
}
