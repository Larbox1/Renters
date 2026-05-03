-- Bail vide-specific lease fields (loi du 6 juillet 1989 / décret 29 mai 2015).
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- All fields are nullable. The lease form only renders them when
-- leases.type = 'bail_vide'; for other lease types the values stay null.
-- A future migration can extend property_extended_fields with the
-- property-level pieces of the same contract (DPE class lives here for now
-- as a snapshot at signing — when it moves to properties, this column will
-- be deprecated rather than removed).

create type public.lease_duration as enum ('3_years', '6_years', 'reduced');
create type public.charges_method as enum ('provisions', 'periodic', 'flat_rate');
create type public.payment_timing as enum ('in_advance', 'arrears');
create type public.dpe_class      as enum ('A', 'B', 'C', 'D', 'E', 'F', 'G');

alter table public.leases
  -- Section III: durée du contrat
  add column if not exists duration                            public.lease_duration,
  add column if not exists reduced_duration_months             int,
  add column if not exists reduced_duration_reason             text,
  -- Section IV.A: loyer & révision
  add column if not exists irl_reference                       text,
  add column if not exists revision_date                       date,
  add column if not exists rent_supplement_cents               bigint,
  -- Section IV.A.b: zone tendue
  add column if not exists is_zone_tendue                      boolean not null default false,
  add column if not exists reference_rent_cents_per_sqm        int,
  add column if not exists reference_rent_capped_cents_per_sqm int,
  -- Section IV.B: charges
  add column if not exists charges_method                      public.charges_method,
  add column if not exists charges_amount_cents                int,
  -- Section IV.E: modalités de paiement
  add column if not exists payment_day_of_month                int,
  add column if not exists payment_timing                      public.payment_timing,
  -- Section II/IV.G: DPE snapshot
  add column if not exists dpe_class                           public.dpe_class,
  add column if not exists annual_energy_cost_cents            int,
  -- Section IX: honoraires côté locataire
  add column if not exists tenant_fees_cents                   int,
  add column if not exists tenant_inventory_fees_cents         int;
