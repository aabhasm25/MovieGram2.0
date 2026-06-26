# MovieGram Project Summary

## Overview

MovieGram is a Next.js prototype for a social movie tracking app. The current app presents a mobile phone-style interface with home feed, reels, movie logging, discovery, profile, watchlist, messages, notifications, and movie detail views.

The codebase is currently front-end only. It uses static JavaScript data from `data/movieData.js` and does not include authentication, a database, API routes, server actions, real search, or persistent user-generated content.

## Tech Stack

- Framework: Next.js 16 App Router
- UI: React 19 components
- Styling: global CSS in `app/globals.css`
- Data: static JavaScript exports in `data/movieData.js`
- Package manager: pnpm lockfile is present

## Directory Structure

- `app/`: Next.js route files, root layout, global styles
- `components/`: shared UI components and screen-level components
- `components/screens/`: route-specific screen components
- `data/`: static mock data and lookup helpers
- `node_modules/`, `.next/`, `.pnpm-store/`: generated dependency/build folders

## Routes

| Route | File | Component Rendered | Notes |
| --- | --- | --- | --- |
| `/` | `app/page.js` | `HomePage` -> `AppShell` -> `HomeScreen` | Main social feed and trending rail |
| `/reels` | `app/reels/page.js` | `ReelsPage` -> `AppShell` -> `ReelsScreen` | Static reels-style movie post |
| `/log` | `app/log/page.js` | `LogPage` -> `AppShell` -> `LogScreen` | Client-side mock log form |
| `/explore` | `app/explore/page.js` | `ExplorePage` -> `AppShell` -> `ExploreScreen` | Static discovery grid and curated lists |
| `/profile` | `app/profile/page.js` | `ProfilePage` -> `AppShell` -> `ProfileScreen` | Static user profile |
| `/watchlist` | `app/watchlist/page.js` | `WatchlistPage` -> `AppShell` -> `WatchlistScreen` | Static watchlist collection |
| `/messages` | `app/messages/page.js` | `MessagesPage` -> `AppShell` -> `MessagesScreen` | Static conversation list |
| `/notifications` | `app/notifications/page.js` | `NotificationsPage` -> `AppShell` -> `NotificationsScreen` | Static notification list |
| `/movies/[slug]` | `app/movies/[slug]/page.js` | `MoviePage` -> `AppShell` -> `MovieDetailsScreen` | Dynamic detail route generated from static movie data |

## Generated Movie Detail Paths

The dynamic route `/movies/[slug]` is statically generated from `movies` in `data/movieData.js`.

- `/movies/dune-part-two`
- `/movies/dune`
- `/movies/the-batman`
- `/movies/joker`
- `/movies/interstellar`
- `/movies/the-boys`
- `/movies/house-of-the-dragon`
- `/movies/oppenheimer`
- `/movies/the-shawshank-redemption`
- `/movies/the-godfather`
- `/movies/pulp-fiction`
- `/movies/fight-club`
- `/movies/inception`

Unknown movie slugs call `notFound()`.

## Components

### App Route Components

- `RootLayout` in `app/layout.js`: sets document shell, metadata, and global CSS.
- `HomePage` in `app/page.js`: renders the home route.
- `ReelsPage` in `app/reels/page.js`: renders the reels route.
- `LogPage` in `app/log/page.js`: renders the log route.
- `ExplorePage` in `app/explore/page.js`: renders the explore route.
- `ProfilePage` in `app/profile/page.js`: renders the profile route.
- `WatchlistPage` in `app/watchlist/page.js`: renders the watchlist route.
- `MessagesPage` in `app/messages/page.js`: renders the messages route.
- `NotificationsPage` in `app/notifications/page.js`: renders the notifications route.
- `MoviePage` in `app/movies/[slug]/page.js`: renders one movie detail page by slug.

### Shared Components

- `AppShell` in `components/AppShell.js`: wraps every screen in the phone shell, status bar, top nav, message/notification shortcuts, screen content area, and bottom nav.
- `BottomNav` in `components/BottomNav.js`: primary tab navigation for Home, Reels, Log, Explore, and Profile.
- `Icon` in `components/Icon.js`: local SVG icon switcher for all icon names used by the UI.
- `Avatar` in `components/Avatar.js`: renders styled avatar placeholders using CSS classes.
- `Poster` in `components/Poster.js`: renders a poster card and links to a movie detail page when a matching movie slug is available.

### Screen Components

