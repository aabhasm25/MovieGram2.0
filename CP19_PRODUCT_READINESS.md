# CP19 Product Readiness

CP19 focuses on visible product usefulness while preserving the cache-first Reels architecture.

## Shipped In This Pass

- Reels vertical layout resolver now lets strong vertical signals win over misleading YouTube thumbnails.
- `/shorts/`, `short/reel` metadata, `#shorts`, `#reels`, and manual vertical overrides force `vertical-cover`.
- Horizontal trailers/clips remain `horizontal-contain` with blurred background.
- Reel social writes now disable missing Supabase social tables for the session after `404`/`PGRST205`/schema-cache errors.
- Reel like side effects moved out of the `setReelLikes` updater to avoid parent state updates during render.
- Home now has a real `Recently Opened` row sourced from actual profile activity.
- Explore active tabs have a load-more control.
- Details has an `Open Reels` action.
- Custom list detail supports rename, share/copy, and delete.
- Profile Activity is grouped into Today, Yesterday, and Older.
- Lightweight preferences onboarding stores genres/privacy locally.

## Safety Guarantees

- No scraping, downloading, or rehosting videos.
- No external API calls on Reels scroll.
- No destructive SQL.
- No `reel_cache` deletes.
- No service role key in client code.
- Reel social tables are optional; local fallback remains active when tables/RLS are missing.

## Manual SQL / DB Notes

Run SQL manually only when ready:

- `supabase/reels_discovery_engine.sql` for discovery tables.
- Optional future social tables:
  - `reel_likes`
  - `reel_comments`
  - `reel_shares`

Use `supabase/reel_social_tables.sql` for those optional tables and RLS policies.

If those social tables are absent, MovieGram uses localStorage and logs one dev warning per missing table.

## Local Test Checklist

1. Open Reels with a YouTube Shorts URL or a row marked `content_format=short`.
2. Confirm console log:
   `Reel layout final: videoId=..., mode=vertical-cover, strongVertical=true`.
3. Open a trailer/clip and confirm:
   `mode=horizontal-contain`.
4. Like a reel and confirm no `Cannot update Home while rendering ReelsScreen` warning.
5. If social tables are missing, confirm only one skip warning per table and UI still works.
6. Open a title Details page, return Home, and confirm it appears under `Recently Opened`.
7. Run `npm run build`.

## Vercel Env Checklist

Client-safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TMDB_API_KEY`
- `NEXT_PUBLIC_MOVIEGRAM_REEL_ADMIN_IDS` optional

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_BACKFILL_SECRET`
- `YOUTUBE_API_KEY`
- `TMDB_API_KEY` optional

Never prefix service role, admin secret, or YouTube API key with `NEXT_PUBLIC_`.

## GitHub / Vercel Push Checklist

```bash
npm run build
git status
git add app/page.js app/globals.css CP19_PRODUCT_READINESS.md CP18_PRODUCT_READINESS.md app/api/admin/reel-discovery/route.js
git commit -m "CP19 product sprint stabilization"
git push
```

Then verify Vercel has the server-only env vars before deploying admin discovery jobs.

## Known Risks

- Instagram/Facebook playable feeds require real approved source URLs in `reel_cache`; MovieGram does not fake them.
- Optional Supabase reel social tables need schema/RLS before remote writes persist.
- Admin save/promote jobs are explicit and should be run in small batches.
- YouTube embeds can still show browser extension `ERR_BLOCKED_BY_CLIENT` telemetry noise; this is not treated as playback failure.
