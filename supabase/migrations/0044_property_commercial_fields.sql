-- Commercial-lease fields on properties.
--
-- The bail commercial (3/6/9) needs the authorized activity / destination of
-- the premises and the equipment included, neither of which the property model
-- captured. Surfaced in the property form only when type = 'commercial', and
-- consumed by the bail commercial contract generator.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).

alter table public.properties
  add column if not exists commercial_activity text,
  add column if not exists commercial_equipment text;
