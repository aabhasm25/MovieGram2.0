# CP26 Reels Killer Flow

## What changed

- Reels tabs are now Recommended, Watched, and Friends.
- Recommended uses deterministic scoring from watchlist, ratings, watched similarity, genre overlap, friend activity, popularity, and poster availability.
- Recommended filters out watched titles and heavy spoiler reels when the title is not watched.
- Reels cards now show poster thumbnail, Movie/TV label, year, genre chips, reason text, and a spoiler label.
- Reels actions are Details, Watched, List, Watch ASAP, Like, and Share.
- Details from Reels still pauses the active player and records details_open activity with poster metadata.
- Share opens a small sheet with Send to friend, Copy link, and Add to list.

## Spoiler logic

- Official trailers and teaser-style videos are treated as No spoilers.
- Scene, clip, and edit-style reels are treated as Mild spoilers.
- Videos tagged or titled as spoilers, final scene, ending, or major spoiler are treated as Spoilers.
- Recommended hides Spoilers unless the item is already watched. Watched allows spoilery content.

## Reels Admin

- Reels Admin remains available through the existing admin/dev gate.
- Existing admin inputs support source selection, manual URL rows, TMDB/video discovery, candidate promotion, and cache/candidate visibility.
- Manual URL rows can continue linking a reel to a title, TMDB id, media type, content format, aspect mode, and label.

## Where To Watch

- Details now merges providers into one compact horizontal scroller.
- Duplicate providers are collapsed, so Prime/Netflix/YouTube appear once with combined labels such as Stream, Rent, Buy, Ads, or Subscription.
- Stream/Rent/Buy section headings and repeated provider cards are removed.

## SQL

- No SQL migration was added for CP26.
- The app continues to use existing reel_cache, reel_candidates, reel_likes, reel_comments, and reel_shares tables when available, with local fallback.

## QA checklist

- `npm run build` passes.
- Reels shows Recommended / Watched / Friends.
- Recommended avoids watched and spoiler-heavy reels.
- Watched shows watched-related reels.
- Friends shows friend activity or a clean fallback.
- Reel actions work: Details, Watched, List, Watch ASAP, Like, Share.
- Details from Reels pauses background playback and activity keeps poster metadata.
- Reels Admin still opens.
- Where to Watch is one seamless horizontal provider scroller with merged actions.
- Search strict tabs, collections, Profile/Log/Stats, person pages, ratings, Watch ASAP, and guest/auth flows remain intact.
