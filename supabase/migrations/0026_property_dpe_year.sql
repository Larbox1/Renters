-- Reference year for the property's annual energy cost estimate.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- The Bail vide template (décret 29 mai 2015, section IV.G) requires the
-- year of the energy price reference behind the cost estimate. Nullable —
-- existing properties don't carry a year yet.

alter table public.properties
  add column if not exists annual_energy_cost_year int;
