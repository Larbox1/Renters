-- Let a tenant user read their own lease for the tenant-facing "My Lease"
-- screen. A tenant record is linked to an auth user via tenants.auth_user_id
-- (migration 0006), so these additive SELECT policies expose only the rows that
-- belong to the signed-in tenant: their own tenant record, the leases pointing
-- at it, and the properties those leases reference. They combine (OR) with the
-- existing owner/admin policies and grant no write access.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).

-- The tenant's own record (needed for the joined tenants(...) select).
create policy "Tenants select own record"
  on public.tenants for select
  using (auth_user_id = auth.uid());

-- Leases attached to the tenant's own record.
create policy "Tenants select own leases"
  on public.leases for select
  using (
    exists (
      select 1 from public.tenants t
      where t.id = leases.tenant_id
        and t.auth_user_id = auth.uid()
    )
  );

-- Properties referenced by the tenant's own leases (for the joined
-- properties(...) select and the property card).
create policy "Tenants select leased properties"
  on public.properties for select
  using (
    exists (
      select 1
      from public.leases l
      join public.tenants t on t.id = l.tenant_id
      where l.property_id = properties.id
        and t.auth_user_id = auth.uid()
    )
  );
