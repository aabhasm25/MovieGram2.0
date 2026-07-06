-- CP23C collection/filter quality support.
-- Run manually in Supabase SQL editor. This is additive and idempotent.

alter table franchise_hubs
  add column if not exists completeness_label text;

alter table franchise_hubs
  add column if not exists order_label text default 'Release Order';

alter table franchise_hubs
  add column if not exists story_order_label text default 'Story Order';

alter table franchise_items
  add column if not exists source_label text default 'MovieGram';

create index if not exists franchise_hubs_completeness_idx
  on franchise_hubs(completeness_label);

create index if not exists franchise_items_order_quality_idx
  on franchise_items(hub_key, release_order, chronological_order);
