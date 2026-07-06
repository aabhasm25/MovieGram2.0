# CP23B Collection Universe Quality Fix

## What Changed From CP23

- Expanded franchise/universe seed data so collection pages no longer feel fake or empty.
- MCU now uses a broad movie/show release-order fallback instead of the previous 5-title starter list.
- Collection pages now use a cinematic hero, poster collage, source label, action buttons, and numbered poster grid.
- Search filters were cleaned to: Content, Collections, Cast & Crew, Users.
- Details pages now keep clean Popular Lists / Collections cards without watched-progress text.

## Why MCU Was Incomplete

CP23 shipped a small proof-of-concept seed with only a handful of MCU titles. CP23B replaces that with a meaningful fallback list across phases and shows, while still hydrating posters/details from TMDB when a collection is opened.

## Supported Hubs

- Marvel Cinematic Universe / MCU
- DC Universe / DCU
- Wizarding World / Harry Potter / Fantastic Beasts
- Star Wars
- Fast & Furious
- Mission: Impossible
- Jurassic Park / Jurassic World
- The Conjuring Universe
- MonsterVerse
- X-Men
- Spider-Man universe
- Lord of the Rings / The Hobbit
- Welcome Collection
- John Wick
- Pirates of the Caribbean
- Transformers
- The Hunger Games

## Search Filters

Search now uses:

- Content
- Collections
- Cast & Crew
- Users

The default Content view still shows compact Users and Cast & Crew shelves, then keeps movies/shows/collection content dominant.

## Details Collection/List Cards

- Details shows clean Collection and Popular Lists cards when an item belongs to a seeded franchise.
- Cards include title, MovieGram source, poster collage, item count, Open Collection, and Add Collection.
- Cards do not show watched progress like `4/10`.

## Add Collection to Watchlist

- Adds missing titles only.
- Preserves existing watchlist and Watch ASAP state.
- Does not mark anything watched.
- Allows unreleased titles to be watchlisted, while watched restrictions remain unchanged.
- Uses Supabase helper for logged-in users when available and local fallback for guests.

## SQL

Added:

- `supabase/cp23b_collection_quality.sql`

This is optional, additive, and manual-only. The app works from local/static fallback before SQL is run.

## Intentionally Not Included

- CP24 stats/history/wrapped
- CP25 filmography polish
- CP26 Reels killer flow
- CP27 recommendations
- CP28 full search expansion
- final Claude Code polish

## QA Checklist

- `npm run build` passes.
- MCU page shows far more than 5 titles.
- Collection page has hero/banner and numbered ordered poster grid.
- Release Order works.
- Chronological Order works or safely disables when unavailable.
- Search `mcu`, `marvel`, `harry potter`, `welcome`, `mission impossible`, `john wick`, `monsterverse`, and `lotr` shows collection results.
- Details collection cards have no watched-progress text.
- Add Collection to Watchlist does not duplicate existing items.
- Ratings accuracy, Watch ASAP, Activity poster hydration, Reels, landing, and Notifications remain intact.
