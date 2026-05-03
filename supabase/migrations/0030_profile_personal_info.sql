-- Personal contact info on the user's profile (displayed/edited from
-- the Settings / Paramètres screen).
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- All nullable. The existing full_name column from 0001_initial_auth stays
-- in place — it's already referenced from the lease contract template and
-- elsewhere — and lives alongside the new first_name / last_name fields.

alter table public.profiles
  add column if not exists first_name  text,
  add column if not exists last_name   text,
  add column if not exists address     text,
  add column if not exists city        text,
  add column if not exists postal_code text,
  add column if not exists country     text,
  add column if not exists phone       text;
