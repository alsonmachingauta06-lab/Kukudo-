-- Run after 003. Safe to re-run; existing rows are preserved.
-- 1) Catalogue columns
alter table characters add column if not exists category text not null default 'human' check (category in ('human','anime','fantasy','scifi','virtual-ai','romance','adventure','gaming','historical','mentor'));
alter table characters add column if not exists source text not null default 'community' check (source in ('builtin','community','imported'));
alter table characters add column if not exists moderation_state text not null default 'approved' check (moderation_state in ('approved','pending','removed'));
alter table characters add column if not exists conversation_starters jsonb not null default '[]';
alter table characters add column if not exists scenario text;
alter table characters add column if not exists memory_notes text;
alter table characters add column if not exists content_hash text;
alter table characters add column if not exists search_tsv tsvector;
alter table characters add column if not exists chat_count bigint not null default 0;
alter table characters add column if not exists like_count bigint not null default 0;
alter table characters add column if not exists follow_count bigint not null default 0;
alter table characters add column if not exists popularity bigint not null default 0;
alter table profiles add column if not exists is_admin boolean not null default false;
alter table chats add column if not exists title text check (title is null or char_length(title)<=80);
alter table chats add column if not exists updated_at timestamptz default now();

-- 2) Derived search text, dedupe hash, daily creation cap (spam guard)
create or replace function characters_derive() returns trigger language plpgsql as $$
begin
 new.search_tsv:=to_tsvector('simple',coalesce(new.name,'')||' '||coalesce(new.bio,'')||' '||coalesce(array_to_string(new.tags,' '),'')||' '||coalesce(new.category,'')||' '||left(coalesce(new.personality,''),500));
 if tg_op='INSERT' then
  new.content_hash:=md5(lower(trim(new.name))||'|'||lower(trim(coalesce(new.personality,''))));
  if new.creator_id is not null and (select count(*) from characters where creator_id=new.creator_id and created_at>now()-interval '1 day')>=20 then
   raise exception 'daily character limit reached' using errcode='P0001'; end if;
 end if; return new; end $$;
drop trigger if exists characters_derive_t on characters;
create trigger characters_derive_t before insert or update on characters for each row execute function characters_derive();
update characters set name=name where search_tsv is null;
create unique index if not exists characters_dedupe on characters(coalesce(creator_id,'00000000-0000-0000-0000-000000000000'::uuid),content_hash) where content_hash is not null;

-- 3) Counters mirrored from char_stats so listing queries never join
create or replace function sync_char_counts() returns trigger language plpgsql security definer set search_path=public as $$
begin update characters set chat_count=coalesce(new.chat_count,0),like_count=coalesce(new.like_count,0),follow_count=coalesce(new.follow_count,0),
 popularity=coalesce(new.chat_count,0)+3*coalesce(new.like_count,0)+2*coalesce(new.follow_count,0) where id=new.character_id; return null; end $$;
drop trigger if exists char_stats_sync on char_stats;
create trigger char_stats_sync after insert or update on char_stats for each row execute function sync_char_counts();
update characters c set chat_count=s.chat_count,like_count=coalesce(s.like_count,0),follow_count=coalesce(s.follow_count,0),popularity=s.chat_count+3*coalesce(s.like_count,0)+2*coalesce(s.follow_count,0) from char_stats s where s.character_id=c.id;

-- 4) Indexes for the catalogue queries (all partial on published + approved)
create index if not exists ch_pop on characters(popularity desc,id desc) where is_published and moderation_state='approved';
create index if not exists ch_cat_pop on characters(category,popularity desc,id desc) where is_published and moderation_state='approved';
create index if not exists ch_new on characters(created_at desc,id desc) where is_published and moderation_state='approved';
create index if not exists ch_creator on characters(creator_id,created_at desc);
create index if not exists ch_search on characters using gin(search_tsv) where is_published and moderation_state='approved';
create index if not exists ch_tags on characters using gin(tags);
create index if not exists chats_user_recent on chats(user_id,updated_at desc);

-- 5) Visibility
drop policy if exists "read published or own characters" on characters;
create policy "read published or own characters" on characters for select using ((is_published and moderation_state='approved') or creator_id=auth.uid());
create or replace function valid_character(cid text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from builtin_characters where id=cid) or exists(select 1 from characters where id=cid and moderation_state='approved' and (is_published or creator_id=auth.uid())) $$;
drop policy if exists "public creator profile" on profiles;
create policy "public creator profile" on profiles for select using (exists(select 1 from characters c where c.creator_id=profiles.id and c.is_published and c.moderation_state='approved'));

-- 6) Users cannot make themselves admin
create or replace function protect_admin() returns trigger language plpgsql as $$
begin if current_user in ('authenticated','anon') then
  if tg_op='INSERT' then new.is_admin:=false; else new.is_admin:=old.is_admin; end if; end if; return new; end $$;
drop trigger if exists profiles_protect on profiles;
create trigger profiles_protect before insert or update on profiles for each row execute function protect_admin();

