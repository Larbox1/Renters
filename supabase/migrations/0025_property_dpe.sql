-- Property energy diagnostic (DPE) and annual energy cost range.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- Reuses the public.dpe_class enum created in 0022_lease_bail_vide_fields.
-- All fields nullable: many properties will be added before a DPE is on hand.
-- Energy consumption is in kWh/m²/year; GHG emissions in kgCO₂/m²/year;
-- annual cost min/max are stored in cents alongside the other money fields.

alter table public.properties
  add column if not exists dpe_class                    public.dpe_class,
  add column if not exists dpe_energy_consumption       int,
  add column if not exists dpe_ghg_emissions            int,
  add column if not exists annual_energy_cost_min_cents bigint,
  add column if not exists annual_energy_cost_max_cents bigint;
