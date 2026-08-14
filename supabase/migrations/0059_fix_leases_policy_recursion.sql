-- Fix infinite recursion introduced by 0058.
--
-- The owner policies on leases subquery properties, and the tenant-facing
-- policy on properties ("Tenants select leased properties", 0041) subqueries
-- leases — a properties <-> leases cycle Postgres rejects as infinite
-- recursion. (0002's identical lease policies predated 0041, so the cycle
-- didn't exist back then.)
--
-- Same fix as 0017 / is_owner_or_admin: wrap the ownership lookup in a
-- SECURITY DEFINER function so it bypasses RLS instead of re-entering it.

create or replace function public.owns_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.properties
    where id = p_property_id and owner_id = auth.uid()
  );
$$;

grant execute on function public.owns_property(uuid) to authenticated;

drop policy if exists "Owners select own leases" on public.leases;
drop policy if exists "Owners insert own leases" on public.leases;
drop policy if exists "Owners update own leases" on public.leases;
drop policy if exists "Owners delete own leases" on public.leases;

create policy "Owners select own leases"
  on public.leases for select
  using (public.owns_property(property_id));

create policy "Owners insert own leases"
  on public.leases for insert
  with check (public.owns_property(property_id));

create policy "Owners update own leases"
  on public.leases for update
  using (public.owns_property(property_id))
  with check (public.owns_property(property_id));

create policy "Owners delete own leases"
  on public.leases for delete
  using (public.owns_property(property_id));

-- The property-photos storage policy (0058) also subqueries properties, but
-- through a plain text comparison on p.id under properties RLS — no cycle once
-- the leases policies above go through the helper, so it stays as-is.
