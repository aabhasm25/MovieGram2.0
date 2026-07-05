-- CP21A Watch ASAP additive migration.
-- Run manually in Supabase SQL editor after CP20 product_social_schema.sql.
-- Safe to re-run; does not delete or rewrite existing watchlist data.

alter table user_watchlist
  add column if not exists watch_asap boolean default false;

alter table user_watchlist
  add column if not exists watch_asap_at timestamptz;

create index if not exists idx_user_watchlist_watch_asap
  on user_watchlist(user_id, watch_asap, watch_asap_at desc);
