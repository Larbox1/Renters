-- Two more property financials: improvement works and insurance.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- works_cents is a one-off amount (money put into the property at purchase to
-- improve it); insurance_monthly_cents is recurring — the column name carries
-- the period because the neighbouring tax columns are annual.

alter table public.properties
  add column if not exists works_cents             bigint,
  add column if not exists insurance_monthly_cents bigint;
