# v1.1 CP3 - Collections Polish + Reels Carryover

## What Changed

- Restored the final approved Reels action order:
  - Like
  - Comment
  - Details
  - List
  - ASAP
  - Share
- Kept one Reels play/pause overlay and preserved Details pause behavior.
- Polished the shared collection page template for every collection hub.
- Made collection pages more full-page, cinematic, mobile-first, and poster-forward.
- Expanded the MCU seed to a larger `MCU Movies & Shows Release Order` list.
- Tightened collection membership matching to avoid title-only false positives.
- Filtered Explore Collections results to safe, collage-ready collection/list cards only.

## Shared Collection Template

All franchise/collection hubs use the same page template:

- Back button
- Cinematic hero/banner
- MovieGram collection label
- Large collection title
- Short description with Read More / Show Less
- Count text like `48 titles · Release order`
- Poster collage/header art
- Single top action: Add Collection to Watchlist
- Release Order poster grid
- Order number overlay
- Title/year/type below poster
- Poster tap opens Details

There are no visible Release Order / Story Order switch buttons in the page chrome.

## Safe Collection Detection

Collection cards are shown only when MovieGram can identify a safe collection:

- TMDB `belongs_to_collection` and TMDB collection parts.
- Curated/seeded franchise items when the current item exists in that list.
- Exact TMDB/media type match first.
- Exact title + year fallback only.
- At least 2 valid collection items.
- At least 2 real posters for card/collage surfaces.

Avoided:

- Loose title matching.
- Generic word matching.
- Fake list cards.
- Duplicate collection cards.
- Placeholder poster collages.

## Reels Carryover

The visible Reels action stack now renders:

`Like / Comment / Details / List / ASAP / Share`

ASAP remains directly below List, and there is no Watched button in the Reels action stack.

## Known Caveats

- Collection page poster completeness still depends on TMDB hydration for seeded IDs.
- Some future/unreleased MCU entries are intentionally not included unless the seeded ID/order is safe.
- Explore hides collection cards until at least two real posters are available.

## QA Checklist

- `npm run build` passes.
- Reels order is Like, Comment, Details, List, ASAP, Share.
- Details from Reels pauses playback.
- Only one Reels play/pause overlay is rendered.
- Collection page uses the shared premium template.
- Description clamps with Read More when long.
- No Release/Story order buttons clutter the page.
- Details collection card has no Open button and opens by whole-card click.
- Explore collection cards have real poster collages and no placeholder bookmark block.
- MCU uses `MCU Movies & Shows Release Order` and release-order sorting.
- Search tabs remain strict.
- Profile, Log, Watch ASAP, ratings, Reels, auth, and guest mode still work.
