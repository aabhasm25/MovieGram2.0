import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import MovieDetailsScreen from "@/components/screens/MovieDetailsScreen";
import { getMovieBySlug, movies } from "@/data/movieData";

export function generateStaticParams() {
  return movies.map((movie) => ({ slug: movie.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const movie = getMovieBySlug(slug);

  if (!movie) {
    return {
      title: "Movie not found"
    };
  }

  return {
    title: `${movie.title} | MovieGram`,
    description: movie.summary
  };
}

export default async function MoviePage({ params }) {
  const { slug } = await params;
  const movie = getMovieBySlug(slug);

  if (!movie) {
    notFound();
  }

  return (
    <AppShell title="Movie" activeTab="explore">
      <MovieDetailsScreen movie={movie} />
    </AppShell>
  );
}
