# CP28 Social Search

## Features

- Reels action order is Comment, Details, Save/List, Watch ASAP, Like, Share.
- Reels keeps one play/pause overlay control; tapping the video still toggles playback and Details still pauses the active reel.
- Share uses the existing premium bottom sheet with a friend row when social activity exists, plus Copy link and Add to list.
- Blend keeps the existing social blend page and adds a Movie Night picker.
- Movie Night supports Movie/TV, genre, runtime, and language filters, quick Want/Maybe/Skip voting, and a winner card that can be saved locally.
- Shared Lists use the existing reusable Add to List sheet with private/friends/public visibility and local fallback.
- Add-to-list flow is reusable from Details, Reels share, and poster quick actions.
- Friend recommendation surfaces continue to use real social activity when available, with clean empty states otherwise.
- Search tabs remain strict: Content, Collections, Cast & Crew, Users.
- Content search now has scoped filters for Movies, TV Shows, Anime, Upcoming, Top Rated, language, and genre.
- Collections search includes collection/franchise results and matching user lists only inside the Collections tab.

## Fallback behavior

- Guest mode uses local/demo Blend and Movie Night state.
- Shared/collaborative list metadata is represented locally unless backend collaboration tables are available later.
- No fake friend activity is generated for logged-in users; empty/fallback states are shown when social data is missing.

## SQL

- No SQL migration was added for CP28.
- Existing product/social tables remain untouched.

## Search strictness

- Content shows only movies/TV/content results.
- Collections shows only collections/franchises/universes/watch orders/lists.
- Cast & Crew shows only people.
- Users shows only MovieGram app users.
- No automatic tab switching is introduced.

## QA checklist

- `npm run build` passes.
- Reels action stack is Comment / Details / Save / Watch ASAP / Like / Share.
- Watch ASAP remains directly below Save/List.
- Reels has one play/pause overlay control and tapping video toggles playback.
- Details from Reels pauses playback.
- Share bottom sheet opens with friend fallback, Copy link, and Add to list.
- Blend opens and can be created locally.
- Movie Night filters, voting, and winner save work.
- Shared list creation and add-to-list sheet work.
- Search tabs remain strict and manual.
- Collections UI is not redesigned.
- Profile, Log, Stats, Wrapped, Person pages, Watch ASAP, ratings, Reels Admin, Activity hydration, auth, and guest mode remain intact.
