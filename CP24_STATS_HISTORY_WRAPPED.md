# CP24 Stats, History, Wrapped

## Added
- Upgraded Profile entry points for Stats, Watch History, Wrapped, Lists, Watch ASAP, and Reviews.
- Expanded Stats with watched movie/show counts, episode count, estimated watch time, average rating, review count, watchlist count, Watch ASAP count, this month/year watched counts, genres, languages, rating distribution, and safe collection progress.
- Upgraded Watch History with newest-first rows, search, filters for All/Movies/TV Shows/Episodes/This Month/This Year, and tap-to-open for movie/show rows.
- Added a simple calendar/heatmap-style history view with previous/next month controls and day-level watched title lists.
- Added Wrapped/Recap cards inside Stats using real watched, rating, watchlist, and date data. Missing data shows locked/empty guidance instead of fake stats.

## Calculations
- Watch time is an estimate: movie runtime when present, otherwise 100 minutes; episode count uses a 45-minute fallback.
- TV show and movie counts are separated by existing `media_type`.
- Episodes come from local/remote `episodeProgress`.
- Collection progress uses existing CP23 franchise seed data only and appears in Stats, not Details collection cards.
- Ratings distribution uses normalized MovieGram user ratings.

## Data Behavior
- Guest mode uses local MovieGram state.
- Logged-in mode uses the existing canonical merged library state; Supabase failures continue to fall back safely.
- No destructive SQL was added or required.

## Not Touched
- CP23 collection page/card redesign.
- CP25 filmography polish.
- CP26 Reels flow.
- CP27 recommendations.
- CP28 blends/movie night.

## QA Checklist
- `npm run build`
- Profile top stats row remains Watched / Watchlist / Reviews / Followers / Following.
- Stats opens from Profile shortcut.
- Watch History opens from Profile shortcut.
- History filters and search respond without crashing.
- Calendar month controls work and day selection shows watched titles.
- Wrapped cards show real data or clean empty states.
- Marking watched/unwatched updates canonical watched state, which feeds Stats and History.
- Watch ASAP, Details, Reels, Search filters, Activity hydration, and collections still open.
