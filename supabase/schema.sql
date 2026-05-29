create extension if not exists pgcrypto;

create table if not exists public.love_sites (
  id text primary key,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.love_site_members (
  site_id text not null references public.love_sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (site_id, user_id)
);

create table if not exists public.love_memories (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.love_sites(id) on delete cascade,
  memory_date date not null,
  title text not null,
  body text not null,
  photo_urls text[] not null default '{}',
  hidden_note text not null default '',
  unlock_at timestamptz,
  constellation_x numeric not null default 50,
  constellation_y numeric not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.love_diary_entries (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.love_sites(id) on delete cascade,
  entry_date timestamptz not null default now(),
  title text not null,
  note text not null,
  mood text not null default 'soft',
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.love_reminders (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.love_sites(id) on delete cascade,
  reminder_date date not null,
  title text not null,
  note text not null,
  kind text not null default 'care',
  created_at timestamptz not null default now()
);

create table if not exists public.love_messages (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.love_sites(id) on delete cascade,
  author text not null check (author in ('me', 'her')),
  body text not null default '',
  reaction text,
  image_url text,
  voice_url text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.love_sites enable row level security;
alter table public.love_site_members enable row level security;
alter table public.love_memories enable row level security;
alter table public.love_diary_entries enable row level security;
alter table public.love_reminders enable row level security;
alter table public.love_messages enable row level security;

drop policy if exists "members can see their love sites" on public.love_sites;
drop policy if exists "members can see memberships" on public.love_site_members;
drop policy if exists "members can read memories" on public.love_memories;
drop policy if exists "members can write memories" on public.love_memories;
drop policy if exists "members can read diary" on public.love_diary_entries;
drop policy if exists "members can write diary" on public.love_diary_entries;
drop policy if exists "members can read reminders" on public.love_reminders;
drop policy if exists "members can write reminders" on public.love_reminders;
drop policy if exists "members can read messages" on public.love_messages;
drop policy if exists "members can write messages" on public.love_messages;

create or replace function public.is_love_site_member(target_site_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.love_site_members
    where site_id = target_site_id
      and user_id = auth.uid()
  );
$$;

create policy "members can see their love sites"
on public.love_sites
for select
to authenticated
using (public.is_love_site_member(id));

create policy "members can see memberships"
on public.love_site_members
for select
to authenticated
using (user_id = auth.uid());

create policy "members can read memories"
on public.love_memories
for select
to authenticated
using (public.is_love_site_member(site_id));

create policy "members can write memories"
on public.love_memories
for all
to authenticated
using (public.is_love_site_member(site_id))
with check (public.is_love_site_member(site_id));

create policy "members can read diary"
on public.love_diary_entries
for select
to authenticated
using (public.is_love_site_member(site_id));

create policy "members can write diary"
on public.love_diary_entries
for all
to authenticated
using (public.is_love_site_member(site_id))
with check (public.is_love_site_member(site_id));

create policy "members can read reminders"
on public.love_reminders
for select
to authenticated
using (public.is_love_site_member(site_id));

create policy "members can write reminders"
on public.love_reminders
for all
to authenticated
using (public.is_love_site_member(site_id))
with check (public.is_love_site_member(site_id));

create policy "members can read messages"
on public.love_messages
for select
to authenticated
using (public.is_love_site_member(site_id));

create policy "members can write messages"
on public.love_messages
for all
to authenticated
using (public.is_love_site_member(site_id))
with check (public.is_love_site_member(site_id));

grant usage on schema public to authenticated;
grant select on public.love_sites, public.love_site_members to authenticated;
grant select, insert, update, delete on
  public.love_memories,
  public.love_diary_entries,
  public.love_reminders,
  public.love_messages
to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.love_memories;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.love_diary_entries;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.love_reminders;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.love_messages;
exception
  when duplicate_object then null;
end $$;
