# CP18 Product Readiness

MovieGram Reels uses a cache-first production model: normal users read approved `reel_cache` rows and local fallback previews only. Discovery, candidate review, and promotion are explicit admin actions.

## Safety Rules

- Do not scrape, download, or rehost YouTube, Instagram, or Facebook videos.
- Do not call external discovery APIs on user scroll or render.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code or `NEXT_PUBLIC_*`.
- Do not delete or truncate `reel_cache`.
- Do not promote candidates with wrong sequel/year/franchise matches.
- Candidates do not appear in Reels until promoted into `reel_cache`.

## Required Env

Client-safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TMDB_API_KEY`
- `NEXT_PUBLIC_MOVIEGRAM_REEL_ADMIN_IDS` optional

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_BACKFILL_SECRET`
- `YOUTUBE_API_KEY`
- `TMDB_API_KEY` optional if different from public TMDB key

Vercel:

- Put server-only keys only in Vercel server env vars.
- Do not prefix service-role, admin secret, or YouTube key with `NEXT_PUBLIC_`.
- Confirm `.env.local` stays gitignored and is never committed.

## First Real Reels Growth Run

1. Open local dev.
2. Open Reels Admin.
3. Enter `ADMIN_BACKFILL_SECRET`.
4. Click `Check DB readiness`.
5. Keep dry run ON and click `Enrich watched reels`.
6. Confirm:
   - `itemsSent` matches the watched library.
   - `underfilled` is greater than 0 when watched items lack real cached reels.
   - `wrongSequel` and `rejected` are visible.
7. Turn dry run OFF and click `Enrich watched reels`.
   - This saves strict candidates only.
   - It does not promote to the public feed.
8. Click `Promote top safe candidates`.
9. Refresh Reels and verify Watched coverage improves.

Repeat for watchlist, favorites, and friends only after watched looks clean.

## Verification Checklist

- `npm run build` passes.
- For You still logs about 50 playable rows when the DB has enough rows.
- Active YouTube logs `YOUTUBE_LOADING` or `YOUTUBE`, not fallback.
- `/shorts/` or vertical thumbnails log `vertical-cover` and fill portrait.
- Horizontal trailers/clips log `horizontal-contain` and show full frame.
- Reel heart likes the reel only, not the movie favorite.
- Reel comments and shares create local/profile activity events.
- Private follow requests appear in Notifications with Accept/Decline.
- No external API calls happen on scroll.
- No destructive SQL exists in the CP18 flow.

## Rejection Reasons

- `weak_match`: title/source relevance is too weak.
- `wrong_sequel_or_year`: candidate appears to belong to a different sequel, prequel, or year.
- `spam_channel`: generic/motivation/spam-like result.
- `no_thumbnail`: candidate has no usable thumbnail.
- `duplicate`: candidate duplicates an existing source row.

## Admin Route Notes

`/api/admin/reel-discovery` requires `ADMIN_BACKFILL_SECRET`.

Supported actions:

- `check_db`
- `enrich_watched_reels`
- `enrich_watchlist_reels`
- `enrich_favorite_reels`
- `enrich_friend_reels`
- `list_pending`
- `approve` / `approve_selected`
- `reject`
- `promote_selected`
- `promote_top_safe`
- `update_reel_aspect`

`update_reel_aspect` accepts `aspect_mode` as `vertical`, `horizontal`, or `unknown`, plus optional `content_format`.

## Optional Reel Social Tables

Reels work without these tables because MovieGram keeps a local fallback. If you want Supabase-backed reel social events later, add tables such as:

- `reel_likes`: `user_id`, `reel_key`, `item_key`, `media_type`, `tmdb_id`, `title`, `source`, `source_video_id`, `source_url`, `created_at`
- `reel_comments`: same identity fields plus `comment_text` or `body`
- `reel_shares`: same identity fields plus `share_url`

Client writes use the authenticated anon session only. If the tables or RLS policies are missing, the app skips the remote write and keeps the local activity/comment/like state.
