-- Extend lease_duration enum with the durations specific to bail meublé.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- Bail meublé default duration is one year; for a student lease it is
-- nine months without tacit renewal (loi du 6 juillet 1989, titre Ier bis).
-- The existing 3_years / 6_years / reduced values keep their meaning for
-- bail vide. The form picks which subset of values to show based on
-- leases.type.

alter type public.lease_duration add value if not exists '1_year';
alter type public.lease_duration add value if not exists '9_months_student';
