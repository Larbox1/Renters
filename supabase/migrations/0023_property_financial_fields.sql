-- Property financial information: acquisition + recurring taxes.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- All fields nullable. Money columns are bigint cents to match the existing
-- value_cents / sell_price_cents convention. Tax fields are annual amounts.

alter table public.properties
  add column if not exists acquisition_date      date,
  add column if not exists acquisition_fees_cents bigint,
  add column if not exists brokerage_fees_cents   bigint,
  add column if not exists housing_tax_cents      bigint,
  add column if not exists property_tax_cents     bigint;