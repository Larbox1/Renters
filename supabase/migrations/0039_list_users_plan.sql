-- Add the subscription `plan` to the admin users directory (list_users).
-- Postgres can't change a function's return columns with CREATE OR REPLACE,
-- so drop and recreate. Same admin-only guard as 0007.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).

drop function if exists public.list_users();

create function public.list_users()
returns table (
  id uuid,
  email text,
  role public.user_role,
  full_name text,
  plan text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role public.user_role;
begin
  select p.role into caller_role
  from public.profiles p
  where p.id = auth.uid();

  if caller_role is distinct from 'admin' then
    raise exception 'Only admins can list users';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.role,
    p.full_name,
    p.plan,
    p.created_at,
    u.last_sign_in_at,
    u.banned_until
  from public.profiles p
  join auth.users u on u.id = p.id
  order by u.created_at desc;
end;
$$;
