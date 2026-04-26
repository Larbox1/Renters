-- Admin-facing function to list all users with their auth.users details.
-- The auth schema isn't exposed to PostgREST, so we wrap the join in a
-- security-definer function that internally checks the caller is an admin.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role public.user_role,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can list users';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.role,
    p.full_name,
    p.created_at,
    u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by u.created_at desc;
end;
$$;

-- Anyone authenticated can call it; the function rejects non-admins itself.
grant execute on function public.admin_list_users() to authenticated;
