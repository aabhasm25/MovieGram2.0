-- CP23B collection quality support.
-- Run manually in Supabase SQL editor. This is additive and idempotent.

alter table franchise_hubs
  add column if not exists seed_version text;

alter table franchise_items
  add column if not exists seed_version text;

create index if not exists franchise_items_release_order_idx
  on franchise_items(hub_key, release_order);

create index if not exists franchise_items_chronological_order_idx
  on franchise_items(hub_key, chronological_order);

create index if not exists franchise_items_release_date_idx
  on franchise_items(hub_key, release_date);

create index if not exists franchise_hubs_type_idx
  on franchise_hubs(type);
