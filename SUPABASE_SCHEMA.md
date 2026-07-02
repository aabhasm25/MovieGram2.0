# MovieGram Supabase Private Beta Schema

Set these client env vars in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

The app keeps localStorage as guest/offline fallback. When a user logs in, local tracking data is merged and mirrored into Supabase.

## Auth Configuration Notes

MovieGram's production onboarding uses Supabase email OTP:

- Enable Email provider in Supabase Auth.
- Keep email confirmations enabled for production.
- Configure the Email OTP / Magic Link email template so users receive a code. MovieGram accepts 6-8 letter/number OTP tokens.
- Resend `onboarding@resend.dev` is test-only. To send OTP to any email, verify a domain in Resend and use a sender from that domain.
- The app calls `signInWithOtp`, verifies with `verifyOtp({ type: "email" })`, then saves profile fields and sets the password with `updateUser`.
- Password reset uses Supabase `resetPasswordForEmail`; the UI intentionally does not reveal whether an email exists.

## Tables

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_private boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_items (
  user_id uuid references auth.users(id) on delete cascade,
  item_key text not null,
  media_type text not null,
  tmdb_id bigint,
  item_data jsonb not null default '{}',
  is_watched boolean not null default false,
  is_watchlisted boolean not null default false,
  is_favorite boolean not null default false,
  user_rating numeric,
  watched_at timestamptz,
  watched_date_unknown boolean not null default false,
  liked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, item_key)
);

create table episode_progress (
  user_id uuid references auth.users(id) on delete cascade,
  show_id bigint not null,
  season_number int not null,
  episode_number int not null,
  watched_at timestamptz,
  watched_date_unknown boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, show_id, season_number, episode_number)
);

create table reviews (
  user_id uuid references auth.users(id) on delete cascade,
  item_key text not null,
  media_type text not null,
  tmdb_id bigint,
  item_data jsonb not null default '{}',
  review_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, item_key)
);

create table custom_lists (
  user_id uuid references auth.users(id) on delete cascade,
  list_key text not null,
  title text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, list_key)
);

create table custom_list_items (
  user_id uuid references auth.users(id) on delete cascade,
  list_key text not null,
  item_key text not null,
  media_type text not null,
  tmdb_id bigint,
  item_data jsonb not null default '{}',
  added_at timestamptz default now(),
  primary key (user_id, list_key, item_key)
);

create table follows (
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  status text not null default 'approved',
  created_at timestamptz default now(),
  check (follower_id <> following_id),
  primary key (follower_id, following_id)
);

create table activity_events (
  user_id uuid references auth.users(id) on delete cascade,
  event_key text not null,
  action text not null,
  item_key text,
  item_data jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz default now(),
  primary key (user_id, event_key)
);

create table reel_cache (
  id bigint generated always as identity primary key,
  source text not null default 'youtube',
  source_video_id text,
  source_url text,
  media_type text not null,
  tmdb_id bigint,
  item_key text not null,
  title text not null,
  video_title text,
  channel_title text,
  creator_username text,
  thumbnail_url text,
  embed_html text,
  embed_url text,
  oembed_json jsonb,
  watch_url text,
  label text,
  reason text,
  source_context text,
  source_user_id uuid references auth.users(id) on delete set null,
  approved boolean not null default false,
  quality_score numeric default 0,
  playable boolean not null default true,
  embed_status text,
  last_checked_at timestamptz,
  last_embed_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (source, source_video_id)
);

create index reel_cache_item_key_idx on reel_cache (item_key);
create index reel_cache_item_context_idx on reel_cache (item_key, source_context, updated_at desc);
create unique index reel_cache_source_item_video_unique on reel_cache (source, item_key, source_video_id);

create table creator_sources (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  source_name text not null,
  source_url text not null,
  source_id text,
  source_type text,
  genres text[],
  keywords text[],
  quality_score numeric default 0,
  approved boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (platform, source_url)
);

create index creator_sources_platform_idx on creator_sources (platform);
create index creator_sources_approved_idx on creator_sources (approved);
create index creator_sources_quality_idx on creator_sources (quality_score desc);

create table discovery_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text,
  status text,
  provider text,
  query text,
  title text,
  item_key text,
  media_type text,
  tmdb_id bigint,
  source_context text,
  results_found integer default 0,
  playable_saved integer default 0,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_run_at timestamptz
);
```

## Profiles Migration

If your `profiles` table already exists from an earlier MovieGram beta schema, run this safe migration:

```sql
alter table profiles add column if not exists username text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists is_private boolean not null default false;
alter table profiles add column if not exists updated_at timestamptz default now();

