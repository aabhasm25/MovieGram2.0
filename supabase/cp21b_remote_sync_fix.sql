-- CP21B remote sync safety fixes.
-- Run manually in Supabase SQL editor if legacy sync tables are present.
-- Additive only: no data deletion, no RLS disable, no service-role dependency.

do $$
begin
  if to_regclass('public.user_items') is not null then
    execute 'create index if not exists idx_user_items_user_id on public.user_items(user_id)';
    execute 'create unique index if not exists idx_user_items_user_item_key_unique on public.user_items(user_id, item_key)';
    execute 'create index if not exists idx_user_items_updated_at on public.user_items(updated_at)';
  end if;

  if to_regclass('public.episode_progress') is not null then
    execute 'create index if not exists idx_episode_progress_user_id on public.episode_progress(user_id)';
    execute 'create unique index if not exists idx_episode_progress_user_episode_unique on public.episode_progress(user_id, show_id, season_number, episode_number)';

    alter table public.episode_progress enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'episode_progress'
        and policyname = 'episode_progress_select_own'
    ) then
      create policy episode_progress_select_own
        on public.episode_progress
        for select
        to authenticated
        using (auth.uid() = user_id);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'episode_progress'
        and policyname = 'episode_progress_insert_own'
    ) then
      create policy episode_progress_insert_own
        on public.episode_progress
        for insert
        to authenticated
        with check (auth.uid() = user_id);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'episode_progress'
        and policyname = 'episode_progress_update_own'
    ) then
      create policy episode_progress_update_own
        on public.episode_progress
        for update
        to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'episode_progress'
        and policyname = 'episode_progress_delete_own'
    ) then
      create policy episode_progress_delete_own
        on public.episode_progress
        for delete
        to authenticated
        using (auth.uid() = user_id);
    end if;
  end if;
end $$;
