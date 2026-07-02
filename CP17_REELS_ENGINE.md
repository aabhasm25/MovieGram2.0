# CP17 Reels Engine

MovieGram Reels should ingest once and serve from Supabase. Normal users opening or scrolling Reels should read approved playable `reel_cache` rows first, then show poster/backdrop previews only when no playable cached source exists.

## Safety Rules

- Do not scrape YouTube, Instagram, Facebook, Google, Bing, Brave, or social pages.
- Do not download, extract, or rehost video files.
- Do not use `yt-dlp`.
- Do not expose service-role or discovery-provider keys to the browser.
- Do not run external discovery from normal user scrolling.
- Store metadata/source URLs only. Playback uses official embeds or opens the original source URL.

## Feed Architecture

1. Build tab candidates from MovieGram data.
2. Read `reel_cache`.
3. Serve approved playable cached rows first.
4. For You may fill from global high-quality cache rows.
5. Watched only uses current watched `item_key`s.
6. Friends only uses friend-related allowed activity.
7. Poster fallbacks render only when no playable cached row exists for the tab/title.

## SQL

Review and run manually if needed:

```text
supabase/reels_discovery_engine.sql
```

It creates:

- `creator_sources`
- `reel_candidates`
- `discovery_jobs`
- `reel_failures`

The app does not execute this SQL automatically.

## Admin Discovery Route

Protected route:

```text
POST /api/admin/reel-discovery
```

Required server env:

```text
ADMIN_BACKFILL_SECRET
```

Optional server env:

```text
SUPABASE_SERVICE_ROLE_KEY
YOUTUBE_API_KEY
GOOGLE_SEARCH_API_KEY
GOOGLE_SEARCH_ENGINE_ID
BING_SEARCH_API_KEY
BRAVE_SEARCH_API_KEY
```

TMDB dry run:

```bash
curl -X POST http://localhost:3000/api/admin/reel-discovery \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_BACKFILL_SECRET" \
  -d "{\"source\":\"tmdb\",\"target\":25,\"dryRun\":true}"
```

Manual URL candidate dry run:

```bash
curl -X POST http://localhost:3000/api/admin/reel-discovery \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_BACKFILL_SECRET" \
  -d "{\"source\":\"manual\",\"dryRun\":true,\"urls\":[\"https://www.youtube.com/watch?v=VIDEO_ID\"]}"
```

Use `dryRun:false` only after the SQL foundation exists. Use `promote:true` only for trusted reviewed candidates.

## Promotion

Candidates should be promoted to `reel_cache` only when:

- the source URL/video ID exists,
- the candidate is approved or from a trusted high-score source,
- it matches the linked MovieGram title well enough,
- it is not already known failed,
- it does not look like spam/piracy/full-movie content.

## Verification Queries

Playable approved cache count:

```sql
select count(*)
from public.reel_cache
where coalesce(approved, true) is true
  and (
    playable is true
    or source_video_id is not null
    or source_url is not null
    or watch_url is not null
    or embed_url is not null
  );
```

Duplicate YouTube IDs:

```sql
select source, source_video_id, count(*)
from public.reel_cache
where source_video_id is not null
group by source, source_video_id
having count(*) > 1;
```

Discovery job status:

```sql
select status, provider, count(*)
from public.discovery_jobs
group by status, provider
order by status, provider;
```

## Current Local Backfill

The existing local TMDB backfill script remains the safe way to grow YouTube playable cache without YouTube Search quota:

```bash
npm run backfill:reels -- --target=300 --pages=20
```

This uses TMDB videos metadata and stores YouTube embed/source URLs. It does not call YouTube Search.