create unique index if not exists profiles_username_unique
on profiles (lower(username))
where username is not null;
```

## Row Level Security

Enable RLS on all tables and start with user-owned policies:

```sql
alter table profiles enable row level security;
alter table user_items enable row level security;
alter table episode_progress enable row level security;
alter table reviews enable row level security;
alter table custom_lists enable row level security;
alter table custom_list_items enable row level security;
alter table follows enable row level security;
alter table activity_events enable row level security;
alter table reel_cache enable row level security;
alter table creator_sources enable row level security;
alter table discovery_jobs enable row level security;

create policy "Users can manage own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can manage own items" on user_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own episodes" on episode_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own reviews" on reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own lists" on custom_lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own list items" on custom_list_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own follows" on follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "Users can manage own activity" on activity_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Anyone can read cached reels" on reel_cache for select using (true);
create policy "Authenticated users can add cached reels" on reel_cache for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can refresh cached reels" on reel_cache for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Anyone can read approved creator sources" on creator_sources for select using (approved = true);
```

## CP14 Social Foundation Migration

Run this after the profile migration to enable real user search, follows, public profiles, and followed-user activity:

```sql
alter table follows add column if not exists status text not null default 'approved';
alter table follows add column if not exists created_at timestamptz default now();
update follows set status = 'approved' where status = 'following';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'follows_no_self_follow'
  ) then
    alter table follows add constraint follows_no_self_follow check (follower_id <> following_id);
  end if;
end $$;

create unique index if not exists profiles_username_unique
on profiles (lower(username))
where username is not null;

drop policy if exists "Public can read basic profiles" on profiles;
create policy "Public can read basic profiles"
on profiles for select
using (true);

drop policy if exists "Public can read follows" on follows;
create policy "Users can read approved follows and own requests"
on follows for select
using (
  status = 'approved'
  or auth.uid() = follower_id
  or auth.uid() = following_id
);

drop policy if exists "Users can manage own follows" on follows;
drop policy if exists "Users can insert own follows" on follows;
create policy "Users can insert own follows"
on follows for insert
with check (
  auth.uid() = follower_id
  and follower_id <> following_id
  and status in ('pending', 'approved')
);

drop policy if exists "Users can delete own follows" on follows;
create policy "Users can delete own follows"
on follows for delete
using (auth.uid() = follower_id);

drop policy if exists "Private owners can respond to requests" on follows;
create policy "Private owners can respond to requests"
on follows for update
using (auth.uid() = following_id and status = 'pending')
with check (auth.uid() = following_id and status = 'approved');

drop policy if exists "Public can read activity" on activity_events;
create policy "Public can read activity"
on activity_events for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = activity_events.user_id
    and coalesce(p.is_private, false) = false
  )
  or exists (
    select 1 from follows f
    where f.follower_id = auth.uid()
    and f.following_id = activity_events.user_id
    and f.status = 'approved'
  )
);

drop policy if exists "Users can insert own activity" on activity_events;
create policy "Users can insert own activity"
on activity_events for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own activity" on activity_events;
create policy "Users can update own activity"
on activity_events for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own activity" on activity_events;
create policy "Users can delete own activity"
on activity_events for delete
using (auth.uid() = user_id);
```

Public profile queries in the app select only `id`, `username`, `display_name`, `bio`, and `avatar_url`. Email stays out of public UI and public profile queries.

## Private Profiles + Follow Requests Migration

Run this after CP14 if you already have the social tables:

```sql
alter table profiles add column if not exists is_private boolean not null default false;
alter table follows add column if not exists status text not null default 'approved';
update follows set status = 'approved' where status = 'following';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'follows_status_check'
  ) then
    alter table follows add constraint follows_status_check check (status in ('pending', 'approved'));
  end if;
end $$;

create index if not exists follows_following_status_idx on follows (following_id, status);
create index if not exists follows_follower_status_idx on follows (follower_id, status);

drop policy if exists "Users can insert own follows" on follows;
create policy "Users can insert own follows"
on follows for insert
with check (
  auth.uid() = follower_id
  and follower_id <> following_id
  and status in ('pending', 'approved')
);

drop policy if exists "Public can read follows" on follows;
drop policy if exists "Users can read approved follows and own requests" on follows;
create policy "Users can read approved follows and own requests"
on follows for select
using (
  status = 'approved'
  or auth.uid() = follower_id
  or auth.uid() = following_id
);

drop policy if exists "Users can manage own follows" on follows;
drop policy if exists "Users can delete own follows" on follows;
create policy "Users can delete own follows"
on follows for delete
using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "Private owners can respond to requests" on follows;
create policy "Private owners can respond to requests"
on follows for update
using (auth.uid() = following_id and status = 'pending')
with check (auth.uid() = following_id and status = 'approved');

