-- Pixel Purse · M3 initial schema
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run once on a new project.

-- 1. One save file per user (guest or signed in). The app stores its whole state here.
create table if not exists public.saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  -- Goes up by 1 on every save, so two devices can't silently overwrite each other.
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

-- Each user can only see and change their own save file.
create policy "Users read their own save"
  on public.saves for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own save"
  on public.saves for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own save"
  on public.saves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own save"
  on public.saves for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 2. AI parse counter, for the limit of 100 parses a day per user.
--    No policies: users can't read or edit it directly, only through claim_parse() below.
create table if not exists public.parse_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);

alter table public.parse_usage enable row level security;

-- Adds one to today's count for the signed-in user and returns the new total.
create or replace function public.claim_parse()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into public.parse_usage (user_id, day, count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.parse_usage.count + 1
  returning count into n;
  return n;
end;
$$;

revoke all on function public.claim_parse() from public, anon;
grant execute on function public.claim_parse() to authenticated;
