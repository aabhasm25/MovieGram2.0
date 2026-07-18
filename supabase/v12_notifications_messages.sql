-- MovieGram v1.2 real notifications and direct messages.
-- Additive and idempotent. Run manually in the Supabase SQL editor.

create extension if not exists pgcrypto;

alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists resolved_at timestamptz;
alter table public.notifications add column if not exists dedupe_key text;
alter table public.notifications add column if not exists artwork_url text;

create unique index if not exists notifications_dedupe_key_unique
  on public.notifications(dedupe_key) where dedupe_key is not null;
create index if not exists notifications_recipient_unread_created_idx
  on public.notifications(user_id, is_read, created_at desc);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct')),
  direct_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  archived_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  content_reference jsonb not null default '{}'::jsonb,
  client_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  unique (sender_id, client_id)
);

create index if not exists conversations_updated_at_idx
  on public.conversations(updated_at desc);
create index if not exists conversation_participants_user_idx
  on public.conversation_participants(user_id, conversation_id);
create index if not exists conversation_participants_unread_idx
  on public.conversation_participants(user_id, last_read_at, conversation_id);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create or replace function public.moviegram_is_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = p_user_id
      and cp.archived_at is null
  );
$$;

revoke all on function public.moviegram_is_conversation_participant(uuid, uuid) from public;
grant execute on function public.moviegram_is_conversation_participant(uuid, uuid) to authenticated;

drop policy if exists conversations_participant_select on public.conversations;
create policy conversations_participant_select on public.conversations
  for select to authenticated
  using (public.moviegram_is_conversation_participant(id, auth.uid()));

