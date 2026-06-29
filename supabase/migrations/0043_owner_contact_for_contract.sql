-- Landlord (bailleur) details on the lease contract.
--
-- Properties, tenants and leases are shared across all owners (migration
-- 0005), but profiles stay private: a non-admin owner can only read their own
-- profile row (0001). So when an owner generates the contract for a lease whose
-- property was created by a *different* owner, the profile read returned no row
-- and the entire bailleur block rendered blank.
--
-- Expose only the landlord's display fields (no billing / Stripe columns)
-- through a SECURITY DEFINER function, callable by any owner or admin. Reuses
-- the is_owner_or_admin() guard from 0005.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).

create or replace function public.get_owner_contact(p_owner_id uuid)
returns table (
  full_name text,
  first_name text,
  last_name text,
  address text,
  city text,
  postal_code text,
  country text,
  phone text
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
    p.phone
  from public.profiles p
  where p.id = p_owner_id
    and public.is_owner_or_admin();
$$;

grant execute on function public.get_owner_contact(uuid) to authenticated;
