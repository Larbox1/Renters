-- Condition reports (états des lieux d'entrée / de sortie): one row per report
-- for a lease. The walkthrough data (rooms, meters, keys) lives in JSONB and is
-- edited while status='draft'; completing the report freezes it and renders a
-- PDF snapshot stored in `documents` (source='generated') — document_id links
-- to it, so the structured data survives even if the file is later removed.
-- A move-out report carries each element's move-in state (entry_condition)
-- inside its rooms payload for the side-by-side legal comparison.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

create table public.condition_reports (
  id           uuid        primary key default gen_random_uuid(),
  lease_id     uuid        not null references public.leases    on delete cascade,
  owner_id     uuid        not null references auth.users       on delete cascade,
  document_id  uuid                 references public.documents on delete set null,
  type         text        not null check (type in ('move_in', 'move_out')),
  status       text        not null default 'draft'
                           check (status in ('draft', 'completed')),
  report_date  date        not null default current_date,
  meters       jsonb       not null default '{}'::jsonb,
  keys         jsonb       not null default '[]'::jsonb,
  rooms        jsonb       not null default '[]'::jsonb,
  notes        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index condition_reports_lease_id_idx on public.condition_reports(lease_id);
create index condition_reports_owner_id_idx on public.condition_reports(owner_id);

alter table public.condition_reports enable row level security;

-- Owners / admins have full access, mirroring the shared-access model on
-- properties / tenants / leases (migration 0005) and rent_receipts (0045).
create policy "Owners and admins manage all condition reports"
  on public.condition_reports for all
  using (public.is_owner_or_admin())
  with check (public.is_owner_or_admin());

-- A tenant can read the reports of their own lease (additive, read-only),
-- mirroring the tenant-facing lease policies (migration 0041).
create policy "Tenants select own condition reports"
  on public.condition_reports for select
  using (
    exists (
      select 1
      from public.leases l
      join public.tenants t on t.id = l.tenant_id
      where l.id = condition_reports.lease_id
        and t.auth_user_id = auth.uid()
    )
  );