- `HomeScreen` in `components/screens/HomeScreen.js`: renders friend stories, a trending poster rail, and static feed posts.
- `ReelsScreen` in `components/screens/ReelsScreen.js`: renders one static vertical reel.
- `LogScreen` in `components/screens/LogScreen.js`: renders a mock movie logging form with local `useState` success feedback.
- `ExploreScreen` in `components/screens/ExploreScreen.js`: renders a non-functional search placeholder, category chips, poster grid, and curated list cards.
- `ProfileScreen` in `components/screens/ProfileScreen.js`: renders static profile stats, watchlist link, tabs, and poster grid.
- `WatchlistScreen` in `components/screens/WatchlistScreen.js`: renders static watchlist filters, hero, and saved movie cards.
- `MessagesScreen` in `components/screens/MessagesScreen.js`: renders static conversation rows.
- `NotificationsScreen` in `components/screens/NotificationsScreen.js`: renders static notifications with type-based icons.
- `MovieDetailsScreen` in `components/screens/MovieDetailsScreen.js`: client component for detail view with browser back navigation and non-persistent action buttons.

## Current Navigation Flow

Every main page is rendered inside `AppShell`. `AppShell` provides two navigation areas:

- Top navigation actions:
  - Messages icon links to `/messages`.
  - Notifications icon links to `/notifications`.
- Bottom tab navigation:
  - Home links to `/`.
  - Reels links to `/reels`.
  - Log links to `/log`.
  - Explore links to `/explore`.
  - Profile links to `/profile`.

Movie navigation is handled through the `Poster` component. When a poster has a slug or can resolve a title through `getMovieByTitle`, it links to `/movies/{slug}`.

Specific flows:

- Home feed posters and trending posters open movie detail pages.
- Explore grid posters and curated list posters open movie detail pages.
- Profile poster grid opens movie detail pages.
- Watchlist posters open movie detail pages.
- Profile has a Watchlist button linking to `/watchlist`.
- Movie detail has a Back button using `router.back()`.

The `/watchlist` route sets `activeTab="profile"`, so the Profile tab remains highlighted while viewing the watchlist. The movie detail route sets `activeTab="explore"`, so Explore remains highlighted while viewing movie details.

## Data Storage

All app data is stored in memory as static exports from `data/movieData.js`.

Current exported data:

- `friends`: mock friend profiles with names, handles, and avatar class names.
- `movies`: movie/show records with title, slug, year, score, runtime, genres, poster class, summary, and optional aliases.
- `feed`: static feed activities linked to friends and movies.
- `trending`: static trending items.
- `watchlist`: static saved movie list.
- `conversations`: static message list summaries.
- `notifications`: static notification records.

Current helper functions:

- `getMovieBySlug(slug)`: finds a movie from the static `movies` array.
- `getMovieByTitle(title)`: finds a movie by exact title or alias.

There is no persistence layer. User actions such as logging a movie, pressing Watchlist, marking watched, liking, commenting, sharing, saving, filtering, searching, or messaging do not change stored data. The only stateful behavior found is `LogScreen`, which uses local component state to show a temporary success message after clicking `Log Movie`.

## Missing Functionality Preventing Real Usage

- Authentication and user accounts are missing.
- Real user profiles are missing; the profile screen is hard-coded.
- Database or persistent storage is missing.
- Movie search is not implemented; search boxes are static text placeholders.
- External movie metadata integration is missing.
- Watchlist actions are not functional or persistent.
- Mark as watched is not functional or persistent.
- Movie logging does not save diary entries, ratings, reviews, or dates.
- Rating input is static text and not interactive.
- Feed creation, feed updates, likes, comments, and sharing are not functional.
- Reels are static and have no real video/media upload or playback system.
- Messages show conversation previews only; there are no chat threads, sending, receiving, or read state updates.
- Notifications are static and cannot be marked read, dismissed, or generated from real activity.
- Follow/friend relationships are mocked only.
- Profile tabs are static labels and do not switch content.
- Watchlist and log filters do not switch content.
- Explore category chips do not filter results.
- There is no settings, onboarding, account editing, or privacy control.
- There is no error/loading state design beyond `notFound()` for missing movie slugs.
- There are no automated tests in the current project.
- There is no backend validation, rate limiting, moderation, reporting, or abuse prevention.

## Notable Implementation Details

- `MovieDetailsScreen` is a client component because it uses `useRouter()` for back navigation.
- `LogScreen` is a client component because it uses `useState()`.
- `Poster` is both a display component and a navigation component.
- Poster and avatar visuals are CSS-generated placeholders rather than image assets.
- App UI is highly dependent on global CSS class names.
- Some older CSS selectors reference `i` elements for posters, while current `Poster` renders `div.poster-card`; these appear to be leftover style rules rather than active markup.
- The displayed star characters in `LogScreen` appear encoded incorrectly in the source as `â˜…`.

