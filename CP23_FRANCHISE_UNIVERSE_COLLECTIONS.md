# CP23 Franchise, Universe, and Collections

## CP22 Carryover Fixes

- Search All tab now keeps MovieGram Users in a compact horizontal shelf.
- Actors & Directors are a separate compact shelf on All tab and no longer dominate the main vertical results.
- Main search content prioritizes movies/shows and includes known-for content from top person matches.
- Search tabs remain: All, Movies, TV Shows, Actors & Directors, Users.
- Ratings cache keys now include `media_type`, TMDB ID, and IMDb ID.
- External ratings still use TMDB Details `external_ids` -> IMDb ID -> OMDb by IMDb ID only.
- Old title-only/title-year cache keys are bypassed by the v3 cache namespace.
- Details logs a concise ratings debug once per title/cache key.

## Franchise / Universe Hubs

Added local/static fallback hubs for:

- Marvel Cinematic Universe / MCU
- DC Universe / DCU
- Wizarding World / Harry Potter
- Star Wars
- Fast & Furious
- The Conjuring Universe

Each hub includes aliases, description, release order, chronological order where known, and starter item data. Items hydrate from TMDB inside the full collection modal when available.

## Search Aliases

Alias searches include:

- `mcu`, `marvel`, `avengers`
- `dcu`, `dc`, `batman`, `superman`
- `harry potter`, `wizarding world`, `fantastic beasts`
- `star wars`, `jedi`, `mandalorian`
- `fast furious`, `fast and furious`
- `conjuring`, `annabelle`, `nun`

Matching hubs appear as Collection & Universe cards while normal movie/show search still works.

## Details Collection Card

- Details now shows a clean collection card when the current movie/show belongs to a seeded hub.
- The card shows name, item count, poster collage, Open Collection, and Add Collection.
- It does not show watched progress like `4/10`.
- Related content includes more from the same universe before TMDB similar/recommended content.

## Full Collection Page

- Opens as a modal-style collection page.
- Shows franchise name, description, poster collage, release order tab, chronological tab, and poster-first item row.
- Supports opening item details.
- Supports adding the full collection to Watchlist.

## Popular Lists

- Details shows compact MovieGram list cards where a franchise membership exists.
- Counts/likes are omitted unless real data exists.
- Static fallback list titles are used for now.

## Add Collection to Watchlist

- Adds missing titles only.
- Does not duplicate existing watchlist items.
- Does not mark unreleased titles watched.
- Does not force Watch ASAP.
- Uses Supabase watchlist helper for logged-in users when available and local fallback for all users.

## SQL Files Added

- `supabase/cp23_ratings_accuracy_fix.sql`
- `supabase/cp23_franchise_schema.sql`

Manual SQL execution is optional. The app works with static/local fallback before either file is run.

## Intentionally Not Included

- CP24 stats/history/wrapped
- CP25 filmography polish
- CP26 Reels killer flow
- CP27 smart recommendations
- CP28 full search expansion
- final Claude Code polish

## QA Checklist

- `npm run build` passes.
- Search `amitabh` shows Actors & Directors as a horizontal shelf on All tab.
- Users shelf is separate and compact.
- Main search area shows content below shelves.
- Ratings debug shows TMDB ID, media type, IMDb ID, cache key, and source.
- Search `mcu`, `marvel`, `dcu`, and `harry potter` shows collection/universe cards.
- Details for a franchise item shows a collection card with no watched-progress text.
- Full collection modal opens and supports release/chronological ordering.
- Add Collection to Watchlist does not duplicate items.
- Watch ASAP, Profile counts, Activity poster hydration, Reels, landing, and Notifications still work.
