-- Calendar events for the dashboard. Returns lease start/end dates
-- visible to the caller, scoped by role:
--   * admin / owner: every lease
--   * tenant       : only leases on their own tenant record (via auth_user_id)
--   * service_provider (no events for now)

create or replace function public.get_my_lease_events(
  range_start date,
  range_end   date
)
returns table (
  event_date date,
  kind       text,   -- 'lease_start' | 'lease_end'
  label      text,   -- counterpart name (tenant name for owner, property label for tenant)
  lease_id   uuid
)
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

  if caller_role in ('admin', 'owner') then
    -- Every lease the team can see.
    return query
    select l.start_date,
           'lease_start'::text,
           coalesce(t.full_name, p.label, p.address),
           l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where l.start_date between range_start and range_end;

    return query
    select l.end_date,
           'lease_end'::text,
           coalesce(t.full_name, p.label, p.address),
           l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where l.end_date is not null
      and l.end_date between range_start and range_end;

  elsif caller_role = 'tenant' then
    -- Only leases on a tenant record linked to this auth user.
    return query
    select l.start_date,
           'lease_start'::text,
           coalesce(p.label, p.address),
           l.id
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    join public.properties p on p.id = l.property_id
    where t.auth_user_id = caller
      and l.start_date between range_start and range_end;

    return query
    select l.end_date,
           'lease_end'::text,
           coalesce(p.label, p.address),
           l.id
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

grant execute on function public.get_my_lease_events(date, date) to authenticated;
