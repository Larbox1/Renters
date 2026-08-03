-- Property loans: the user enters the borrowed amount, annual rate and the
-- loan period; everything else (monthly payment, remaining balance, interest)
-- is computed in the app and never stored. A property can carry several loans
-- (initial mortgage, works loan, renegotiation).
--
-- The rate is stored in basis points (3.52 % → 352) — an integer, like money
-- in cents, so no float drift ever reaches the database.

create table public.property_loans (
  id              uuid        primary key default gen_random_uuid(),
  property_id     uuid        not null references public.properties(id) on delete cascade,
  owner_id        uuid        not null references auth.users(id) on delete cascade,
  label           text,
  principal_cents bigint      not null check (principal_cents > 0),
  annual_rate_bps int         not null check (annual_rate_bps >= 0),
  start_date      date        not null,
  end_date        date        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_date > start_date)
);

create index property_loans_property_id_idx on public.property_loans(property_id);
create index property_loans_owner_id_idx on public.property_loans(owner_id);

create trigger property_loans_set_updated_at
before update on public.property_loans
for each row execute function public.set_updated_at();

alter table public.property_loans enable row level security;

create policy "Owners select own loans"
  on public.property_loans for select
  using (owner_id = auth.uid());

create policy "Owners insert own loans"
  on public.property_loans for insert
  with check (owner_id = auth.uid());

create policy "Owners update own loans"
  on public.property_loans for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners delete own loans"
  on public.property_loans for delete
  using (owner_id = auth.uid());

create policy "Admins read all loans"
  on public.property_loans for select
  using (public.is_admin());
