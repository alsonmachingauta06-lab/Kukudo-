-- Run after schema.sql. Safe to re-run; keeps existing data.
alter table characters add column if not exists is_published boolean not null default true;
alter table characters add column if not exists backstory text;
alter table characters add column if not exists example_dialogs jsonb default '[]';
alter table characters add column if not exists background text;
alter table profiles add column if not exists avatar_url text;
alter table char_stats add column if not exists like_count bigint default 0;
alter table char_stats add column if not exists follow_count bigint default 0;
alter table messages add column if not exists request_id uuid;
create unique index if not exists messages_request_once on messages(chat_id,request_id,role) where request_id is not null;
create index if not exists messages_chat_id_idx on messages(chat_id,id);

drop policy if exists "read characters" on characters;
create policy "read published or own characters" on characters for select using (is_published or creator_id=auth.uid());

create table if not exists likes(user_id uuid default auth.uid() references auth.users on delete cascade, character_id text, primary key(user_id,character_id));
alter table likes enable row level security;
drop policy if exists "own likes" on likes;
create policy "own likes" on likes for all using (user_id=auth.uid()) with check (user_id=auth.uid());

create table if not exists generated_images(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, character_id text, chat_id uuid references chats(id) on delete set null, path text not null, purpose text check (purpose in ('avatar','chat','background')), prompt text, created_at timestamptz default now());
alter table generated_images enable row level security;
drop policy if exists "own images" on generated_images;
create policy "own images" on generated_images for all using (user_id=auth.uid()) with check (user_id=auth.uid());

create or replace function bump_stat() returns trigger language plpgsql security definer set search_path=public as $$
declare cid text; d int;
begin if tg_op='INSERT' then cid:=new.character_id; d:=1; else cid:=old.character_id; d:=-1; end if;
insert into char_stats(character_id) values(cid) on conflict do nothing;
if tg_table_name='likes' then update char_stats set like_count=greatest(0,coalesce(like_count,0)+d) where character_id=cid;
else update char_stats set follow_count=greatest(0,coalesce(follow_count,0)+d) where character_id=cid; end if;
return null; end $$;
drop trigger if exists likes_stat on likes; create trigger likes_stat after insert or delete on likes for each row execute function bump_stat();
drop trigger if exists follows_stat on follows; create trigger follows_stat after insert or delete on follows for each row execute function bump_stat();
insert into char_stats(character_id) select distinct character_id from follows on conflict do nothing;
update char_stats s set follow_count=(select count(*) from follows f where f.character_id=s.character_id);

insert into storage.buckets(id,name,public) values('images','images',false),('avatars','avatars',true) on conflict do nothing;
drop policy if exists "images read own" on storage.objects; drop policy if exists "images write own" on storage.objects;
drop policy if exists "avatars read" on storage.objects; drop policy if exists "avatars write own" on storage.objects;
create policy "images read own" on storage.objects for select to authenticated using (bucket_id='images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "images write own" on storage.objects for insert to authenticated with check (bucket_id='images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatars read" on storage.objects for select using (bucket_id='avatars');
create policy "avatars write own" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
