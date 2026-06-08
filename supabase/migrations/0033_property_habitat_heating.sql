-- Property characteristics from the Bail vide template, section II.A:
--   * Type d'habitat        — collectif vs individuel
--   * Régime                — mono propriété vs copropriété
--   * Production de chauffage — individuel vs collectif
--   * Production d'eau chaude sanitaire — individuel vs collectif
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
-- Plain text + CHECK keeps the schema light and lets the values be added
-- to without writing a new migration.

alter table public.properties
  add column if not exists housing_kind   text
    check (housing_kind in ('collective', 'individual')),
  add column if not exists ownership_kind text
    check (ownership_kind in ('single_ownership', 'co_ownership')),
  add column if not exists heating_mode   text
    check (heating_mode in ('individual', 'collective')),
  add column if not exists hot_water_mode text
    check (hot_water_mode in ('individual', 'collective'));
