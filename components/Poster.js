import Link from "next/link";
import { getMovieByTitle } from "@/data/movieData";

export default function Poster({ className, title, slug, wide = false }) {
  const movie = slug ? { slug } : getMovieByTitle(title);
  const poster = (
    <div className={`poster-card ${wide ? "wide" : ""} ${className}`}>
      <strong>{title}</strong>
    </div>
  );

  if (!movie) {
    return poster;
  }

  return (
    <Link href={`/movies/${movie.slug}`} className="poster-link" aria-label={`Open ${title} details`}>
      {poster}
    </Link>
  );
}
