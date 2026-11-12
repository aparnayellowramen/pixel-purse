-- Pixel Purse · delete account (sign-in-flow.md, Flow G)
-- Paste into Supabase → SQL Editor → New query → Run.

-- Deletes the signed-in user's account. Their save file and AI usage rows are
-- removed with it (both tables reference auth.users with "on delete cascade").
-- Runs with elevated rights but only ever touches the caller's own row.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
