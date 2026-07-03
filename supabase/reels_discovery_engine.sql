-- CP17 Reels Discovery Engine foundation.
-- Safe to review and run manually in Supabase. This file is not executed by the app.
-- Manual execution:
--   1. Open Supabase SQL Editor.
--   2. Paste this full file.
--   3. Run once, then re-run whenever needed; it is idempotent and non-destructive.
--   4. Writes are intended for service-role/admin tooling only. No public write policies are added.

create extension if not exists pgcrypto;

create table if not exists public.creator_sources (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('youtube', 'instagram', 'facebook', 'web')),
  source_name text not null,
  source_url text not null,
  source_id text null,
  source_type text null,
  approved boolean default true,
  quality_score numeric default 0,
  trust_score numeric default 0,
  keywords text[] null,
  genres text[] null,
  last_checked_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reel_candidates (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_video_id text null,
  source_url text not null,
  watch_url text null,
  embed_url text null,
  media_type text null,
  tmdb_id bigint null,
  item_key text null,
  title text null,
  video_title text null,
  channel_title text null,
  creator_username text null,
  thumbnail_url text null,
  label text null,
  content_format text null,
  aspect_mode text null,
  quality_score numeric default 0,
  trust_score numeric default 0,
  match_score numeric default 0,
  status text default 'pending',
  rejection_reason text null,
  discovered_by text null,
  discovered_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.discovery_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text null,
  status text default 'queued',
  source text null,
  provider text null,
  query text null,
  title text null,
  item_key text null,
  media_type text null,
  tmdb_id bigint null,
  source_context text null,
  target_count int default 0,
  checked_count int default 0,
  results_found int default 0,
  saved_count int default 0,
  playable_saved int default 0,
  error_count int default 0,
  error_message text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  last_run_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reel_failures (
  id uuid primary key default gen_random_uuid(),
  source text null,
  source_video_id text null,
  source_url text null,
  failure_type text null,
  failure_reason text null,
  created_at timestamptz default now()
);

create index if not exists creator_sources_platform_idx on public.creator_sources(platform);
create index if not exists creator_sources_approved_idx on public.creator_sources(approved);
create index if not exists creator_sources_quality_idx on public.creator_sources(quality_score desc);
create unique index if not exists creator_sources_platform_url_idx on public.creator_sources(platform, source_url);

create index if not exists reel_candidates_source_idx on public.reel_candidates(source);
create index if not exists reel_candidates_source_video_id_idx on public.reel_candidates(source_video_id);
create index if not exists reel_candidates_item_key_idx on public.reel_candidates(item_key);
create index if not exists reel_candidates_status_idx on public.reel_candidates(status);
create index if not exists reel_candidates_content_format_idx on public.reel_candidates(content_format);
create index if not exists reel_candidates_aspect_mode_idx on public.reel_candidates(aspect_mode);
create unique index if not exists reel_candidates_source_video_unique_idx on public.reel_candidates(source, source_video_id) where source_video_id is not null;
create unique index if not exists reel_candidates_source_url_unique_idx on public.reel_candidates(source, source_url) where source_url is not null;

create index if not exists discovery_jobs_status_idx on public.discovery_jobs(status);
create index if not exists discovery_jobs_provider_query_idx on public.discovery_jobs(provider, query);
create index if not exists reel_failures_source_video_id_idx on public.reel_failures(source_video_id);

alter table public.creator_sources enable row level security;
alter table public.reel_candidates enable row level security;
alter table public.discovery_jobs enable row level security;
alter table public.reel_failures enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'creator_sources'
      and policyname = 'Approved creator sources are public'
  ) then
    create policy "Approved creator sources are public"
    on public.creator_sources for select
    using (approved is true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reel_candidates'
      and policyname = 'Approved reel candidates are readable'
  ) then
    create policy "Approved reel candidates are readable"
    on public.reel_candidates for select
    using (status = 'approved');
  end if;
end $$;

