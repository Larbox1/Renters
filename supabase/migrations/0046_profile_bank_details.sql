-- Landlord bank details (IBAN / BIC) on the profile, shown on the rent receipt
-- payment-information block. Edited from the Settings / Paramètres screen.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

alter table public.profiles
  add column if not exists iban text,
  add column if not exists bic  text;

-- Extend get_owner_contact (migration 0043) so the rent receipt can render the
-- landlord's email + bank details regardless of which owner created the
-- property. The return signature changes, so the function must be dropped and
-- recreated (create or replace cannot alter OUT columns). Email comes from
-- auth.users — reachable here because the function is SECURITY DEFINER.
drop function if exists public.get_owner_contact(uuid);

create function public.get_owner_contact(p_owner_id uuid)
returns table (
  full_name text,
  first_name text,
  last_name text,
  address text,
  city text,
  postal_code text,
  country text,
  phone text,
  email text,
  iban text,
  bic text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.full_name,
    p.first_name,
    p.last_name,
    p.address,
    p.city,
    p.postal_code,
    p.country,
    p.phone,
    u.email::text,
    p.iban,
    p.bic
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_owner_id
    and public.is_owner_or_admin();
$$;

grant execute on function public.get_owner_contact(uuid) to authenticated;
