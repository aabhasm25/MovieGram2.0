# MovieGram Development Roadmap

## Priority 0: Preserve the Current Prototype

Goal: keep the existing UI stable while preparing the app for real usage.

- Do not redesign the interface before core functionality exists.
- Keep current routes and screen structure intact.
- Document current static data shape and reuse it as the first application schema draft.
- Add basic project checks so regressions are easier to catch.
- Fix source encoding issues such as the star characters in `LogScreen` when code changes are allowed.

## Priority 1: Data Model and Persistence

Goal: replace mock-only behavior with durable app data.

- Choose a persistence layer such as PostgreSQL, SQLite, Supabase, Firebase, or another hosted backend.
- Define core models:
  - User
  - Movie
  - Follow/Friend relationship
  - Watchlist item
  - Watched/log entry
  - Review
  - Rating
  - Feed activity
  - Notification
  - Conversation
  - Message
- Move static arrays from `data/movieData.js` behind data access functions.
- Add seed data that reproduces the current prototype content.
- Add validation for user-created records.

## Priority 2: Authentication and Real Profiles

Goal: make the app multi-user.

- Add sign up, sign in, sign out, and session handling.
- Connect the profile screen to the authenticated user.
- Add editable profile fields such as name, handle, bio, and avatar.
- Replace hard-coded profile stats with calculated counts.
- Protect routes that require a user session.

## Priority 3: Movie Discovery and Details

Goal: make movie data useful beyond the static seed list.

- Implement real search for movies and shows.
- Connect to a movie metadata provider or build an internal catalog.
- Support movie detail pages for searched and saved titles.
- Add loading, empty, and not-found states.
- Make Explore chips filter real results.
- Replace CSS placeholder posters with real poster image support when assets are available.

## Priority 4: Watchlist and Watched Logging

Goal: make the core tracking loop functional.

- Make `Watchlist` button add or remove a movie from the signed-in user's watchlist.
- Make `Mark as Watched` create a watched entry.
- Make the log form save movie, date, rating, and review text.
- Replace static star text with an interactive rating input.
- Add diary/history views for logged movies.
- Make watchlist filters switch between Movies and TV Shows.

## Priority 5: Social Feed

Goal: turn static feed cards into real user activity.

- Generate feed items from watch, review, rating, list, and follow activity.
- Add like and unlike actions.
- Add comments and comment counts.
- Add share targets or copy-link behavior.
- Add pagination or infinite scrolling.
- Add privacy controls for what appears in the feed.

## Priority 6: Messaging and Notifications

Goal: make social interactions actionable.

- Add conversation detail routes.
- Implement sending and receiving messages.
- Store unread message counts per user.
- Generate notifications from likes, comments, follows, recommendations, and watch activity.
- Allow notifications to be marked read or dismissed.
- Replace static badges with real unread counts.

## Priority 7: Profile, Lists, and Collections

Goal: make user collections navigable and meaningful.

- Implement Profile tabs for posts, saved items, and reviews.
- Add public user profile routes such as `/users/[handle]`.
- Add custom lists and list detail pages.
- Support list creation, editing, and deletion.
- Add profile watchlist privacy settings.

## Priority 8: Reels and Media

Goal: decide whether reels are a real product feature or a visual prototype.

- Define what a reel represents: video, review clip, poster montage, or short post.
- Add a data model for reels if the feature stays.
- Add media upload or embed support.
- Add playback states and controls.
- Persist likes, comments, shares, and saves.

## Priority 9: Quality, Safety, and Operations

Goal: make the app reliable enough for real users.

- Add automated tests for data helpers and key screens.
- Add end-to-end tests for navigation and core flows.
- Add error boundaries and loading states.
- Add accessibility checks for forms, buttons, and navigation.
- Add moderation tools for profiles, reviews, comments, messages, and reels.
- Add rate limiting for social actions and messaging.
- Add analytics for product usage and errors.
- Add deployment configuration and environment variable documentation.

## Suggested Build Order

1. Add persistence and seed data while keeping the current UI unchanged.
2. Add authentication and bind the profile to the active user.
3. Make watchlist and movie logging persistent.
4. Implement movie search and real movie detail data.
5. Generate the home feed from real activity.
6. Add messages and notifications as real interactive features.
7. Expand profile tabs, lists, and public profiles.
8. Decide whether to fully build reels after the core movie tracking loop works.

