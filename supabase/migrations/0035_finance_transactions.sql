-- Finance transactions: manual income / expense entries recorded by an owner
-- from the "My Finance" screen. Each entry is attached to one property.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

create table public.finance_transactions (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users on delete cascade,
  property_id uuid        not null references public.properties on delete cascade,
  kind        text        not null check (kind in ('income', 'expense')),
  category    text,
  amount_cents bigint     not null check (amount_cents >= 0),
  occurred_on date        not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index finance_transactions_owner_id_idx    on public.finance_transactions(owner_id);
create index finance_transactions_property_id_idx on public.finance_transactions(property_id);

alter table public.finance_transactions enable row level security;

create policy "Owners select own finance transactions"
  on public.finance_transactions for select
  using (owner_id = auth.uid());

create policy "Owners insert own finance transactions"
  on public.finance_transactions for insert
  with check (owner_id = auth.uid());

create policy "Owners delete own finance transactions"
  on public.finance_transactions for delete
  using (owner_id = auth.uid());

create policy "Admins read all finance transactions"
  on public.finance_transactions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
