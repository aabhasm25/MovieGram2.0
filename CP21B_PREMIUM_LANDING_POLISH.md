# CP21B Premium Landing + Controlled Polish

## Landing Added

- Added a logged-out MovieGram landing page in the existing auth/onboarding welcome state.
- Logged-in users continue into the normal app after auth loading completes.
- Guest users can still enter existing guest mode with "Explore as guest."
- Existing Login, Sign Up, and Google auth flows are preserved.

## Landing Design

- Dark cinematic background with subtle purple, blue, and red spotlight gradients.
- Poster mosaic built from existing fallback MovieGram poster data.
- Sticky header with MovieGram branding and auth actions.
- Mobile-first text flow with poster mosaic below the hero copy on small screens.
- Wider screens use a two-column hero with story cards below.

## Controlled App Polish

- Added CSS-only polish for spacing, section headers, empty states, poster fit, and button wrapping.
- Added page-level overflow guards to prevent horizontal scrolling.
- Hid scrollbars only on intentional horizontal shelves.
- Kept Home, Explore, Details, Profile, Reels, and Watchlist structures intact.

## CP21A Fixes Preserved

- No CP/debug badge in normal UI.
- Home synced dashboard block stays removed.
- Reels HORIZONTAL bubble stays removed.
- Explore manual load-more button stays removed.
- Details action row remains four buttons: Watch, List, Watch ASAP, Like.
- Profile stats row remains five stats: Watched, Watchlist, Reviews, Followers, Following.
- Lists stat count does not return.
- Watch ASAP shelf and local/Supabase-safe behavior remain intact.

## Intentionally Not Done

- CP22 schedule/charts/ratings accuracy
- CP23 franchise/universe/collections
- CP24 stats/wrapped
- CP26 Reels killer flow

## QA Checklist

- `npm run build` passes.
- Logged-out landing opens without horizontal overflow.
- Landing headline is readable and not clipped.
- Poster mosaic does not overlap text.
- Login, Sign Up, Google auth, and Explore as guest actions remain wired.
- Logged-in users bypass landing after auth resolves.
- Home is not dashboard-like.
- Explore auto-load remains in place.
- Details still has exactly four action buttons.
- Profile stats row has exactly five stats.
- Watch ASAP shelf still appears for ASAP items.
- Activity remains latest 30 continuous grid.
- Reels, Details from Reels, Notifications, Search, Explore, Profile, and guest mode still open.
