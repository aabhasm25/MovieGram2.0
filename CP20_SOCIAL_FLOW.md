# CP20B Social Flow Notes

## What CP20B Added

- Follow/private-profile flow now writes `follows` with `accepted` for public profiles and `pending` for private profiles.
- Follow and follow-request actions create Supabase `notifications`.
- Notifications load real Supabase rows, enrich actors from `profiles`, and support follow request Accept/Decline.
- Activity continues to load newest 30 events only.
- Review editing now includes 0-10 rating, review text, spoiler flag, and visibility.
- Lists UI now includes name, description, and visibility, with create/add actions wired to Supabase when signed in.
- Profile stats can use Supabase product counts for watched, watchlist, reviews, lists, followers, and following.
- User search/friend discovery remains in the existing Friends/Messages surface and respects private profiles.

## Follow And Private Requests

Public profile follow:

- Creates or updates `follows`.
- Uses `status='accepted'`.
- Creates a `notifications` row with `type='follow'`.

Private profile follow:

- Creates or updates `follows`.
- Uses `status='pending'`.
- Creates a `notifications` row with `type='follow_request'`, `entity_type='follow'`, and `entity_id` set to the follow row id when available.

The UI shows Follow, Requested, Following, and Follow back where possible. Follow buttons are disabled while a request is in flight to reduce duplicate rapid clicks.

## Notifications

Notifications now load from `notifications` and show actor name/avatar when available.

For `follow_request` notifications:

- Accept updates the follow row to `accepted`.
- Decline updates the follow row to `declined`.
- The notification is marked read and receives `metadata.action_state`.
- Accept creates a notification back to the requester with `type='follow_accept'`.

Regular unread notifications can be marked read. If the table is missing before the CP20A SQL is run, helpers warn and the app stays usable.

## Activity

Activity uses:

```sql
order by created_at desc
limit 30
```

No infinite loading is implemented. Activity handles watched, watchlist, rating, review, follow, list_create, list_add, and reel-style event names gracefully.

## Reviews

Details review editing supports:

- 0-10 rating input
- review text
- spoiler checkbox
- public/friends/private visibility

Saved reviews write to `ratings_reviews` for signed-in users and stay local for guests. Review activity stores rating, spoiler, and visibility metadata.

## Lists

The Add to List sheet supports:

- create list name
- description
- visibility
- add item to an existing list

Signed-in users write to `user_lists` and `user_list_items`; guests keep the existing local/session list fallback.

## Manual SQL Requirement

Run `supabase/product_social_schema.sql` manually in Supabase before expecting the logged-in social/product tables to persist. The app remains defensive before that migration exists.

## Remaining CP21 Items

- Richer comments/likes on product activity cards.
- Full list detail sharing/collaboration.
- Blend member workflows.
- Notification preferences and bulk mark-read.
- More complete public/private visibility filtering for reviews and lists.

## CP20B Bugfix Follow-Up

- Profile counts and visible tabs now share the same Supabase-loaded product library for signed-in users.
- Watched counts and watched tabs filter unreleased/future content without deleting existing database rows.
- Watchlist views exclude items already marked watched.
- Reviews load and save `poster_path` and `release_year`; review cards use clean poster fallback only when no poster is available.
- Activity profile feed renders only actual `activity_events` rows and keeps the newest 30 event limit.
- Mark Watched is blocked for unreleased items in details, cards, quick actions, watchlist/log surfaces, and Reels action rail.
- Search/Explore labels now separate MovieGram users from TMDB Actors & Directors.

## Deployment

No GitHub push was done.
No Vercel deploy was done.
No `.env.local` secrets were exposed or committed.
