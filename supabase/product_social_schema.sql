-- CP20A MovieGram product/social schema.
-- Safe to review and run manually in Supabase. This file does not delete existing data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  is_private boolean default false,
  onboarding_completed boolean default false,
  favorite_genres text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists is_private boolean default false;
alter table public.profiles add column if not exists onboarding_completed boolean default false;
alter table public.profiles add column if not exists favorite_genres text[] default '{}';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

create unique index if not exists profiles_username_unique_idx on public.profiles(username) where username is not null;

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(follower_id, following_id)
);

alter table public.follows add column if not exists id uuid default gen_random_uuid();
alter table public.follows add column if not exists follower_id uuid references public.profiles(id) on delete cascade;
alter table public.follows add column if not exists following_id uuid references public.profiles(id) on delete cascade;
alter table public.follows add column if not exists status text;
alter table public.follows add column if not exists created_at timestamptz default now();
alter table public.follows add column if not exists updated_at timestamptz default now();

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.follows'::regclass
      and c.contype = 'c'
      and a.attname = 'status'
  loop
    execute format('alter table public.follows drop constraint if exists %I', constraint_name);
  end loop;
end $$;

update public.follows set status = 'accepted' where status = 'approved';
update public.follows set status = 'accepted' where status is null;

alter table public.follows
  add constraint follows_status_check
  check (status in ('accepted','pending','declined','blocked'));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  entity_type text,
  entity_id text,
  message text,
  is_read boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  item_key text not null,
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  release_year integer,
  created_at timestamptz default now(),
  unique(user_id, item_key)
);

create table if not exists public.user_watched (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  item_key text not null,
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  release_year integer,
  watched_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, item_key)
);

create table if not exists public.ratings_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  item_key text not null,
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  title text not null,
  rating numeric check (rating >= 0 and rating <= 10),
  review_text text,
  contains_spoiler boolean default false,
  visibility text default 'public' check (visibility in ('public','friends','private')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, item_key)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  item_key text,
  tmdb_id integer,
  media_type text,
  title text,
  poster_path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Compatibility with CP19/earlier UI helpers that already read/write these columns.
alter table public.activity_events add column if not exists type text;
alter table public.activity_events add column if not exists event_key text;
alter table public.activity_events add column if not exists action text;
alter table public.activity_events add column if not exists item_data jsonb default '{}'::jsonb;
alter table public.activity_events add column if not exists item_key text;
alter table public.activity_events add column if not exists tmdb_id integer;
alter table public.activity_events add column if not exists media_type text;
alter table public.activity_events add column if not exists title text;
alter table public.activity_events add column if not exists poster_path text;
alter table public.activity_events add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.activity_events add column if not exists created_at timestamptz default now();
update public.activity_events set type = coalesce(type, action, 'activity') where type is null;
alter table public.activity_events alter column type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.activity_events'::regclass and contype = 'u' and conname = 'activity_events_user_event_key_unique'
  ) then
    alter table public.activity_events add constraint activity_events_user_event_key_unique unique (user_id, event_key);
  end if;
exception
  when duplicate_table then null;
end $$;

