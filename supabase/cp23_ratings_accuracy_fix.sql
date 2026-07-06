-- CP23 optional external ratings cache.
-- Run manually in Supabase SQL editor. This is additive and idempotent.

create table if not exists external_ratings_cache (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  media_type text not null,
  imdb_id text,
  imdb_rating text,
  rotten_tomatoes_rating text,
  metacritic_rating text,
  tmdb_rating numeric,
  source_payload jsonb default '{}'::jsonb,
  fetched_at timestamptz default now(),
  unique(tmdb_id, media_type)
);

create index if not exists external_ratings_cache_tmdb_idx on external_ratings_cache(tmdb_id, media_type);
create index if not exists external_ratings_cache_imdb_idx on external_ratings_cache(imdb_id);
