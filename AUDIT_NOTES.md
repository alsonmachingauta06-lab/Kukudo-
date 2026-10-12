# Kukudo security and script audit (2026-10-12)

## Changes in this patch
- Added `supabase/migrations/005_security_hardening.sql`.
  - Authenticated/anonymous clients cannot set character provenance (`source`), moderation state, denormalized chat/like/follow counters, popularity, character ID, or creator ID through direct table writes.
  - Character system fields are still available to trusted server-side/admin operations.
  - Report submission policy is restricted to authenticated users creating reports as themselves with status `open`.
- Hardened `scripts/check-models.mjs`:
  - Validates `OPENROUTER_MODELS` is configured.
  - Handles network errors, non-2xx responses, invalid JSON, and unexpected response structure.
  - Exits non-zero when a configured model ID is missing.
- Hardened `scripts/catalogue.mjs`:
  - Seed/import no longer overwrite an existing row when an incoming record reuses its ID.
  - Handles content-hash duplicate conflicts per row instead of failing an entire batch.
- Updated README migration order.

## Checks actually run
- `node --check scripts/catalogue.mjs`: PASS
- `node --check scripts/check-models.mjs`: PASS
- Seed JSON: 32 rows, unique IDs, category and text-length limits: PASS
- `scripts/check-models.mjs` without `OPENROUTER_MODELS`: expected configuration error and exit code 1: PASS

## Not run / not verified
- `npm install`, TypeScript check, and `npm run build`: NOT RUN (dependencies are not installed in this workspace; network access is unavailable).
- Supabase SQL migration execution, RLS tests with separate user/admin accounts, and live API tests: NOT RUN (no connected database credentials).
- OpenRouter live model lookup: NOT RUN (requires network access).

## Required next verification
1. Back up the Supabase project.
2. Run `supabase/migrations/005_security_hardening.sql` after migration 004.
3. Test as an ordinary user that updating `source`, `moderation_state`, `creator_id`, counters, and `popularity` has no effect; verify an admin can still moderate through `moderate_character`.
4. Run `npm install`, `npm run build`, and integration tests in a network-enabled environment.
