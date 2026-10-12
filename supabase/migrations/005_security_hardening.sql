-- Kukudo security hardening. Run after 004_catalogue.sql.
-- Client roles may edit character content, but never system-owned catalogue fields.
-- Safe to re-run; preserves existing character data.

create or replace function protect_character_system_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      -- Public clients can create community characters, never claim built-in/imported provenance.
      new.source := 'community';
      new.moderation_state := 'approved';
      new.chat_count := 0;
      new.like_count := 0;
      new.follow_count := 0;
      new.popularity := 0;
    else
      -- Moderation, provenance and denormalized counters are controlled by trusted server code.
      new.id := old.id;
      new.creator_id := old.creator_id;
      new.source := old.source;
      new.moderation_state := old.moderation_state;
      new.chat_count := old.chat_count;
      new.like_count := old.like_count;
      new.follow_count := old.follow_count;
      new.popularity := old.popularity;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists characters_protect_fields_t on public.characters;
create trigger characters_protect_fields_t
before insert or update on public.characters
for each row execute function protect_character_system_fields();

-- Only authenticated users can submit reports; users cannot change report ownership or status.
drop policy if exists "report insert" on public.reports;
create policy "report insert" on public.reports
for insert to authenticated
with check (reporter_id = auth.uid() and status = 'open');

-- Admin-only moderation changes continue through moderate_character().
