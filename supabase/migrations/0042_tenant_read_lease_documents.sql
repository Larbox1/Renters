-- Let a tenant user read the documents shown on the "My Lease" screen: the
-- generated contracts attached to their lease (documents.lease_id) and the
-- documents the owner uploaded against the leased property (documents.property_id).
-- A tenant record is linked to an auth user via tenants.auth_user_id
-- (migration 0006); this additive, read-only SELECT policy combines (OR) with
-- the existing owner/admin policies and grants no write access.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).

create policy "Tenants select lease documents"
  on public.documents for select
  using (
    exists (
      select 1
      from public.leases l
      join public.tenants t on t.id = l.tenant_id
      where t.auth_user_id = auth.uid()
        and (
          documents.lease_id = l.id
          or documents.property_id = l.property_id
        )
    )
  );
