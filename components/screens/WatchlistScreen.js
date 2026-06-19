import Icon from "@/components/Icon";
import Poster from "@/components/Poster";
import { watchlist } from "@/data/movieData";

export default function WatchlistScreen() {
  return (
    <section>
      <div className="segmented">
        <button className="selected">Movies</button>
        <button>TV Shows</button>
      </div>
      <div className="collection-hero poster-interstellar">
        <div>
          <small>Premium collection</small>
          <h2>Watchlist</h2>
          <p>91 titles saved for the next movie night.</p>
        </div>
      </div>
      <div className="watch-list">
        {watchlist.map((item) => (
          <article className="watch-item" key={item.title}>
            <Poster className={item.poster} title={item.title} slug={item.slug} />
            <div>
              <strong>{item.title}</strong>
              <small>{item.year}<br />{item.added}</small>
            </div>
            <button className="plain-button" aria-label={`More options for ${item.title}`}>
              <Icon name="more" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
