-- CP19 optional reel social tables.
-- Run manually in Supabase SQL editor when you want remote persistence for
-- reel likes, comments, and shares. MovieGram works without these tables
-- using local fallback state.

create table if not exists public.reel_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reel_key text not null,
  item_key text,
  media_type text,
  tmdb_id bigint,
  title text,
  source text,
  source_video_id text,
  source_url text,
  created_at timestamptz default now(),
  unique(user_id, reel_key)
);

create table if not exists public.reel_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reel_key text not null,
  item_key text,
  media_type text,
  tmdb_id bigint,
  title text,
  source text,
  source_video_id text,
  source_url text,
  comment_text text,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.reel_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reel_key text not null,
  item_key text,
  media_type text,
  tmdb_id bigint,
  title text,
  source text,
  source_video_id text,
  source_url text,
  share_url text,
  created_at timestamptz default now()
);

create index if not exists reel_likes_user_id_idx on public.reel_likes(user_id);
create index if not exists reel_likes_reel_key_idx on public.reel_likes(reel_key);
create index if not exists reel_comments_user_id_idx on public.reel_comments(user_id);
create index if not exists reel_comments_reel_key_idx on public.reel_comments(reel_key);
create index if not exists reel_shares_user_id_idx on public.reel_shares(user_id);
create index if not exists reel_shares_reel_key_idx on public.reel_shares(reel_key);

alter table public.reel_likes enable row level security;
alter table public.reel_comments enable row level security;
alter table public.reel_shares enable row level security;

drop policy if exists "reel_likes_read_own" on public.reel_likes;
create policy "reel_likes_read_own"
on public.reel_likes for select
using (auth.uid() = user_id);

drop policy if exists "reel_likes_insert_own" on public.reel_likes;
create policy "reel_likes_insert_own"
on public.reel_likes for insert
with check (auth.uid() = user_id);

drop policy if exists "reel_likes_delete_own" on public.reel_likes;
create policy "reel_likes_delete_own"
on public.reel_likes for delete
using (auth.uid() = user_id);

drop policy if exists "reel_comments_read_own" on public.reel_comments;
create policy "reel_comments_read_own"
on public.reel_comments for select
using (auth.uid() = user_id);

drop policy if exists "reel_comments_insert_own" on public.reel_comments;
create policy "reel_comments_insert_own"
on public.reel_comments for insert
with check (auth.uid() = user_id);

drop policy if exists "reel_shares_read_own" on public.reel_shares;
create policy "reel_shares_read_own"
on public.reel_shares for select
using (auth.uid() = user_id);

drop policy if exists "reel_shares_insert_own" on public.reel_shares;
create policy "reel_shares_insert_own"
on public.reel_shares for insert
with check (auth.uid() = user_id);

-- Verification:
-- select count(*) from public.reel_likes;
-- select count(*) from public.reel_comments;
-- select count(*) from public.reel_shares;
