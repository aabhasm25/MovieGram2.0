-- v1.1 CP2B sync timeout index suggestions.
-- Run manually in Supabase SQL Editor if user_items/activity_events time out.
-- Additive only: no data deletion, no table reset, no RLS changes.

do $$
begin
  if to_regclass('public.user_items') is not null then
    execute 'create index if not exists idx_user_items_user_id on public.user_items(user_id)';
    execute 'create unique index if not exists idx_user_items_user_item_key_unique on public.user_items(user_id, item_key)';
    execute 'create index if not exists idx_user_items_user_updated_desc on public.user_items(user_id, updated_at desc)';
    execute 'create index if not exists idx_user_items_user_tmdb_media on public.user_items(user_id, media_type, tmdb_id)';
  end if;

  if to_regclass('public.activity_events') is not null then
    execute 'create index if not exists idx_activity_events_user_created_desc on public.activity_events(user_id, created_at desc)';
    execute 'create index if not exists idx_activity_events_user_item_key on public.activity_events(user_id, item_key)';
    execute 'create index if not exists idx_activity_events_user_tmdb_media on public.activity_events(user_id, media_type, tmdb_id)';
  end if;
end $$;
