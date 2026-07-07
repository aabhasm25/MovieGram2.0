-- v1.1 CP2A data integrity + ratings v4
-- Safe additive SQL. Run manually in Supabase when ready.

create extension if not exists pgcrypto;

alter table if exists user_items add column if not exists removed_at timestamptz;
create index if not exists user_items_user_identity_idx on user_items(user_id, media_type, tmdb_id, updated_at desc);
create index if not exists user_items_removed_idx on user_items(user_id, removed_at) where removed_at is not null;

create table if not exists canonical_items_cache (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('movie','tv')),
  tmdb_id integer not null,
  title text,
  poster_path text,
  backdrop_path text,
  release_date date,
  first_air_date date,
  source_payload jsonb default '{}'::jsonb,
  fetched_at timestamptz default now(),
  unique(media_type, tmdb_id)
);

create table if not exists external_ratings_cache_v4 (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('movie','tv')),
  tmdb_id integer not null,
  imdb_id text,
  imdb_rating text,
  rotten_tomatoes_rating text,
  metacritic_rating text,
  tmdb_rating numeric,
  provider text,
  confidence text,
  source_payload jsonb default '{}'::jsonb,
  fetched_at timestamptz default now(),
  unique(media_type, tmdb_id, imdb_id)
);

create index if not exists canonical_items_cache_identity_idx on canonical_items_cache(media_type, tmdb_id);
create index if not exists external_ratings_cache_v4_identity_idx on external_ratings_cache_v4(media_type, tmdb_id, imdb_id);
