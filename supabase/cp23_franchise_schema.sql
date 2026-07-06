-- CP23 franchise / universe / collection foundation.
-- Run manually in Supabase SQL editor. This is additive and idempotent.

create table if not exists franchise_hubs (
  id uuid primary key default gen_random_uuid(),
  hub_key text unique not null,
  name text not null,
  description text,
  aliases text[] default '{}',
  type text default 'franchise',
  poster_path text,
  backdrop_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists franchise_items (
  id uuid primary key default gen_random_uuid(),
  hub_key text references franchise_hubs(hub_key) on delete cascade,
  item_key text not null,
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  release_date date,
  release_year integer,
  release_order integer,
  chronological_order integer,
  phase_label text,
  notes text,
  created_at timestamptz default now(),
  unique(hub_key, item_key)
);

create index if not exists franchise_hubs_hub_key_idx on franchise_hubs(hub_key);
create index if not exists franchise_hubs_aliases_idx on franchise_hubs using gin(aliases);
create index if not exists franchise_items_hub_key_idx on franchise_items(hub_key);
create index if not exists franchise_items_tmdb_idx on franchise_items(media_type, tmdb_id);
