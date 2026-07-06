# CP25 People and Filmography

## Changed
- Restored Profile shortcut cards to the simple previous set: Favorite, Lists, Stats, Diary.
- Kept the Profile header, 5-stat row, and Activity / Watched / Watchlist / Reviews tabs unchanged.
- Kept CP24 Stats, Watch History, and Wrapped accessible from Log and the existing Stats/Diary flows.
- Upgraded TMDB person pages with biography read-more, birth/death/place metadata, known-for posters, and full filmography.
- Added filmography filters for All, Movies, TV Shows, Acting, Directing, Writing, and Production/Crew.
- Added filmography sorting for latest, oldest, and popular.
- Split Details cast/crew into Actors, Directors / Creators, and Writers rows.
- Search Cast & Crew remains people-only through the existing strict filter behavior.

## Person Page Behavior
- Tapping people from Details cast rows, crew rows, Search Cast & Crew, or filmography opens the same Person page.
- Filmography rows show poster, title, year, Movie/TV label, role/job/character, rating if available, and watched state.
- Items without posters are still allowed in filmography rows with a dark fallback, but compact known-for grids use poster-backed items.

## Stats Integration
- CP24 Stats lightly reads watched item cast/crew metadata when it already exists.
- No actor/director stats are invented; missing data shows a locked fallback.

## SQL
- No SQL added.

## QA Checklist
- `npm run build`
- Profile shortcuts are Favorite / Lists / Stats / Diary.
- Log still exposes Watch History, Stats, and Wrapped.
- Tap actor/director/writer from Details to open Person page.
- Person page bio read-more works.
- Filmography filters and sorting work.
- Search Cast & Crew shows people only.
- Collections, Watch ASAP, Reels, ratings, Profile tabs, Activity hydration, and Search filters still work.
