# CP21A Cleanup + Watch ASAP

## Removed From Normal UI

- Removed the visible CP19/cache-first checkpoint badge from the app header.
- Removed the Home synced/guest dashboard block so Home starts with normal content/feed.
- Removed the Reels horizontal/vertical layout bubble from the feed.
- Removed the manual "Load more from this tab" Explore button.
- Removed the Details-page Reels action button. The main Reels tab remains.

## Watch ASAP

- Watch ASAP is a clock action in Details and the quick action sheet.
- Tapping Watch ASAP adds the item to Watchlist if needed and marks it with `watch_asap=true`.
- Tapping Watch ASAP again removes only the ASAP flag and keeps the item in Watchlist.
- Marking an item watched removes it from Watchlist and Watch ASAP through the existing watchlist/watched exclusivity path.
- Watchlist and Profile > Watchlist show a horizontal Watch ASAP shelf when ASAP items exist.
- ASAP items also remain in the full Watchlist grid.

## SQL Migration

Added `supabase/watch_asap_migration.sql`.

Run it manually in Supabase SQL editor after the CP20 schema if you want cloud persistence for ASAP flags. The app still works locally before the migration and fails safely if the columns are missing.

## Intentionally Not Included

- CP21B landing/premium redesign
- CP22 schedule/charts/ratings accuracy
- CP23 franchise/universe features

## QA Checklist

- `npm run build` passes.
- Header has no CP/checkpoint badge for normal users.
- Home no longer shows the synced dashboard block.
- Reels keeps For You / Watched / Friends and removes the HORIZONTAL bubble.
- Reels Details action still opens Details and background playback remains paused.
- Explore auto-loads near the bottom without the manual load-more button.
- Discovery Hub copy does not mention TMDB.
- Profile stats row shows Watched, Watchlist, Reviews, Followers, Following.
- Lists shortcut card remains.
- Details action row shows Watch, List, Watch ASAP, Like.
- Watch ASAP toggle updates Details, Profile Watchlist, Watchlist shelf, and the full grid.
- Mark watched removes the title from Watchlist and Watch ASAP.
- Guest/local mode still works.
