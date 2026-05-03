-- Tenant "société" branch: company identifiers + legal representative.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- The civilité / date_of_birth / place_of_birth / nationality columns from
-- 0028 are reused here: when tenant_type = 'societe' they describe the
-- legal representative; when tenant_type = 'particulier' they describe the
-- tenant. The form decides which section renders them.

alter table public.tenants
  add column if not exists siren                text,
  add column if not exists vat_number           text,
  add column if not exists capital_cents        bigint,
  add column if not exists business_sector      text,
  add column if not exists legal_rep_first_name text,
  add column if not exists legal_rep_last_name  text;
