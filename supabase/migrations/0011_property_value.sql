-- Asset value (purchase price) per property — used by the dashboard's
-- "Portfolio value" stat. Stored in cents like monthly_rent_cents.

alter table public.properties
  add column if not exists value_cents bigint;
