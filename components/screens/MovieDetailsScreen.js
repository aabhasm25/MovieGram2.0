"use client";

import { useRouter } from "next/navigation";
import Poster from "@/components/Poster";

export default function MovieDetailsScreen({ movie }) {
  const router = useRouter();

  return (
    <section className="movie-detail-screen">
      <button className="movie-back-button" type="button" onClick={() => router.back()}>
        Back
      </button>
      <div className="movie-detail-hero">
        <Poster className={movie.poster} title={movie.title} slug={movie.slug} />
        <div className="movie-detail-copy">
          <h2>{movie.title}</h2>
          <p>{movie.year} - {movie.runtime}</p>
          <strong>{movie.score}/10</strong>
          <div className="movie-genres">
            {movie.genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="movie-detail-actions">
        <button className="primary-button" type="button">Watchlist</button>
        <button className="primary-button secondary" type="button">Mark as Watched</button>
      </div>
      <p className="movie-summary">{movie.summary}</p>
    </section>
  );
}
