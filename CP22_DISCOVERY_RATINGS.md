# CP22 Discovery, Ratings, and Activity Hydration

## Added

- Added a Schedule tab in Explore using existing TMDB-backed upcoming data.
- Added discovery shelves for new this week, coming soon, TV drops, top movies/shows, India trending, hidden gems, comfort watch, binge-worthy shows, short runtime movies, weekend picks, Indian cinema, K-drama, and sitcoms.
- Added top-chart style shelves with honest TMDB/community fallback labeling through existing Explore rows.
- Added bounded Supabase community chart loading for most watched, most reviewed, highest rated, saved by MovieGram users, and active this week.
- Updated Discovery Hub copy to: "Find binge-worthy movies, shows, and hidden gems made for your next watch."
- Added release reminder and OTT availability reminder foundation for unreleased titles, including logged-in remote hydration when the CP22 SQL exists.
- Added activity poster backfill from Details/Search/Explore-loaded metadata into the local profile activity cache and recent Supabase activity rows when safe.
- Tightened external ratings cache identity so ratings are keyed by TMDB media type and ID.
- OMDb ratings now validate against TMDB external_ids IMDb ID before displaying IMDb, Rotten Tomatoes, or Metacritic values.

## Manual Supabase Step

Run this file manually in Supabase if release reminders should persist remotely:

- `supabase/cp22_discovery_schema.sql`

It creates `release_reminders` with user-scoped RLS policies. The app works before the SQL is run by using local fallback and logging safe warnings only.

## Community Charts

- MovieGram chart shelves try recent Supabase rows first:
  - `user_watched` for Most Watched This Week
  - `ratings_reviews` for Most Reviewed and Highest Rated
  - `user_watchlist` for Saved by MovieGram Users
  - `activity_events` for recent activity-based picks
- If community data is sparse or unavailable, Explore uses honest fallback labels such as Popular Right Now, Trending Globally, Popular on MovieGram Soon, and Top 10 This Month.

## Ratings Accuracy Strategy

- TMDB vote average is shown separately from external ratings.
- External ratings are fetched only after Details loads TMDB `external_ids`.
- When a TMDB IMDb ID exists, OMDb is called by IMDb ID, not by title.
- If OMDb returns a different IMDb ID, the ratings are ignored.
- Missing or uncertain external ratings are hidden instead of shown as official values.

## Activity Poster Hydration Strategy

- Activity events continue to carry `item_key`, `tmdb_id`, `media_type`, title, source, and poster metadata when available.
- Opening or loading Details backfills matching local and in-memory recent activity rows that were previously missing posters.
- For logged-in users, MovieGram attempts a safe Supabase metadata/poster update for matching `activity_events`; failures are warning-only.
- Profile Activity remains latest 30, continuous grid/feed, with no Today/Yesterday/Older grouping.
- Supabase activity events still fail safely if optional poster columns are unavailable.

## Intentionally Not Included

- CP23 franchise/universe/collection cards.
- CP24 wrapped/stats.
- CP26 Reels killer flow.
- Final broad visual redesign or animation polish.

## QA Checklist

- `npm run build` passes.
- Logged-out landing still opens.
- Logged-in users bypass landing.
- Explore opens and shows Schedule plus discovery shelves.
- Discovery copy includes binge-worthy wording.
- Details ratings use TMDB ID to IMDb ID to OMDb, never title-only when TMDB ID exists.
- Missing external ratings do not show as official-looking values.
- Reels to Details activity can hydrate a poster after Details loads.
- Activity remains latest 30 continuous grid.
- Watch ASAP, Profile counts, Reels, Details, and Notifications still open.
