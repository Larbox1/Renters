-- US-specific lease fields, captured by the lease form for us_* lease types
-- and printed on the US lease agreement. All nullable — FR leases leave them
-- empty, and the lease actions clear them when a lease switches to a FR type.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

alter table public.leases
  -- Two-letter state code (governing law, deposit caps, disclosures).
  add column if not exists us_state             text,
  add column if not exists late_fee_cents       integer,
  add column if not exists late_fee_grace_days  integer,
  add column if not exists notice_period_days   integer,
  add column if not exists pets_allowed         boolean,
  add column if not exists pet_deposit_cents    integer,
  -- Free-text list, e.g. "water, trash collection".
  add column if not exists utilities_included   text;
