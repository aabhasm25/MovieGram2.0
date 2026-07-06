# CP23C Moctale-Style Collections + Strict Filters

## Collection UI Changes

- Collection pages now use a larger page-like modal with cinematic dark treatment.
- Added large hero/banner, collection title, short description, MovieGram source label, and title count.
- Ordered items render in a numbered responsive poster grid.
- Removed per-card Add buttons from collection item cards to reduce clutter.
- Main collection action remains Add Collection to Watchlist near the top.

## Strict Search Filters

Search filters are exactly:

- Content
- Collections
- Cast & Crew
- Users

Behavior:

- Content shows movies/TV/known-for content only.
- Collections shows franchise/universe/list cards only.
- Cast & Crew shows person results only.
- Users shows MovieGram profile results only.
- Strong aliases such as `mcu`, `harry potter`, and `welcome` show cleanly in Collections, but never force-switch or lock the active tab.

## Supported Collections / Hubs

- MCU / Marvel Cinematic Universe
- DCU / DC
- Wizarding World / Harry Potter / Fantastic Beasts
- Star Wars
- Fast & Furious
- Mission: Impossible
- Jurassic Park / Jurassic World
- The Conjuring Universe
- MonsterVerse
- X-Men
- Spider-Man
- Lord of the Rings / The Hobbit
- Welcome Collection
- Hera Pheri Collection
- John Wick
- Pirates of the Caribbean
- Transformers
- Hunger Games

## MCU Data Approach

- MCU uses curated seeded fallback with 36 movie/show entries.
- The page label is treated as a MovieGram collection, not a claim of database completeness.
- Release Order is the primary order.
- Story Order is available from seeded chronological values and is labeled separately.
- Posters and richer details hydrate from TMDB when the collection opens.

## Details Popular Lists / Collections

- Details now shows `Popular Lists / Collections` for seeded multi-part/franchise items.
- Details also shows `Popular Lists / Collections` for TMDB movie collections when `belongs_to_collection` is available.
- Cards include MovieGram source, poster collage, title count, Open, and Add.
- Cards do not show watched progress like `4/10`.
- If no confident seeded or TMDB collection match exists, the section stays hidden.

## SQL

Added:

- `supabase/cp23c_collection_filter_quality.sql`

Manual SQL only. No SQL was run automatically.

## Known Caveats

- Collection data is curated/static fallback plus TMDB collection hydration, not a fully remote-managed collection catalog yet.
- Some seeded future titles may show fallback posters until TMDB has stable metadata.

## QA Checklist

- `npm run build` passes.
- Filters are Content / Collections / Cast & Crew / Users.
- Content is pure movie/TV/content.
- Collections is pure collections/franchises/lists.
- Cast & Crew is pure person results.
- Users is pure MovieGram user profiles.
- Search `mcu` shows MCU under Collections and does not prevent switching back to Content.
- MCU shows far more than 5 titles.
- Collection page has a hero and numbered poster grid.
- Details for Harry Potter/Welcome/Hera Pheri shows Popular Lists / Collections when seeded or TMDB collection data is available.
- Add Collection to Watchlist does not duplicate items.
- Ratings accuracy, Watch ASAP, Activity hydration, Reels, landing, and Notifications remain intact.
