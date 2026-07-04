# CP20A Product Schema Notes

## Tables Added

`supabase/product_social_schema.sql` adds the product/social foundation:

- `profiles`
- `follows`
- `notifications`
- `user_watchlist`
- `user_watched`
- `ratings_reviews`
- `activity_events`
- `user_lists`
- `user_list_items`
- `blends`
- `blend_members`

The migration is additive/idempotent and keeps CP19 Reels tables separate. `activity_events` includes CP20 columns plus compatibility columns (`event_key`, `action`, `item_data`) used by the current UI.

## Manual Supabase Step

Run `supabase/product_social_schema.sql` manually in the Supabase SQL editor before expecting logged-in product persistence to write to the new tables.

The app is resilient before the SQL runs: Supabase write/read failures warn in the console and fall back to the existing local/session state.

## Wired In CP20A

- Logged-in watchlist add/remove writes to `user_watchlist`.
- Logged-in mark watched/remove watched writes to `user_watched`.
- Ratings/reviews write to `ratings_reviews`.
- Watchlist, watched, rating, and review actions create `activity_events`.
- Profile load/save uses `profiles`, including `is_private`.
- Notifications can load from `notifications`; follow request UI remains in place.
- Profile Activity reads recent Supabase activity and keeps local activity as fallback.

## Activity Limit

Activity loads use:

```sql
order by created_at desc limit 30
```

There is no infinite loading in CP20A.

## Deferred To CP20B

- Full follow request notification creation and read/unread workflows.
- Friends-visible filtering beyond the current basic RLS.
- Rich user list UI backed entirely by `user_lists` and `user_list_items`.
- Blend member workflows beyond the schema/helper foundation.

## Deployment

No GitHub push was done.
No Vercel deploy was done.
No `.env.local` secrets were exposed or committed.