drop policy if exists "Public can read activity" on activity_events;
create policy "Public can read activity"
on activity_events for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = activity_events.user_id
    and coalesce(p.is_private, false) = false
  )
  or exists (
    select 1 from follows f
    where f.follower_id = auth.uid()
    and f.following_id = activity_events.user_id
    and f.status = 'approved'
  )
);
```

## CP14 Public Profile Tracking Visibility

Run this if public profiles should show real Watched, Watchlist, Reviews, and Lists for public accounts and approved followers of private accounts:

```sql
drop policy if exists "Public can read visible user items" on user_items;
create policy "Public can read visible user items"
on user_items for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = user_items.user_id
    and coalesce(p.is_private, false) = false
  )
  or exists (
    select 1 from follows f
    where f.follower_id = auth.uid()
    and f.following_id = user_items.user_id
    and f.status = 'approved'
  )
);

drop policy if exists "Public can read visible reviews" on reviews;
create policy "Public can read visible reviews"
on reviews for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = reviews.user_id
    and coalesce(p.is_private, false) = false
  )
  or exists (
    select 1 from follows f
    where f.follower_id = auth.uid()
    and f.following_id = reviews.user_id
    and f.status = 'approved'
  )
);

drop policy if exists "Public can read visible custom lists" on custom_lists;
create policy "Public can read visible custom lists"
on custom_lists for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = custom_lists.user_id
    and coalesce(p.is_private, false) = false
  )
  or exists (
    select 1 from follows f
    where f.follower_id = auth.uid()
    and f.following_id = custom_lists.user_id
    and f.status = 'approved'
  )
);

