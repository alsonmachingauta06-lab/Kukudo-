# Starter catalogue
`seed/starter.json` has 32 complete original characters (20 earlier built-ins plus 12 new: Elara, Brakka, Orion-7, Ines, Theo, Marisol, Jax, Pixel, Rook, Amelia, Lucien, Nova), each with bio, personality, backstory, greeting, example dialogue, conversation starters, tags, category and voice ID.
Run (values only in your own shell, never in chat or git):
`NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed`
It upserts by ID, so it is safe to re-run. Public figures are not included; historical characters are labelled fictional.