drop policy if exists conversation_participants_participant_select on public.conversation_participants;
create policy conversation_participants_participant_select on public.conversation_participants
  for select to authenticated
  using (public.moviegram_is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists conversation_participants_update_self on public.conversation_participants;
create policy conversation_participants_update_self on public.conversation_participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists messages_participant_select on public.messages;
create policy messages_participant_select on public.messages
  for select to authenticated
  using (public.moviegram_is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.moviegram_is_conversation_participant(conversation_id, auth.uid())
  );

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_direct_key text;
  v_conversation_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception 'A direct conversation requires another user';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'Profile not found';
  end if;

  v_direct_key := least(v_user_id::text, p_other_user_id::text)
    || ':' || greatest(v_user_id::text, p_other_user_id::text);

  insert into public.conversations(kind, direct_key)
  values ('direct', v_direct_key)
  on conflict (direct_key) do update set direct_key = excluded.direct_key
  returning id into v_conversation_id;

  insert into public.conversation_participants(conversation_id, user_id, last_read_at)
  values
    (v_conversation_id, v_user_id, now()),
    (v_conversation_id, p_other_user_id, null)
  on conflict (conversation_id, user_id) do update set archived_at = null;

  return v_conversation_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.moviegram_is_conversation_participant(p_conversation_id, auth.uid()) then
    raise exception 'Conversation access denied';
  end if;
  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.moviegram_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.conversations
  set updated_at = new.created_at, last_message_at = new.created_at
  where id = new.conversation_id;
  update public.conversation_participants
  set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.moviegram_touch_conversation();

create or replace function public.list_my_conversations(p_limit integer default 30, p_offset integer default 0)
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  latest_message text,
  latest_message_at timestamptz,
  latest_sender_id uuid,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    other_cp.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    lm.body,
    lm.created_at,
    lm.sender_id,
    coalesce(unread.total, 0)
  from public.conversation_participants mine
  join public.conversations c on c.id = mine.conversation_id
  join public.conversation_participants other_cp
    on other_cp.conversation_id = c.id and other_cp.user_id <> auth.uid()
  join public.profiles p on p.id = other_cp.user_id
  left join lateral (
    select m.body, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::bigint as total
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id <> auth.uid()
      and m.created_at > coalesce(mine.last_read_at, '-infinity'::timestamptz)
  ) unread on true
  where mine.user_id = auth.uid() and mine.archived_at is null
  order by coalesce(lm.created_at, c.updated_at) desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.list_my_conversations(integer, integer) from public;
grant execute on function public.list_my_conversations(integer, integer) to authenticated;

create or replace function public.moviegram_social_badge_counts()
returns table (unread_notifications bigint, unread_conversations bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.notifications n where n.user_id = auth.uid() and n.is_read = false),
    (select count(*)
       from public.conversation_participants cp
      where cp.user_id = auth.uid()
        and cp.archived_at is null
        and exists (
          select 1 from public.messages m
          where m.conversation_id = cp.conversation_id
            and m.sender_id <> auth.uid()
            and m.created_at > coalesce(cp.last_read_at, '-infinity'::timestamptz)
        ));
$$;

revoke all on function public.moviegram_social_badge_counts() from public;
grant execute on function public.moviegram_social_badge_counts() to authenticated;

create or replace function public.moviegram_insert_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id text,
  p_message text,
  p_metadata jsonb,
  p_dedupe_key text,
  p_artwork_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if p_user_id is null or p_type is null or p_user_id = p_actor_id then return null; end if;
  insert into public.notifications(
    user_id, actor_id, type, entity_type, entity_id, message, metadata,
    dedupe_key, artwork_url, is_read, read_at, resolved_at, created_at
  ) values (
    p_user_id, p_actor_id, p_type, p_entity_type, p_entity_id, p_message,
    coalesce(p_metadata, '{}'::jsonb), p_dedupe_key, p_artwork_url,
    false, null, null, now()
  )
  on conflict (dedupe_key) where dedupe_key is not null do update set
    actor_id = excluded.actor_id,
    type = excluded.type,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    message = excluded.message,
    metadata = excluded.metadata,
    artwork_url = excluded.artwork_url,
    is_read = false,
    read_at = null,
    resolved_at = null,
    created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.moviegram_insert_notification(uuid, uuid, text, text, text, text, jsonb, text, text) from public;

create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_message text default '',
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_artwork_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed_types constant text[] := array[
    'like','comment','reply','shared_list','list_collaboration_invite'
  ];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (p_type = any(v_allowed_types)) then raise exception 'Unsupported notification type'; end if;
  if p_user_id is null or p_entity_id is null then raise exception 'Notification recipient and entity are required'; end if;
  return public.moviegram_insert_notification(
    p_user_id, auth.uid(), p_type, p_entity_type, p_entity_id,
    p_message, p_metadata,
    coalesce(p_dedupe_key, p_type || ':' || auth.uid()::text || ':' || coalesce(p_entity_type, 'entity') || ':' || p_entity_id),
    p_artwork_url
  );
end;
$$;

revoke all on function public.enqueue_notification(uuid, text, text, text, text, jsonb, text, text) from public;
grant execute on function public.enqueue_notification(uuid, text, text, text, text, jsonb, text, text) to authenticated;

create or replace function public.request_follow(p_target_user_id uuid)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_private boolean;
  v_row public.follows%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_target_user_id is null or p_target_user_id = auth.uid() then raise exception 'Invalid follow target'; end if;
  select is_private into v_private from public.profiles where profiles.id = p_target_user_id;
  if not found then raise exception 'Profile not found'; end if;

  insert into public.follows(follower_id, following_id, status, updated_at)
  values (auth.uid(), p_target_user_id, case when v_private then 'pending' else 'accepted' end, now())
  on conflict (follower_id, following_id) do update set
    status = case when v_private then 'pending' else 'accepted' end,
    updated_at = now()
  returning * into v_row;
  return query select v_row.id, v_row.status;
end;
$$;

revoke all on function public.request_follow(uuid) from public;
grant execute on function public.request_follow(uuid) to authenticated;

create or replace function public.respond_to_follow_request(p_requester_id uuid, p_accept boolean)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row public.follows%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.follows
  set status = case when p_accept then 'accepted' else 'declined' end,
      updated_at = now()
  where follower_id = p_requester_id
    and following_id = auth.uid()
    and status = 'pending'
  returning * into v_row;
  if v_row.id is null then raise exception 'Pending follow request not found'; end if;
  return query select v_row.id, v_row.status;
end;
$$;

revoke all on function public.respond_to_follow_request(uuid, boolean) from public;
grant execute on function public.respond_to_follow_request(uuid, boolean) to authenticated;

create or replace function public.moviegram_follow_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_name text;
  v_old_status text;
begin
  if tg_op = 'UPDATE' then
    v_old_status := old.status;
  end if;

  select coalesce(display_name, username, 'Someone') into v_actor_name
  from public.profiles where id = new.follower_id;

  if tg_op = 'INSERT' or v_old_status is distinct from new.status then
    if new.status = 'pending' then
      perform public.moviegram_insert_notification(
        new.following_id, new.follower_id, 'follow_request', 'follow', new.id::text,
        v_actor_name || ' requested to follow you',
        jsonb_build_object('follower_id', new.follower_id, 'action_state', 'pending'),
        'follow_request:' || new.id::text, null
      );
    elsif new.status = 'accepted' and v_old_status is distinct from 'pending' then
      perform public.moviegram_insert_notification(
        new.following_id, new.follower_id, 'new_follower', 'profile', new.follower_id::text,
        v_actor_name || ' started following you',
        jsonb_build_object('follower_id', new.follower_id),
        'new_follower:' || new.id::text, null
      );
    elsif new.status = 'accepted' and v_old_status = 'pending' then
      select coalesce(display_name, username, 'Someone') into v_actor_name
      from public.profiles where id = new.following_id;
      update public.notifications
      set is_read = true, read_at = now(), resolved_at = now(),
          metadata = metadata || '{"action_state":"accepted"}'::jsonb
      where dedupe_key = 'follow_request:' || new.id::text;
      perform public.moviegram_insert_notification(
        new.follower_id, new.following_id, 'follow_accepted', 'profile', new.following_id::text,
        v_actor_name || ' accepted your follow request',
        jsonb_build_object('following_id', new.following_id),
        'follow_accepted:' || new.id::text, null
      );
    elsif new.status = 'declined' then
      update public.notifications
      set is_read = true, read_at = now(), resolved_at = now(),
          metadata = metadata || '{"action_state":"declined"}'::jsonb
      where dedupe_key = 'follow_request:' || new.id::text;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists follows_emit_notifications on public.follows;
create trigger follows_emit_notifications
after insert or update of status on public.follows
for each row execute function public.moviegram_follow_notifications();

create or replace function public.mark_notifications_read(p_notification_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  update public.notifications
  set is_read = true, read_at = coalesce(read_at, now())
  where user_id = auth.uid() and id = any(p_notification_ids) and is_read = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Notification rows may only be created by the secure functions/triggers above.
drop policy if exists notifications_insert_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;

-- Follow status transitions are handled by the secure RPCs above. Existing
-- select/delete rules remain so users can inspect or remove relationships.
drop policy if exists follows_insert_own on public.follows;
drop policy if exists follows_update_involved on public.follows;

revoke insert, update, delete on public.notifications from authenticated;
revoke insert, update on public.follows from authenticated;
revoke insert, update, delete on public.conversations from authenticated;
revoke insert, update, delete on public.conversation_participants from authenticated;
revoke update, delete on public.messages from authenticated;
grant select on public.conversations, public.conversation_participants, public.messages to authenticated;
grant insert on public.messages to authenticated;
grant select on public.notifications to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants') then
      alter publication supabase_realtime add table public.conversation_participants;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end $$;
