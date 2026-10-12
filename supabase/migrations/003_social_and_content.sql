-- Run after 002_backend.sql. Safe to re-run; existing rows are kept.
create table if not exists builtin_characters(id text primary key);
alter table builtin_characters enable row level security;
drop policy if exists "read builtin" on builtin_characters;
create policy "read builtin" on builtin_characters for select using (true);
insert into builtin_characters(id) values ('luna'),('sophia'),('amara'),('emily'),('yuki'),('gojo'),('naruto'),('miku'),('wednesday'),('kwame'),('mia'),('diego'),('ravi'),('drpill'),('alson'),('nurse'),('ceo'),('maid'),('vampire'),('gym') on conflict do nothing;

create or replace function valid_character(cid text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from builtin_characters where id=cid) or exists(select 1 from characters where id=cid and (is_published or creator_id=auth.uid())) $$;

-- one like / one follow per user per character is enforced by the (user_id, character_id) primary keys
drop policy if exists "own likes" on likes; drop policy if exists "own follows" on follows;
drop policy if exists "likes select own" on likes; drop policy if exists "likes insert own" on likes; drop policy if exists "likes delete own" on likes;
drop policy if exists "follows select own" on follows; drop policy if exists "follows insert own" on follows; drop policy if exists "follows delete own" on follows;
create policy "likes select own" on likes for select using (user_id=auth.uid());
create policy "likes insert own" on likes for insert with check (user_id=auth.uid() and valid_character(character_id));
create policy "likes delete own" on likes for delete using (user_id=auth.uid());
create policy "follows select own" on follows for select using (user_id=auth.uid());
create policy "follows insert own" on follows for insert with check (user_id=auth.uid() and valid_character(character_id));
create policy "follows delete own" on follows for delete using (user_id=auth.uid());

-- characters: owner-only edits, creator and id can never change
drop policy if exists "edit own characters" on characters;
create policy "edit own characters" on characters for update using (creator_id=auth.uid()) with check (creator_id=auth.uid());
create or replace function lock_creator() returns trigger language plpgsql as $$ begin new.creator_id:=old.creator_id; new.id:=old.id; return new; end $$;
drop trigger if exists characters_lock on characters;
create trigger characters_lock before update on characters for each row execute function lock_creator();
do $$ begin
 alter table characters add constraint characters_len check (char_length(name)<=60 and char_length(coalesce(bio,''))<=300 and char_length(personality)<=3000 and char_length(coalesce(greeting,''))<=500) not valid;
exception when duplicate_object then null; end $$;

-- storage: size/type limits and owner-only replace/delete in avatars
update storage.buckets set file_size_limit=2097152, allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='avatars';
update storage.buckets set file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='images';
drop policy if exists "avatars delete own" on storage.objects; drop policy if exists "avatars update own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatars update own" on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
