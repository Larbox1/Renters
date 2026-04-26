-- Drop the per-owner segregation introduced by migration 0002.
-- Any user with role 'owner' or 'admin' now has full CRUD on every row in
-- properties, tenants, and leases. The owner_id column remains as a
-- "created by" attribution but no longer restricts access.

-- Helper: is the current user an owner or an admin?
create or replace function public.is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_owner_or_admin() to authenticated;

-- ---------- properties ----------
drop policy if exists "Owners select own properties" on public.properties;
drop policy if exists "Owners insert own properties" on public.properties;
drop policy if exists "Owners update own properties" on public.properties;
drop policy if exists "Owners delete own properties" on public.properties;
drop policy if exists "Admins read all properties" on public.properties;

create policy "Owners and admins manage all properties"
  on public.properties for all
  using (public.is_owner_or_admin())
  with check (public.is_owner_or_admin());

-- ---------- tenants ----------
drop policy if exists "Owners select own tenants" on public.tenants;
drop policy if exists "Owners insert own tenants" on public.tenants;
drop policy if exists "Owners update own tenants" on public.tenants;
drop policy if exists "Owners delete own tenants" on public.tenants;
drop policy if exists "Admins read all tenants" on public.tenants;

create policy "Owners and admins manage all tenants"
  on public.tenants for all
  using (public.is_owner_or_admin())
  with check (public.is_owner_or_admin());

-- ---------- leases ----------
drop policy if exists "Owners select own leases" on public.leases;
drop policy if exists "Owners insert own leases" on public.leases;
drop policy if exists "Owners update own leases" on public.leases;
drop policy if exists "Owners delete own leases" on public.leases;
drop policy if exists "Admins read all leases" on public.leases;

create policy "Owners and admins manage all leases"
  on public.leases for all
  using (public.is_owner_or_admin())
  with check (public.is_owner_or_admin());
