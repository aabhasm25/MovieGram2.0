-- CP22 discovery reminder foundation.
-- Run manually in Supabase SQL editor. This is additive and idempotent.

create table if not exists release_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  item_key text not null,
  tmdb_id integer,
  media_type text,
  title text,
  poster_path text,
  release_year integer,
  release_date date,
  reminder_type text check (reminder_type in ('release','ott_available')),
  provider_name text,
  created_at timestamptz default now(),
  unique(user_id, item_key, reminder_type)
);

create index if not exists release_reminders_user_id_idx on release_reminders(user_id);
create index if not exists release_reminders_user_release_date_idx on release_reminders(user_id, release_date);
create index if not exists release_reminders_item_key_idx on release_reminders(item_key);

alter table release_reminders enable row level security;

drop policy if exists "Users can read their release reminders" on release_reminders;
create policy "Users can read their release reminders"
  on release_reminders for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their release reminders" on release_reminders;
create policy "Users can insert their release reminders"
  on release_reminders for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their release reminders" on release_reminders;
create policy "Users can update their release reminders"
  on release_reminders for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their release reminders" on release_reminders;
create policy "Users can delete their release reminders"
  on release_reminders for delete
  to authenticated
  using (auth.uid() = user_id);
