-- Restrict list_users() back to admins only. Owners no longer have access
-- to the users directory.

create or replace function public.list_users()
returns table (
  id uuid,
  email text,
  role public.user_role,
  full_name text,
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
    p.created_at,
    u.last_sign_in_at,
    u.banned_until
  from public.profiles p
  join auth.users u on u.id = p.id
  order by u.created_at desc;
end;
$$;
