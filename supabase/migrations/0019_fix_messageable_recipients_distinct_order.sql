-- Fix Postgres "for SELECT DISTINCT, ORDER BY expressions must appear in
-- select list" error in messageable_recipients.
--
-- The original 0008 selects u.email::text but orders by bare u.email; with
-- DISTINCT, Postgres treats those as different expressions and rejects the
-- query. Casting u.email to text in ORDER BY (matching the SELECT list) fixes
-- it. The query body is otherwise identical to 0008.

create or replace function public.messageable_recipients()
returns table (
  id        uuid,
  full_name text,
  email     text,
  role      public.user_role
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  caller uuid := auth.uid();
  caller_role public.user_role;
begin
  if caller is null then
    return;
  end if;

  select p.role into caller_role from public.profiles p where p.id = caller;
  if caller_role is null then
    return;
  end if;

  if caller_role = 'admin' then
    return query
    select p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id <> caller
    order by p.role, p.full_name nulls last, u.email::text;

  elsif caller_role = 'owner' then
    return query
    select distinct p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id <> caller
      and (
        p.role = 'admin'
        or p.id in (
          select t.auth_user_id from public.tenants t
          where t.owner_id = caller and t.auth_user_id is not null
        )
      )
    order by p.role, p.full_name nulls last, u.email::text;

  elsif caller_role = 'tenant' then
    return query
    select distinct p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id <> caller
      and (
        p.role = 'admin'
        or p.id in (
          select t.owner_id from public.tenants t
          where t.auth_user_id = caller
        )
      )
    order by p.role, p.full_name nulls last, u.email::text;

  elsif caller_role = 'service_provider' then
    -- Service providers can only message admins.
    return query
    select p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'admin' and p.id <> caller
    order by p.full_name nulls last, u.email::text;
  end if;
end;
$$;

grant execute on function public.messageable_recipients() to authenticated;
