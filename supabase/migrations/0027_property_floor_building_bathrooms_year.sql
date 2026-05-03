-- Property characteristics: floor, building, bathroom count, build year.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- floor allows negative values for basement levels (sous-sol). All nullable
-- so existing rows aren't forced to backfill.

alter table public.properties
  add column if not exists floor             int,
  add column if not exists building          text,
  add column if not exists bathrooms         int,
  add column if not exists construction_year int;