-- Writes should be performed by service-role/admin tooling only.
-- Do not add public insert/update/delete policies for discovery tables.

-- Optional trusted creator source seed. These are source profiles only, not playable reels.
insert into public.creator_sources
  (platform, source_name, source_url, source_type, approved, quality_score, trust_score, keywords, genres, updated_at)
values
  ('youtube', 'Marvel Entertainment', 'https://www.youtube.com/@marvel', 'official_channel', true, 95, 95, array['marvel','clip','trailer'], array['superhero','action'], now()),
  ('youtube', 'HBO / Max', 'https://www.youtube.com/@HBO', 'official_channel', true, 94, 94, array['hbo','max','official'], array['drama','series'], now()),
  ('youtube', 'Netflix', 'https://www.youtube.com/@Netflix', 'ott', true, 93, 93, array['netflix','clip','trailer'], array['movie','tv'], now()),
  ('youtube', 'Prime Video', 'https://www.youtube.com/@PrimeVideo', 'ott', true, 91, 91, array['prime video','clip','trailer'], array['movie','tv'], now()),
  ('youtube', 'Disney', 'https://www.youtube.com/@Disney', 'studio', true, 91, 91, array['disney','official'], array['family','adventure'], now()),
  ('youtube', 'Pixar', 'https://www.youtube.com/@Pixar', 'studio', true, 91, 91, array['pixar','official'], array['animation'], now()),
  ('youtube', 'Warner Bros. Pictures', 'https://www.youtube.com/@WarnerBrosPictures', 'studio', true, 94, 94, array['warner bros','clip','trailer'], array['movie'], now()),
  ('youtube', 'Sony Pictures Entertainment', 'https://www.youtube.com/@SonyPictures', 'studio', true, 92, 92, array['sony pictures','official'], array['movie'], now()),
  ('youtube', 'Universal Pictures', 'https://www.youtube.com/@UniversalPictures', 'studio', true, 92, 92, array['universal','official'], array['movie'], now()),
  ('youtube', 'A24', 'https://www.youtube.com/@A24', 'studio', true, 90, 90, array['a24','official'], array['indie','drama'], now()),
  ('youtube', 'Rotten Tomatoes Trailers', 'https://www.youtube.com/@RottenTomatoesTRAILERS', 'creator', true, 86, 82, array['trailer','official'], array['movie'], now()),
  ('youtube', 'Movieclips', 'https://www.youtube.com/@MOVIECLIPS', 'creator', true, 84, 80, array['clip','scene'], array['movie'], now()),
  ('youtube', 'IGN', 'https://www.youtube.com/@IGN', 'creator', true, 82, 76, array['clip','trailer'], array['movie','tv'], now()),
  ('youtube', 'KinoCheck', 'https://www.youtube.com/@KinoCheck', 'creator', true, 80, 74, array['clip','trailer'], array['movie'], now()),
  ('instagram', 'Marvel', 'https://www.instagram.com/marvel/', 'official_profile', true, 94, 94, array['marvel'], array['superhero','action'], now()),
  ('instagram', 'Netflix', 'https://www.instagram.com/netflix/', 'ott', true, 92, 92, array['netflix'], array['movie','tv'], now()),
  ('instagram', 'Prime Video', 'https://www.instagram.com/primevideo/', 'ott', true, 90, 90, array['prime video'], array['movie','tv'], now()),
  ('facebook', 'Marvel', 'https://www.facebook.com/Marvel/', 'official_profile', true, 90, 90, array['marvel'], array['superhero','action'], now()),
  ('facebook', 'Netflix', 'https://www.facebook.com/netflix/', 'ott', true, 88, 88, array['netflix'], array['movie','tv'], now())
on conflict (platform, source_url) do nothing;

-- Verification queries:
-- select count(*) from public.creator_sources;
-- select count(*) from public.reel_candidates;
-- select count(*) from public.discovery_jobs;
-- select count(*) from public.reel_failures;
