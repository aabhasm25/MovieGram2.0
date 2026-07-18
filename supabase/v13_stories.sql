-- MovieGram v1.3 Stories. Additive and idempotent; run manually in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('recommendation', 'photo', 'video', 'reel')),
  asset_path text,
  mime_type text,
  note text check (note is null or char_length(note) <= 280),
  media_type text check (media_type is null or media_type in ('movie', 'tv')),
  tmdb_id integer,
  item_key text,
  title text,
  poster_path text,
  backdrop_path text,
  reel_reference jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  deleted_at timestamptz,
  check (expires_at > created_at and expires_at <= created_at + interval '24 hours 5 minutes'),
  check ((kind in ('photo', 'video') and asset_path is not null) or kind in ('recommendation', 'reel')),
  check (kind <> 'recommendation' or (media_type is not null and tmdb_id is not null and item_key is not null))
);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index if not exists stories_owner_active_created_idx on public.stories(user_id, expires_at desc, created_at desc) where deleted_at is null;
create index if not exists stories_active_created_idx on public.stories(expires_at desc, created_at desc) where deleted_at is null;
create index if not exists story_views_user_story_idx on public.story_views(user_id, story_id);

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

create or replace function public.moviegram_can_view_story_owner(p_owner_id uuid, p_viewer_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_viewer_id is not null and (
    p_owner_id = p_viewer_id
    or exists (select 1 from public.profiles p where p.id = p_owner_id and coalesce(p.is_private, false) = false)
    or exists (
      select 1 from public.follows f
      where f.follower_id = p_viewer_id and f.following_id = p_owner_id and f.status = 'accepted'
    )
  );
$$;

revoke all on function public.moviegram_can_view_story_owner(uuid, uuid) from public;
grant execute on function public.moviegram_can_view_story_owner(uuid, uuid) to authenticated;

drop policy if exists stories_visible_select on public.stories;
create policy stories_visible_select on public.stories for select to authenticated
using (
  deleted_at is null
  and expires_at > now()
  and public.moviegram_can_view_story_owner(user_id, auth.uid())
);

drop policy if exists stories_owner_insert on public.stories;
create policy stories_owner_insert on public.stories for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists stories_owner_update on public.stories;
create policy stories_owner_update on public.stories for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists stories_owner_delete on public.stories;
create policy stories_owner_delete on public.stories for delete to authenticated
using (user_id = auth.uid());

drop policy if exists story_views_visible_select on public.story_views;
create policy story_views_visible_select on public.story_views for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid())
);

drop policy if exists story_views_visible_insert on public.story_views;
create policy story_views_visible_insert on public.story_views for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.stories s
    where s.id = story_id
      and s.deleted_at is null
      and s.expires_at > now()
      and public.moviegram_can_view_story_owner(s.user_id, auth.uid())
  )
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'moviegram-stories',
  'moviegram-stories',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists story_storage_owner_insert on storage.objects;
create policy story_storage_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'moviegram-stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists story_storage_visible_select on storage.objects;
create policy story_storage_visible_select on storage.objects for select to authenticated
using (
  bucket_id = 'moviegram-stories'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.stories s
      where s.asset_path = name
        and s.deleted_at is null
        and s.expires_at > now()
        and public.moviegram_can_view_story_owner(s.user_id, auth.uid())
    )
  )
);

drop policy if exists story_storage_owner_delete on storage.objects;
create policy story_storage_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'moviegram-stories' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
begin
  alter publication supabase_realtime add table public.stories;
exception when duplicate_object then null;
end $$;
