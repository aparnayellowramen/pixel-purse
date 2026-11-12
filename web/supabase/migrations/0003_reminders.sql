-- Pixel Purse · daily reminders (PRD US-8)
-- Paste into Supabase → SQL Editor → New query → Run.
-- Then run the separate one-time setup snippet (it contains your secret, so it isn't in this repo).

-- 1. One row per device that turned reminders on.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  remind_at  time not null default '20:00',
  -- The device's time zone, e.g. "America/Toronto", so 8 pm means 8 pm where the user is.
  tz         text not null default 'UTC',
  last_sent  date,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users read their own reminders"
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own reminders"
  on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users change their own reminders"
  on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own reminders"
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 2. Private settings (not reachable through the API). Holds the scheduler's secret.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.settings (
  key   text primary key,
  value text not null
);
-- A second lock: no policies, so API roles can't read it even if the schema were exposed.
-- The functions below still can, because they run as the table's owner.
alter table private.settings enable row level security;

-- 3. Called by the app's sender every 15 minutes. Returns the devices whose reminder time has
--    passed today (in their own time zone), skipping users who already logged today, and
--    marks them as sent so nobody gets two reminders in a day.
create or replace function public.claim_due_reminders(p_secret text)
returns table (endpoint text, p256dh text, auth text, streak integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or p_secret is distinct from (select value from private.settings where key = 'cron_secret') then
    raise exception 'forbidden';
  end if;

  return query
  with due as (
    select s.endpoint as ep, (now() at time zone s.tz)::date as local_day
    from public.push_subscriptions s
    where (now() at time zone s.tz)::time >= s.remind_at
      and (s.last_sent is null or s.last_sent < (now() at time zone s.tz)::date)
      and not exists (
        select 1 from public.saves sv
        where sv.user_id = s.user_id
          and sv.state -> 'month' ->> 'key' = to_char(now() at time zone s.tz, 'YYYY-MM')
          and (sv.state ->> 'lastLogDay')::int = extract(day from now() at time zone s.tz)::int
      )
  )
  update public.push_subscriptions p
     set last_sent = due.local_day
    from due
   where p.endpoint = due.ep
  returning p.endpoint, p.p256dh, p.auth,
            coalesce((select (sv.state ->> 'streak')::int from public.saves sv where sv.user_id = p.user_id), 0);
end;
$$;

-- 4. Called by the sender when the browser's push service says a subscription is gone.
create or replace function public.remove_push_subscription(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or p_secret is distinct from (select value from private.settings where key = 'cron_secret') then
    raise exception 'forbidden';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

-- The secret check above is what protects these, so the sender can call them with the public key.
revoke all on function public.claim_due_reminders(text) from public;
revoke all on function public.remove_push_subscription(text, text) from public;
grant execute on function public.claim_due_reminders(text) to anon, authenticated;
grant execute on function public.remove_push_subscription(text, text) to anon, authenticated;
