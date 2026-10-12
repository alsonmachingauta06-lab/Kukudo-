# Kukudo 💊🐼
1. `npm install`  2. `cp .env.example .env.local` and fill the keys  3. `npm run dev`  4. Deploy on Vercel (add the same env vars).
- Chat: OpenRouter (Claude 3.5 Sonnet, then Llama 3.1 70B, then Gemini Flash free) in app/api/chat/route.ts
- Photos: FLUX.1 schnell on fal.ai (FAL_KEY). Voice: ElevenLabs, falls back to the browser's speechSynthesis.
- Characters, follows and chat counts are stored in the browser for now; supabase/schema.sql is the database you can wire in next.

## Supabase setup
1. Create a project at supabase.com, open SQL Editor, paste and run `supabase/schema.sql`.
2. Put the Project URL and anon key in `.env.local` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).
3. In Authentication > Providers keep Email on (turn off "Confirm email" if you want instant sign-up while testing).
- Logged in: chats, follows, your own characters and real chat counts live in Supabase. Logged out: everything stays in the browser and counts show the starter numbers.

## Backend setup (stage 1)
1. Supabase: run `supabase/schema.sql` once, then `supabase/migrations/002_backend.sql`. Use the project URL and anon key only.
2. OpenRouter: create a key. Set `OPENROUTER_MODELS` to a comma list (first = primary, rest = fallbacks), then run `OPENROUTER_MODELS="..." npm run check:models` to confirm each ID exists.
3. fal.ai: create a key as `FAL_KEY`. ElevenLabs: create a key as `ELEVENLABS_API_KEY`; voice IDs come from lib/characters.ts or the character's `voice_id`.
4. `.env.local` for local, Vercel project env vars for deploy (never NEXT_PUBLIC_ for secrets). Then `npm install && npm run build && npm run dev`.

## Stage 2 (likes, follows, characters, profile pictures)
- After 002, run `supabase/migrations/003_social_and_content.sql` in the Supabase SQL editor.
- New routes: `/api/characters` (POST create, PATCH edit/publish), `/api/profile/avatar`, `/api/image/use`. New page: `/profile`. Editing uses `/create?edit=<id>`.
- Rate limiting is IN-MEMORY per server instance (lib/server.ts). It resets on restart and is not shared between serverless instances. Use a shared store (for example Upstash Redis) before relying on it in production.
- Env variable names (no values here): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENROUTER_API_KEY, OPENROUTER_MODELS, FAL_KEY, ELEVENLABS_API_KEY. Put values only in `.env.local` and your host's secret settings.

## Stage 3 (scalable catalogue and discovery)
Run `supabase/migrations/004_catalogue.sql` after 003, then `supabase/migrations/005_security_hardening.sql`, then `npm run seed` (see docs/SEED.md). Docs: docs/SCALING.md.
New: /api/catalogue, /search, /chats, /character/[id], /creator/[id], /admin, bottom navigation, stop-generation and new-chat in the chat screen.
Still NOT built: multiple conversations per character (chats are unique per user and character), regenerate/retry, cover-image upload, background indexing jobs, automated moderation.
\n## Security hardening update\n- Migration `005_security_hardening.sql` protects moderation state, source provenance, and denormalized catalogue counters from client-side edits. Apply it after migration 004.\n- `npm run check:models` now fails clearly when model IDs are missing or OpenRouter cannot be reached.\n- Catalogue seed/import no longer overwrites an existing character when an incoming record reuses its ID.\n