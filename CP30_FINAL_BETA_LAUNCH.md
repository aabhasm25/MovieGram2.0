# CP30 Final Beta Launch

## Stabilized

- Reels action stack is Comment, Details, Save/List, Watch ASAP, Like, Share.
- Reels uses one visible play/pause overlay control; tapping the video still toggles playback.
- Reels Details continues to pause the active reel.
- Reels Share keeps the premium bottom sheet and now supports report flow.
- Production info logging is gated behind `NEXT_PUBLIC_MOVIEGRAM_DEBUG=true`.
- Supabase failures remain warning-only/local-fallback where existing helpers already support it.

## Settings, Privacy, Moderation

- Added a Settings screen from Profile.
- Settings sections include Account, Privacy, Notifications, Appearance, Data & Sync, Safety, and Help/About.
- Private profile toggle uses the existing profile save path and remains safe for guest/local fallback.
- Notification, autoplay reels, spoiler preference, appearance, cache clear, export placeholder, and delete account placeholder are present.
- Added lightweight report flows for users, titles, reels, and the safety center.
- Added local block/unblock placeholder for users.
- Reports/blocks are local beta placeholders unless moderation backend tables are added later.

## Performance / Cleanup

- Info/debug logs are gated behind a dev-only flag.
- Reels Admin remains gated by admin/dev/local admin mode and is not promoted in normal production.
- Existing image/video lazy loading, off-screen reel behavior, cache use, and Supabase timeout fallbacks are preserved.

## SQL

- No SQL migration was added.
- Optional future tables can include `user_settings`, `user_blocks`, `user_reports`, `follow_requests`, and `notification_preferences`.

## Known Caveats

- Settings are local unless connected to a future `user_settings` table.
- Reports/blocks are local placeholders in this beta checkpoint.
- Live browser QA was not run in this checkpoint; build verification was run.

## Beta QA Checklist

- Auth works.
- Guest mode works.
- Profile works.
- Search strict tabs work.
- Details works.
- Watchlist and Watch ASAP work.
- Reels work and Details pauses playback.
- Ratings accuracy remains intact.
- Stats, History, and Wrapped open.
- Collections open and were not redesigned.
- Social basics, follow requests, and Notifications work.
- Settings opens and private toggle saves/falls back safely.
- Report/block flows open and do not crash.
- No `.env.local` tracked.
- Production build passes.

## Deployment Checklist

- Run `npm run build`.
- Confirm `.env.local` is not tracked.
- Confirm Supabase SQL migrations have been manually applied where required by earlier checkpoints.
- Confirm admin/dev flags are off for production testers unless intentionally enabled.
- Smoke test guest, logged-in, Reels, Details, Profile, Log, Search, Notifications, and Settings.

## Later With Claude

- Collection visual polish.
- Final animation polish.
- Deeper component refactor if needed.
