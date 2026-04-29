-- Fix the infinite-recursion error on profiles RLS.
--
-- Migration 0001 added "Admins read all profiles" with a USING clause that
-- subqueries public.profiles. That subquery re-enters the same policy, which
-- Postgres detects as infinite recursion — and rejects every read on profiles,
-- including the owner-reading-own-row case allowed by the first policy.
--
-- The fix is the same pattern used by is_owner_or_admin in 0005: wrap the
-- admin check in a SECURITY DEFINER function so the lookup bypasses RLS.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins read all profiles" on public.profiles;

create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_admin());
