-- v1.1 CP1 Reels scale + social foundation
-- Safe additive SQL. Run manually in Supabase SQL editor when ready.

create extension if not exists pgcrypto;

create table if not exists reel_cache (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  item_key text,
  title text,
  poster_path text,
  source text default 'youtube',
  source_video_id text,
  video_url text,
  source_url text,
  embed_url text,
  watch_url text,
  video_title text,
  channel_title text,
  thumbnail_url text,
  spoiler_level text default 'none' check (spoiler_level in ('none','mild','spoilers')),
  tags text[] default '{}',
  active boolean default true,
  approved boolean default true,
  playable boolean default true,
  quality_score numeric default 0,
  source_context text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reel_cache add column if not exists poster_path text;
alter table reel_cache add column if not exists video_url text;
alter table reel_cache add column if not exists spoiler_level text default 'none';
alter table reel_cache add column if not exists tags text[] default '{}';
alter table reel_cache add column if not exists active boolean default true;

create table if not exists reel_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  reel_key text not null,
  item_key text,
  tmdb_id integer,
  media_type text,
  title text,
  interaction_type text not null check (interaction_type in ('like','share','save','watch_asap','details_open')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(user_id, reel_key, interaction_type)
);

create table if not exists reel_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  reel_key text not null,
  item_key text,
  tmdb_id integer,
  media_type text,
  title text,
  comment_text text,
  body text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reel_comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  comment_id uuid references reel_comments(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, comment_id)
);

create table if not exists user_reel_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  source_mode text default 'hybrid' check (source_mode in ('local','global','hybrid')),
  spoiler_preference text default 'hide',
  muted_tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists reel_cache_active_score_idx on reel_cache(active, quality_score desc, updated_at desc);
create index if not exists reel_cache_item_key_idx on reel_cache(item_key);
create index if not exists reel_cache_tmdb_idx on reel_cache(media_type, tmdb_id);
create index if not exists reel_cache_source_video_idx on reel_cache(source, source_video_id);
create index if not exists reel_interactions_user_idx on reel_interactions(user_id, created_at desc);
create index if not exists reel_interactions_reel_idx on reel_interactions(reel_key, interaction_type);
create index if not exists reel_comments_reel_idx on reel_comments(reel_key, created_at desc);
create index if not exists reel_comment_likes_comment_idx on reel_comment_likes(comment_id);

alter table reel_interactions enable row level security;
alter table reel_comments enable row level security;
alter table reel_comment_likes enable row level security;
alter table user_reel_preferences enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reel_interactions' and policyname = 'reel_interactions_own_all') then
    create policy reel_interactions_own_all on reel_interactions
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reel_comments' and policyname = 'reel_comments_read_authenticated') then
    create policy reel_comments_read_authenticated on reel_comments
      for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reel_comments' and policyname = 'reel_comments_own_write') then
    create policy reel_comments_own_write on reel_comments
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reel_comment_likes' and policyname = 'reel_comment_likes_own_all') then
    create policy reel_comment_likes_own_all on reel_comment_likes
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_reel_preferences' and policyname = 'user_reel_preferences_own_all') then
    create policy user_reel_preferences_own_all on user_reel_preferences
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