create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  visibility text default 'public' check (visibility in ('public','friends','private')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.user_lists(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  item_key text not null,
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(list_id, item_key)
);

create table if not exists public.blends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.blend_members (
  id uuid primary key default gen_random_uuid(),
  blend_id uuid references public.blends(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  unique(blend_id, user_id)
);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_updated_at on public.profiles(updated_at desc);
create index if not exists idx_follows_follower_id on public.follows(follower_id);
create index if not exists idx_follows_following_id on public.follows(following_id);
create index if not exists idx_follows_status on public.follows(status);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_is_read on public.notifications(user_id, is_read);
create index if not exists idx_user_watchlist_user_created on public.user_watchlist(user_id, created_at desc);
create index if not exists idx_user_watchlist_item_key on public.user_watchlist(item_key);
create index if not exists idx_user_watched_user_created on public.user_watched(user_id, created_at desc);
create index if not exists idx_user_watched_item_key on public.user_watched(item_key);
create index if not exists idx_ratings_reviews_user_created on public.ratings_reviews(user_id, created_at desc);
create index if not exists idx_ratings_reviews_item_key on public.ratings_reviews(item_key);
create index if not exists idx_activity_events_user_created on public.activity_events(user_id, created_at desc);
create index if not exists idx_activity_events_item_key on public.activity_events(item_key);
create index if not exists idx_user_lists_user_created on public.user_lists(user_id, created_at desc);
create index if not exists idx_user_list_items_list_order on public.user_list_items(list_id, sort_order, created_at);
create index if not exists idx_user_list_items_item_key on public.user_list_items(item_key);
create index if not exists idx_blends_owner_created on public.blends(owner_id, created_at desc);
create index if not exists idx_blend_members_user_status on public.blend_members(user_id, status);
create index if not exists idx_blend_members_blend_status on public.blend_members(blend_id, status);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.user_watchlist enable row level security;
alter table public.user_watched enable row level security;
alter table public.ratings_reviews enable row level security;
alter table public.activity_events enable row level security;
alter table public.user_lists enable row level security;
alter table public.user_list_items enable row level security;
alter table public.blends enable row level security;
alter table public.blend_members enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_public_or_own') then
    create policy profiles_select_public_or_own on public.profiles for select
      using (auth.uid() = id or is_private = false);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own') then
    create policy profiles_insert_own on public.profiles for insert
      with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own') then
    create policy profiles_update_own on public.profiles for update
      using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'follows' and policyname = 'follows_select_involved') then
    create policy follows_select_involved on public.follows for select
      using (auth.uid() = follower_id or auth.uid() = following_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'follows' and policyname = 'follows_insert_own') then
    create policy follows_insert_own on public.follows for insert
      with check (auth.uid() = follower_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'follows' and policyname = 'follows_update_involved') then
    create policy follows_update_involved on public.follows for update
      using (auth.uid() = follower_id or auth.uid() = following_id)
      with check (auth.uid() = follower_id or auth.uid() = following_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'follows' and policyname = 'follows_delete_involved') then
    create policy follows_delete_involved on public.follows for delete
      using (auth.uid() = follower_id or auth.uid() = following_id);
  end if;
end $$;

do $$
declare
  policy_target record;
begin
  for policy_target in
    select * from (values
      ('notifications','user_id'),
      ('user_watchlist','user_id'),
      ('user_watched','user_id'),
      ('ratings_reviews','user_id'),
      ('activity_events','user_id'),
      ('user_lists','user_id'),
      ('user_list_items','user_id'),
      ('blends','owner_id'),
      ('blend_members','user_id')
    ) as targets(table_name, owner_column)
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = policy_target.table_name and policyname = policy_target.table_name || '_select_own') then
      execute format('create policy %I on public.%I for select using (auth.uid() = %I)', policy_target.table_name || '_select_own', policy_target.table_name, policy_target.owner_column);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = policy_target.table_name and policyname = policy_target.table_name || '_insert_own') then
      execute format('create policy %I on public.%I for insert with check (auth.uid() = %I)', policy_target.table_name || '_insert_own', policy_target.table_name, policy_target.owner_column);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = policy_target.table_name and policyname = policy_target.table_name || '_update_own') then
      execute format('create policy %I on public.%I for update using (auth.uid() = %I) with check (auth.uid() = %I)', policy_target.table_name || '_update_own', policy_target.table_name, policy_target.owner_column, policy_target.owner_column);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = policy_target.table_name and policyname = policy_target.table_name || '_delete_own') then
      execute format('create policy %I on public.%I for delete using (auth.uid() = %I)', policy_target.table_name || '_delete_own', policy_target.table_name, policy_target.owner_column);
    end if;
  end loop;
end $$;

-- Activity screens should query newest rows only:
-- select * from public.activity_events where user_id = auth.uid() order by created_at desc limit 30;
