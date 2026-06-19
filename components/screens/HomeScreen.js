import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import Poster from "@/components/Poster";
import { feed, friends, trending } from "@/data/movieData";

export default function HomeScreen() {
  return (
    <>
      <div className="stories">
        {friends.map((friend) => (
          <div className="story" key={friend.name}>
            <Avatar className={friend.avatar} />
            <span>{friend.name}</span>
          </div>
        ))}
      </div>

      <section className="poster-rail" aria-label="Trending posters">
        <div className="section-title">
          <h2>Tonight's buzz</h2>
        </div>
        <div className="netflix-row">
          {[...trending, ...feed.map((item) => ({ title: item.movie, poster: item.poster, slug: item.movieSlug }))].map((movie) => (
            <div className="rail-poster" key={`${movie.title}-${movie.poster}`}>
              <Poster className={movie.poster} title={movie.title} slug={movie.slug} />
            </div>
          ))}
        </div>
      </section>

      <section className="feed-list">
        {feed.map((item) => (
          <article className="feed-card" key={`${item.friend.name}-${item.movie}`}>
            <div className="feed-head">
              <Avatar className={item.friend.avatar} size="sm" />
              <div>
                <strong>{item.friend.name}</strong> {item.action}
                <small>{item.time}</small>
              </div>
              <button className="plain-button" aria-label="More options">
                <Icon name="more" />
              </button>
            </div>
            <Poster className={item.poster} title={item.movie} slug={item.movieSlug} wide />
            <div className="rating-row">
              <span className="stars" aria-label="Five star rating" />
              <strong>{item.rating}</strong>
            </div>
            <p>{item.text}</p>
            <div className="social-actions">
              <span><Icon name="heart" /> {item.likes}</span>
              <span><Icon name="comment" /> {item.comments}</span>
              <span><Icon name="send" /></span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
