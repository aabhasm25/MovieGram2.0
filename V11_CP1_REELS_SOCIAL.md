# v1.1 CP1 - Reels Scale + Social Feed

## What Changed

- Added `REELS_SOURCE_MODE` support with `local`, `global`, and `hybrid`.
- Default mode is `hybrid`: MovieGram tries Supabase/global `reel_cache` first and falls back to local/seeded previews if it is empty, slow, or unavailable.
- Reels candidate loading now uses a deeper candidate window for global/hybrid cache lookup while still rendering in paged batches.
- Reels action order is `Comment / Details / Save/List / Watch ASAP / Like / Share`.
- Reels comments sheet now loads local comments immediately and attempts a safe Supabase comment load when logged in.
- Reel likes, comments, and shares remain local-first and best-effort remote.
- Home social feed now uses real available friend/activity data or a clean empty state; no fake friends are shown for normal social feed.
- Notifications have clearer labels for reel/comment/share/list/movie-night style notification types when real rows exist.
- Reels Admin shows source mode and local/global/candidate counts only in the admin/dev surface.

## Source Mode

- `local`: skips global Supabase reel cache and uses local/seeded fallback flow.
- `global`: uses Supabase/global reel cache only and does not fall back to local previews.
- `hybrid`: uses Supabase/global first, then local fallback if global is empty or fails.

Source mode defaults to `hybrid`. Admin/dev users can switch it from Reels Admin; the choice is stored in localStorage as `moviegram.reelsSourceMode`.

## Reel Counts

The app prepares a larger candidate window for global/hybrid loading and reports the current candidate pool in Reels Admin. The exact playable count depends on `reel_cache`, TMDB video availability, and local state.

## SQL

Optional additive SQL:

- `supabase/v11_cp1_reels_social.sql`

It adds/ensures foundations for:

- `reel_cache`
- `reel_interactions`
- `reel_comments`
- `reel_comment_likes`
- `user_reel_preferences`

Run manually in Supabase when ready. The app works without this SQL.

## Comments And Interactions

- Comments open in the existing bottom sheet.
- Guests use localStorage fallback.
- Logged-in users try Supabase `reel_comments` if available.
- Likes are optimistic and stored locally, with best-effort Supabase save.
- Share uses the existing premium bottom sheet.

## Social Feed

- Uses real `socialActivity` rows when available.
- Groups activity into:
  - Friends are watching
  - Friends reviewed
  - Friends liked
  - Recommended by friends
- Shows a clean empty state when there is no friend activity.

## Notifications

Notifications now display friendlier labels for real social event types:

- follow request
- reel comment
- reel like
- review comment/like
- friend shared item
- list invite
- movie night invite/vote

No fake notifications are created.

## Known Caveats

- Global reels depend on playable rows existing in Supabase `reel_cache`.
- Supabase social tables are optional; missing tables are warned once and local fallback continues.
- Full threaded comments and real DMs are intentionally not included.

## QA Checklist

- `npm run build` passes.
- Reels Admin shows source mode and counts for admin/dev only.
- Hybrid mode falls back to local previews if Supabase global reels fail.
- Reels action order is Comment, Details, Save/List, Watch ASAP, Like, Share.
- Reels comments sheet opens and local comments persist.
- Reel likes persist locally.
- Share sheet still works.
- Details from Reels pauses playback.
- Social feed uses real data or a clean empty state.
- Notifications open and follow requests remain safe.
- Search strict tabs, collections, Profile, Log, Watch ASAP, ratings, and guest mode still work.