-- 7) Blocks, reports, moderation
create table if not exists user_blocks(user_id uuid default auth.uid() references auth.users on delete cascade, creator_id uuid references auth.users on delete cascade, primary key(user_id,creator_id), check (user_id<>creator_id));
alter table user_blocks enable row level security;
drop policy if exists "own blocks" on user_blocks; create policy "own blocks" on user_blocks for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create table if not exists reports(id bigserial primary key, reporter_id uuid not null default auth.uid() references auth.users on delete cascade, target_type text not null check (target_type in ('character','message','user')), target_id text not null check (char_length(target_id)<=64),
 reason text not null check (reason in ('spam','sexual_content','harassment','impersonation','illegal','other')), details text check (details is null or char_length(details)<=500), status text not null default 'open' check (status in ('open','actioned','dismissed')), created_at timestamptz default now(), unique(reporter_id,target_type,target_id));
alter table reports enable row level security;
drop policy if exists "report insert" on reports; drop policy if exists "report read own" on reports; drop policy if exists "admins read reports" on reports; drop policy if exists "admins update reports" on reports;
create policy "report insert" on reports for insert with check (reporter_id=auth.uid());
create policy "report read own" on reports for select using (reporter_id=auth.uid());
create policy "admins read reports" on reports for select using (exists(select 1 from profiles where id=auth.uid() and is_admin));
create policy "admins update reports" on reports for update using (exists(select 1 from profiles where id=auth.uid() and is_admin)) with check (exists(select 1 from profiles where id=auth.uid() and is_admin));
create or replace function report_autohide() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.target_type='character' and (select count(distinct reporter_id) from reports where target_type='character' and target_id=new.target_id and status='open')>=5 then
 update characters set moderation_state='pending' where id=new.target_id and source='community'; end if; return null; end $$;
drop trigger if exists reports_autohide on reports; create trigger reports_autohide after insert on reports for each row execute function report_autohide();
create or replace function moderate_character(cid text,state text) returns void language plpgsql security definer set search_path=public as $$
begin if not exists(select 1 from profiles where id=auth.uid() and is_admin) then raise exception 'not allowed'; end if;
 if state not in ('approved','pending','removed') then raise exception 'bad state'; end if;
 update characters set moderation_state=state where id=cid; end $$;
revoke all on function moderate_character(text,text) from public; grant execute on function moderate_character(text,text) to authenticated;

-- 8) Conversation recency
create or replace function touch_chat() returns trigger language plpgsql security definer set search_path=public as $$ begin update chats set updated_at=now() where id=new.chat_id; return null; end $$;
drop trigger if exists messages_touch on messages; create trigger messages_touch after insert on messages for each row execute function touch_chat();

-- 9) Keyset-paginated catalogue query (security invoker: RLS still applies)
create or replace function catalogue_page(p_sort text default 'popular',p_category text default null,p_q text default null,p_creator uuid default null,p_following boolean default false,p_cursor text default null,p_cursor_id text default null,p_limit int default 24)
returns table(id text,name text,bio text,tags text[],category text,avatar text,cover text,creator_id uuid,source text,chat_count bigint,like_count bigint,follow_count bigint,popularity bigint,created_at timestamptz)
language plpgsql stable security invoker set search_path=public as $$
#variable_conflict use_column
declare tsq tsquery; lim int:=least(greatest(coalesce(p_limit,24),1),40);
begin
 if p_q is not null and length(trim(p_q))>0 then tsq:=to_tsquery('simple',p_q); end if;
 if p_sort='new' then
  return query select c.id,c.name,c.bio,c.tags,c.category,c.avatar,c.background,c.creator_id,c.source,c.chat_count,c.like_count,c.follow_count,c.popularity,c.created_at from characters c
   where c.is_published and c.moderation_state='approved' and (p_category is null or c.category=p_category) and (p_creator is null or c.creator_id=p_creator) and (tsq is null or c.search_tsv@@tsq)
   and (not p_following or exists(select 1 from follows f where f.user_id=auth.uid() and f.character_id=c.id))
   and not exists(select 1 from user_blocks b where b.user_id=auth.uid() and b.creator_id=c.creator_id)
   and (p_cursor is null or (c.created_at,c.id)<(p_cursor::timestamptz,p_cursor_id)) order by c.created_at desc,c.id desc limit lim+1;
 else
  return query select c.id,c.name,c.bio,c.tags,c.category,c.avatar,c.background,c.creator_id,c.source,c.chat_count,c.like_count,c.follow_count,c.popularity,c.created_at from characters c
   where c.is_published and c.moderation_state='approved' and (p_category is null or c.category=p_category) and (p_creator is null or c.creator_id=p_creator) and (tsq is null or c.search_tsv@@tsq)
   and (p_sort<>'trending' or c.created_at>now()-interval '30 days')
   and (not p_following or exists(select 1 from follows f where f.user_id=auth.uid() and f.character_id=c.id))
   and not exists(select 1 from user_blocks b where b.user_id=auth.uid() and b.creator_id=c.creator_id)
   and (p_cursor is null or (c.popularity,c.id)<(p_cursor::bigint,p_cursor_id)) order by c.popularity desc,c.id desc limit lim+1;
 end if; end $$;
