# MovieGram Supabase Private Beta Schema

Set these client env vars in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

The app keeps localStorage as guest/offline fallback. When a user logs in, local tracking data is merged and mirrored into Supabase.

## Tables

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  display_name text,
  avatar_url text,
  bio text,
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
  status text not null default 'following',
  created_at timestamptz default now(),
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
```

## Profiles Migration

If your `profiles` table already exists from an earlier MovieGram beta schema, run this safe migration:

```sql
alter table profiles add column if not exists username text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;
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

create policy "Users can manage own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can manage own items" on user_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own episodes" on episode_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own reviews" on reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own lists" on custom_lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own list items" on custom_list_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own follows" on follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "Users can manage own activity" on activity_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
