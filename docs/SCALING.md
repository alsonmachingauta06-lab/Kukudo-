# Catalogue architecture and scaling notes

## What the code does now
- One `characters` table with stable text IDs, `source` (builtin / community / imported), `moderation_state`, `category`, `tags`, and counters mirrored from `char_stats` (so listing queries need no joins).
- Browsing uses `catalogue_page()` (keyset pagination, max 40 per page) behind `/api/catalogue`. Partial indexes cover published+approved rows by popularity, category+popularity, newest, creator, tags and full-text search (`tsvector` kept up to date by a trigger).
- Images are stored as Storage paths/URLs, never as binaries in rows. Dedupe: unique hash per creator on name+personality. Spam: 20 new characters per user per day (database trigger), request-size and rate limits in the API.
- Reports: one per user per target; 5 distinct open reports auto-hide a community character (state `pending`); admins review at `/admin` (set `profiles.is_admin=true` by SQL as the project owner; users cannot set it themselves).

## What needs more infrastructure as you grow (not built, not tested)
| Need | When | Suggested step |
|---|---|---|
| Shared rate limiting | Before any multi-instance/serverless production use | Redis/Upstash; the current limiter is in-memory per instance |
| Dedicated search | Roughly millions of rows or fuzzy/typo-tolerant ranking | Typesense, Meilisearch, OpenSearch or Algolia fed from the table |
| Read capacity | Heavy browse traffic | Supabase read replicas, CDN caching of anonymous `/api/catalogue` (already sends s-maxage) |
| Counters | Very hot characters | Batch or shard counter updates; the per-row trigger can contend |
| Messages table | Hundreds of millions of rows | Partition by time, archive old conversations |
| Background jobs | Image processing, moderation, reindexing | pg_cron, Supabase Edge Functions, or a queue (QStash, Inngest, SQS) |
| Image delivery | Many portraits | Storage image transformations and a CDN, thumbnails sized for cards |
| Automated moderation | Public user content at scale | A moderation API for text and images, plus human review |
| Costs | Always | Check current pricing for Supabase, OpenRouter, fal.ai and ElevenLabs; AI usage is the largest variable cost |

## Catalogue population
There is no mass generation. Add characters by: user creation, `npm run seed` (starter set), or `npm run catalogue:import -- file.json` for authorised bulk imports (imported rows start as `pending` until approved). `npm run catalogue:export -- out.json` exports everything.
