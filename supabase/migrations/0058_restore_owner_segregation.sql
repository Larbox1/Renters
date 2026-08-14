-- Restore per-landlord segregation, reverting the shared-access model of
-- migration 0005: every user with role 'owner' could read AND write every
-- other landlord's properties, tenants, leases — and, through the same
-- is_owner_or_admin() guard, rent receipts (0045), condition reports (0049),
-- property photos (0018) and the get_owner_contact() RPC incl. email/IBAN/BIC
-- (0043/0046).
--
-- New model:
--   * owners:  full CRUD on their own rows only (owner_id = auth.uid();
--              leases scope through the property's owner).
--   * admins:  full CRUD on everything via is_admin() (0017) — the old model
--              only gave admins read, but the back-office edits and reassigns
--              owner_id, so admin needs write too.
--   * tenants: the tenant-facing read policies (0041/0042/0045/0049) are
--              additive and untouched by this migration.
--
-- is_owner_or_admin() itself is kept: it remains a useful "has a landlord-side
-- role" gate, it just no longer substitutes for ownership.

-- ---------- properties ----------
drop policy if exists "Owners and admins manage all properties" on public.properties;

create policy "Owners select own properties"
  on public.properties for select
  using (owner_id = auth.uid());

create policy "Owners insert own properties"
  on public.properties for insert
  with check (owner_id = auth.uid());

create policy "Owners update own properties"
  on public.properties for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners delete own properties"
  on public.properties for delete
  using (owner_id = auth.uid());

create policy "Admins manage all properties"
  on public.properties for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- tenants ----------
drop policy if exists "Owners and admins manage all tenants" on public.tenants;

create policy "Owners select own tenants"
  on public.tenants for select
  using (owner_id = auth.uid());

create policy "Owners insert own tenants"
  on public.tenants for insert
  with check (owner_id = auth.uid());

create policy "Owners update own tenants"
  on public.tenants for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners delete own tenants"
  on public.tenants for delete
  using (owner_id = auth.uid());

create policy "Admins manage all tenants"
  on public.tenants for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- leases (ownership flows through the property) ----------
drop policy if exists "Owners and admins manage all leases" on public.leases;

create policy "Owners select own leases"
  on public.leases for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owners insert own leases"
  on public.leases for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owners update own leases"
  on public.leases for update
  using (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owners delete own leases"
  on public.leases for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Admins manage all leases"
  on public.leases for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- rent_receipts ----------
drop policy if exists "Owners and admins manage all rent receipts" on public.rent_receipts;

create policy "Owners manage own rent receipts"
  on public.rent_receipts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins manage all rent receipts"
  on public.rent_receipts for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- condition_reports ----------
drop policy if exists "Owners and admins manage all condition reports" on public.condition_reports;

create policy "Owners manage own condition reports"
  on public.condition_reports for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins manage all condition reports"
  on public.condition_reports for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- storage: property-photos bucket ----------
-- Objects are stored under <property_id>/<file>, so scope reads to the
-- property's owner (or an admin). The web app reads via the service role and
-- is unaffected; this policy serves the mobile anon client (0018).
drop policy if exists "owners and admins read property photos" on storage.objects;

create policy "owners read own property photos"
  on storage.objects for select
  using (
    bucket_id = 'property-photos'
    and (
      exists (
        select 1 from public.properties p
        where p.id::text = (storage.foldername(name))[1]
          and p.owner_id = auth.uid()
      )
      or public.is_admin()
    )
  );

-- ---------- get_owner_contact ----------
-- 0043 opened this to every owner because properties were shared; with
-- segregation restored, an owner only ever renders their own bailleur block,
-- so lock it to the caller's own row (admins keep access for back-office
-- generation on behalf of any landlord).
drop function if exists public.get_owner_contact(uuid);

create function public.get_owner_contact(p_owner_id uuid)
returns table (
  full_name text,
  first_name text,
  last_name text,
  address text,
  city text,
  postal_code text,
  country text,
  phone text,
  email text,
  iban text,
  bic text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.full_name,
    p.first_name,
    p.last_name,
    p.address,
    p.city,
    p.postal_code,
    p.country,
    p.phone,
    u.email::text,
    p.iban,
    p.bic
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_owner_id
    and (p_owner_id = auth.uid() or public.is_admin());
$$;

grant execute on function public.get_owner_contact(uuid) to authenticated;
