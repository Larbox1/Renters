-- SECURITY: scope get_my_lease_events() to the caller's own portfolio.
--
-- The 0016 version predates the 0058 owner segregation: its 'owner' branch
-- deliberately returned "every lease the team can see" — i.e. EVERY lease,
-- tenant name, and property label/address on the platform, to any caller with
-- role 'owner' (freely self-selectable at signup). SECURITY DEFINER bypasses
-- RLS, so this was a one-request cross-tenant PII dump.
--
-- Fix: split the branch — admins keep the global view, owners are filtered to
-- properties they own (p.owner_id = caller). Tenant branch unchanged.

create or replace function public.get_my_lease_events(range_start date, range_end date)
returns table(event_date date, kind text, label text, lease_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.user_role;
begin
  if caller is null then
    return;
  end if;

  select role into caller_role
  from public.profiles
  where id = caller;

  if caller_role is null then
    return;
  end if;

  if caller_role = 'admin' then
    return query
    select l.start_date, 'lease_start'::text,
           coalesce(t.full_name, p.label, p.address), l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where l.start_date between range_start and range_end;

    return query
    select l.end_date, 'lease_end'::text,
           coalesce(t.full_name, p.label, p.address), l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where l.end_date is not null
      and l.end_date between range_start and range_end;

  elsif caller_role = 'owner' then
    -- Only leases on properties this owner actually owns.
    return query
    select l.start_date, 'lease_start'::text,
           coalesce(t.full_name, p.label, p.address), l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where p.owner_id = caller
      and l.start_date between range_start and range_end;

    return query
    select l.end_date, 'lease_end'::text,
           coalesce(t.full_name, p.label, p.address), l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where p.owner_id = caller
      and l.end_date is not null
      and l.end_date between range_start and range_end;

  elsif caller_role = 'tenant' then
    -- Only leases on a tenant record linked to this auth user.
    return query
    select l.start_date, 'lease_start'::text,
           coalesce(p.label, p.address), l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where t.auth_user_id = caller
      and l.start_date between range_start and range_end;

    return query
    select l.end_date, 'lease_end'::text,
           coalesce(p.label, p.address), l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where t.auth_user_id = caller
      and l.end_date is not null
      and l.end_date between range_start and range_end;
  end if;
  -- service_provider: no events
end;
$$;
