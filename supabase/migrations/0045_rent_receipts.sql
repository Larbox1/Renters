-- Rent receipts (quittances de loyer): one row per generated receipt for a
-- lease, covering a single rental period. The generated PDF snapshot is stored
-- in the `documents` table (source='generated'); document_id links to it so the
-- receipt row keeps its financial breakdown even if the file is later removed.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

create table public.rent_receipts (
  id            uuid        primary key default gen_random_uuid(),
  lease_id      uuid        not null references public.leases    on delete cascade,
  owner_id      uuid        not null references auth.users       on delete cascade,
  document_id   uuid                 references public.documents on delete set null,
  period_start  date        not null,
  period_end    date        not null,
  rent_cents    int         not null default 0,
  charges_cents int         not null default 0,
  total_cents   int         not null default 0,
  created_at    timestamptz not null default now()
);

create index rent_receipts_lease_id_idx on public.rent_receipts(lease_id);
create index rent_receipts_owner_id_idx on public.rent_receipts(owner_id);

alter table public.rent_receipts enable row level security;

-- Owners / admins have full access, mirroring the shared-access model on
-- properties / tenants / leases (migration 0005).
create policy "Owners and admins manage all rent receipts"
  on public.rent_receipts for all
  using (public.is_owner_or_admin())
  with check (public.is_owner_or_admin());

-- A tenant can read the receipts of their own lease (additive, read-only),
-- mirroring the tenant-facing lease policies (migration 0041).
create policy "Tenants select own rent receipts"
  on public.rent_receipts for select
  using (
    exists (
      select 1
      from public.leases l
      join public.tenants t on t.id = l.tenant_id
      where l.id = rent_receipts.lease_id
        and t.auth_user_id = auth.uid()
    )
  );