drop policy if exists "Public can read visible custom list items" on custom_list_items;
create policy "Public can read visible custom list items"
on custom_list_items for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = custom_list_items.user_id
    and coalesce(p.is_private, false) = false
  )
  or exists (
    select 1 from follows f
    where f.follower_id = auth.uid()
    and f.following_id = custom_list_items.user_id
    and f.status = 'approved'
  )
);
```

These are select-only visibility policies. Existing insert, update, and delete policies should remain user-owned so users can modify only their own tracking, reviews, lists, follows, requests, and activity.

## CP15 / CP15.5 Reels Cache Migration

Run this before publishing YouTube-powered Reels or accepting user-submitted Instagram/manual reel links. The app reads from `reel_cache` first so public users do not burn the shared YouTube Data API quota on every open, tab switch, or refresh. Only metadata and URLs are stored; MovieGram never stores video files and never scrapes Instagram.

```sql
create table if not exists reel_cache (
  id bigint generated always as identity primary key,
  source text not null default 'youtube',
  source_video_id text,
  source_url text,
  media_type text not null,
  tmdb_id bigint,
  item_key text not null,
  title text not null,
  video_title text,
  channel_title text,
  creator_username text,
  thumbnail_url text,
  embed_html text,
  embed_url text,
  oembed_json jsonb,
  watch_url text,
  label text,
  reason text,
  source_context text,
  source_user_id uuid references auth.users(id) on delete set null,
  approved boolean not null default false,
  quality_score numeric default 0,
  playable boolean not null default true,
  embed_status text,
  last_checked_at timestamptz,
  last_embed_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reel_cache add column if not exists source_url text;
alter table reel_cache alter column source_video_id drop not null;
alter table reel_cache add column if not exists creator_username text;
alter table reel_cache add column if not exists embed_html text;
alter table reel_cache add column if not exists embed_url text;
alter table reel_cache add column if not exists oembed_json jsonb;
alter table reel_cache add column if not exists approved boolean not null default false;
alter table reel_cache add column if not exists quality_score numeric default 0;
alter table reel_cache add column if not exists playable boolean not null default true;
alter table reel_cache add column if not exists embed_status text;
alter table reel_cache add column if not exists last_checked_at timestamptz;
alter table reel_cache add column if not exists last_embed_checked_at timestamptz;
update reel_cache set approved = true where source = 'youtube' and coalesce(approved, false) = false;
update reel_cache set playable = true where (source_url is not null or watch_url is not null or embed_url is not null) and playable is distinct from true;

create unique index if not exists reel_cache_source_video_unique
on reel_cache (source, source_video_id);

create unique index if not exists reel_cache_source_item_video_unique
on reel_cache (source, item_key, source_video_id);

create index if not exists reel_cache_item_key_idx
on reel_cache (item_key);

create index if not exists reel_cache_item_context_idx
on reel_cache (item_key, source_context, updated_at desc);

create index if not exists reel_cache_playable_idx
on reel_cache (approved, playable, source);

create table if not exists creator_sources (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  source_name text not null,
  source_url text not null,
  source_id text,
  source_type text,
  genres text[],
  keywords text[],
  quality_score numeric default 0,
  approved boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists creator_sources_platform_url_unique
on creator_sources (platform, source_url);

create index if not exists creator_sources_platform_idx
on creator_sources (platform);

create index if not exists creator_sources_approved_idx
on creator_sources (approved);

create index if not exists creator_sources_quality_idx
on creator_sources (quality_score desc);

create table if not exists discovery_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text,
  status text,
  provider text,
  query text,
  title text,
  item_key text,
  media_type text,
  tmdb_id bigint,
  source_context text,
  results_found integer default 0,
  playable_saved integer default 0,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_run_at timestamptz
);

alter table reel_cache enable row level security;
alter table creator_sources enable row level security;
alter table discovery_jobs enable row level security;

drop policy if exists "Anyone can read cached reels" on reel_cache;
create policy "Anyone can read cached reels"
on reel_cache for select
using (true);

drop policy if exists "Authenticated users can add cached reels" on reel_cache;
create policy "Authenticated users can add cached reels"
on reel_cache for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can refresh cached reels" on reel_cache;
create policy "Authenticated users can refresh cached reels"
on reel_cache for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Anyone can read approved creator sources" on creator_sources;
create policy "Anyone can read approved creator sources"
on creator_sources for select
using (approved = true);

-- Optional controlled seed foundation for future reel discovery jobs.
-- These rows are source profiles only; they are not playable reels.
-- Instagram/Facebook entries should remain approved=false until exact public profile/page
-- URLs are verified and real reel/watch URLs are imported into reel_cache.
insert into creator_sources
  (platform, source_name, source_url, source_type, genres, keywords, quality_score, approved)
values
  ('youtube', 'Marvel Entertainment', 'https://www.youtube.com/@marvel', 'official_channel', array['superhero','action'], array['official','clip','trailer','short'], 95, true),
  ('youtube', 'Max', 'https://www.youtube.com/@StreamOnMax', 'ott', array['drama','series'], array['official','clip','teaser'], 90, true),
  ('youtube', 'Warner Bros. Pictures', 'https://www.youtube.com/@WarnerBrosPictures', 'studio', array['movie','trailer'], array['official','clip','trailer'], 92, true),
  ('youtube', 'Sony Pictures Entertainment', 'https://www.youtube.com/@sonypictures', 'studio', array['movie'], array['official','clip','trailer'], 90, true),
  ('youtube', 'Universal Pictures', 'https://www.youtube.com/@UniversalPictures', 'studio', array['movie'], array['official','clip','trailer'], 90, true),
  ('youtube', 'Netflix', 'https://www.youtube.com/@Netflix', 'ott', array['movie','tv'], array['official','clip','teaser'], 92, true),
  ('youtube', 'Prime Video', 'https://www.youtube.com/@PrimeVideo', 'ott', array['movie','tv'], array['official','clip','teaser'], 88, true),
  ('youtube', 'Disney', 'https://www.youtube.com/@Disney', 'studio', array['family','adventure'], array['official','clip','short'], 88, true),
  ('youtube', 'Pixar', 'https://www.youtube.com/@pixar', 'studio', array['animation','family'], array['official','clip','short'], 86, true),
  ('youtube', 'A24', 'https://www.youtube.com/@A24', 'studio', array['indie','drama'], array['official','trailer','clip'], 86, true),
  ('youtube', 'Rotten Tomatoes Trailers', 'https://www.youtube.com/@RottenTomatoesTRAILERS', 'creator', array['movie','tv'], array['trailer','official'], 78, true),
  ('youtube', 'Movieclips', 'https://www.youtube.com/@MOVIECLIPS', 'creator', array['movie','clip'], array['clip','scene'], 84, true),
  ('youtube', 'IGN', 'https://www.youtube.com/@IGN', 'creator', array['movie','tv','game'], array['clip','trailer'], 72, true),
  ('youtube', 'KinoCheck', 'https://www.youtube.com/@KinoCheck.com', 'creator', array['movie','trailer'], array['trailer','clip'], 74, true),
  ('instagram', 'Marvel Instagram TODO', 'todo:instagram:marvel', 'official_profile', array['superhero','action'], array['reel','clip','edit'], 0, false),
  ('instagram', 'Netflix Instagram TODO', 'todo:instagram:netflix', 'ott', array['movie','tv'], array['reel','clip','teaser'], 0, false),
  ('instagram', 'Prime Video Instagram TODO', 'todo:instagram:primevideo', 'ott', array['movie','tv'], array['reel','clip','teaser'], 0, false),
  ('facebook', 'Marvel Facebook TODO', 'todo:facebook:marvel', 'official_profile', array['superhero','action'], array['reel','watch','clip'], 0, false),
  ('facebook', 'Netflix Facebook TODO', 'todo:facebook:netflix', 'ott', array['movie','tv'], array['reel','watch','clip'], 0, false)
on conflict (platform, source_url) do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  genres = excluded.genres,
  keywords = excluded.keywords,
  quality_score = excluded.quality_score,
  approved = excluded.approved,
  updated_at = now();
```
