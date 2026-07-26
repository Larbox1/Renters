-- Operation country — which country's legal framework the user operates
-- rentals under. Drives which lease types the lease form offers:
-- FR → bail vide / meublé / mobilité / étudiant / civil / commercial,
-- US → fixed-term / month-to-month / sublease / commercial.
-- Distinct from profiles.country, which is the postal address country.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

create type public.operation_country as enum ('FR', 'US');

-- Default FR: every existing user predates US support and operates in France.
alter table public.profiles
  add column if not exists operation_country public.operation_country not null default 'FR';

-- US lease types join the existing lease_type enum; FR values are untouched.
alter type public.lease_type add value if not exists 'us_fixed_term';
alter type public.lease_type add value if not exists 'us_month_to_month';
alter type public.lease_type add value if not exists 'us_sublease';
alter type public.lease_type add value if not exists 'us_commercial';

-- Recreate the signup trigger function so the country picked on the signup
-- form (raw_user_meta_data.operation_country) lands on the new profile row.
-- Everything else matches 0001_initial_auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  requested_country public.operation_country;
begin
  -- Parse the role the user picked at signup, defaulting to 'tenant'.
  -- Admin cannot be self-assigned at signup — it must be granted separately.
  begin
    requested_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    requested_role := 'tenant';
  end;

  if requested_role is null or requested_role = 'admin' then
    requested_role := 'tenant';
  end if;

  begin
    requested_country :=
      (new.raw_user_meta_data ->> 'operation_country')::public.operation_country;
  exception when others then
    requested_country := 'FR';
  end;

  if requested_country is null then
    requested_country := 'FR';
  end if;

  insert into public.profiles (id, role, full_name, operation_country)
  values (
    new.id,
    requested_role,
    new.raw_user_meta_data ->> 'full_name',
    requested_country
  );
  return new;
end;
$$;
