-- Lease type — French legal lease categories.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- Nullable on purpose: existing leases predate this column and have no
-- recorded type. The form lets the user pick a type when editing.

create type public.lease_type as enum (
  'bail_vide',
  'bail_meuble',
  'bail_mobilite',
  'bail_etudiant',
  'bail_civil',
  'bail_commercial'
);

alter table public.leases
  add column if not exists type public.lease_type;
