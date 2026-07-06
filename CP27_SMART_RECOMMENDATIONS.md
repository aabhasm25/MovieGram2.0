# CP27 Smart Recommendations

## Features added

- Added a deterministic MovieGram taste profile built from watched titles, ratings, likes/favorites, watchlist, Watch ASAP, reviews, recent activity, genres, languages, and friend activity when available.
- Added shared `scoreRecommendation(item, userTaste)` and `rankRecommendations(...)` helpers.
- Home recommendations now use scored sections:
  - For You
  - Because You Watched
  - From Your Watchlist
  - Binge-worthy Shows
  - Hidden Gems
  - Trending For You
  - Friends Are Watching
- Details now has a smarter More Like This row with reason text and watched-title avoidance.
- Log/Watchlist now has a What to Watch Tonight shelf, prioritizing Watch ASAP and high-match saved titles.
- Explore Content chips are now For You, Movies, TV Shows, Binge-worthy, Hidden Gems, Top Rated, and Schedule.
- Reels Recommended uses the shared scoring layer, starts with more candidates, and keeps watched/spoiler-heavy items out of Recommended.

## Scoring logic

Positive signals:
- Genre match
- Language match
- Watchlist and Watch ASAP
- Favorite/liked item
- Similarity to watched titles
- Friend watched/liked activity
- TMDB popularity and rating
- Poster availability

Negative signals:
- Already watched in For You contexts
- Low-rated items
- Missing posters
- Unreleased titles where watched actions would not apply
- Spoiler-heavy reels for unwatched titles

The helper returns `score`, `reasons`, and `tags`. No fake AI or invented stats are used.

## CP26 carryover fixes

- Reels keeps the Instagram-like right-side action rail order:
  Details, Watched, Save/List, Watch ASAP, Like, Share.
- Watch ASAP remains directly under Save/List.
- Share uses a premium bottom sheet with dim/blur backdrop styling, friend fallback, Copy link, and Add to list.
- Recommended Reels pulls from a wider candidate pool and loads more items per page.
- Where to Watch remains a merged seamless provider scroller with action labels under logos.

## SQL

- No SQL migration was added.
- Recommendations are derived from existing local/Supabase-backed MovieGram state.

## Caveats

- Actor/director match is only applied when that metadata is already present in cached item data; CP27 does not add new background person-credit fetching.
- Provider-aware Watchlist recommendations use existing provider data when available, but do not perform new provider lookups for every saved title.
- The Friends row only appears when real social activity items are available.

## QA checklist

- `npm run build` passes.
- Reels right-side action order is Details, Watched, Save/List, Watch ASAP, Like, Share.
- Reels Details pauses playback.
- Share sheet opens with Copy link and Add to list.
- Recommended Reels avoids watched/spoiler-heavy items.
- Home shows smart rows with reason text.
- Details More Like This shows reason text.
- Log Watchlist shows What to Watch Tonight when saved titles exist.
- Explore Content chips remain content-only.
- Search strict tabs are unchanged.
- Collections, Profile, Log, Watch ASAP, ratings, Reels Admin, Activity hydration, auth, and guest mode remain intact.
