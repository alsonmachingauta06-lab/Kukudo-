# Kukudo deployment notes

## Safe first preview on Vercel

1. Create a separate GitHub repository named `kukudo` and keep it private during initial setup.
2. Upload the contents of this project (the `kukudo/` directory contents, not its parent) to the repository root.
3. Do not upload `.env`, `.env.local`, provider keys, access tokens, or any Supabase service-role key. `.gitignore` excludes environment files.
4. In Vercel, Add New → Project → import the new `kukudo` repository. Framework preset: Next.js. Root directory: `.`. Build command: `npm run build`; install command: `npm install`.
5. Add the variables listed in `.env.example` in Vercel Project Settings → Environment Variables. Never expose `SUPABASE_SERVICE_ROLE_KEY` as a `NEXT_PUBLIC_` variable. The service-role key is used only for manual catalogue seed/import scripts and should not be added to Vercel for the initial web preview unless a server-side feature explicitly requires it.
6. Supabase database migrations have not been executed by this deployment package. Apply `supabase/schema.sql` followed by migrations 002, 003, 004, and 005 in the stated order in the Supabase SQL editor before expecting server-backed catalogue/auth features to work.
7. Deploy, then test the home page, authentication, catalogue/search, chat, image generation, and profile. Without provider variables, AI chat and image generation will return a configuration error, not real results.

## Current honest scope

- Seed catalogue currently contains 32 characters in `seed/starter.json`.
- This package does not contain one million stored character records or millions of unique character background images.
- The source contains catalogue pagination/search and database migration scaffolding, but scalability, RLS, production build, and database migrations need real-environment verification before claiming production readiness.
