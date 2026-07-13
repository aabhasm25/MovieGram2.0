-- MovieGram approved YouTube source ingestion and quota ledger.
-- Additive only. Review and run manually in the Supabase SQL Editor.

alter table if exists public.creator_sources add column if not exists channel_id text;
alter table if exists public.creator_sources add column if not exists uploads_playlist_id text;
alter table if exists public.creator_sources add column if not exists enabled boolean default true;
alter table if exists public.creator_sources add column if not exists last_synced_at timestamptz;
alter table if exists public.creator_sources add column if not exists last_video_published_at timestamptz;
alter table if exists public.creator_sources add column if not exists import_limit integer default 12;

do $$
begin
  if to_regclass('public.creator_sources') is not null then
    execute 'create index if not exists creator_sources_youtube_sync_idx on public.creator_sources (platform, approved, enabled, last_synced_at)';
  end if;
end $$;

create table if not exists public.youtube_quota_ledger (
  pacific_date date primary key,
  estimated_units integer not null default 0 check (estimated_units >= 0),
  daily_budget integer not null default 10000 check (daily_budget > 0),
  reserve_units integer not null default 1000 check (reserve_units >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists youtube_quota_ledger_updated_idx
  on public.youtube_quota_ledger (updated_at desc);

do $$
begin
  if to_regclass('public.reel_cache') is not null then
    execute 'create index if not exists reel_cache_youtube_video_lookup_idx on public.reel_cache (source, source_video_id)';
  end if;
end $$;

alter table public.youtube_quota_ledger enable row level security;

comment on table public.youtube_quota_ledger is
  'Server-only estimate of YouTube Data API units used per Pacific quota day.';
