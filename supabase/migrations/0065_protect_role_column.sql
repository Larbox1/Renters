-- SECURITY: lock profiles.role against self-service privilege escalation.
--
-- The self-update RLS policy on profiles ("Profiles are updatable by their
-- owner", 0001) is row-scoped but not column-scoped, and no guard covered
-- `role` — so any authenticated user could PATCH their own row with
-- {"role":"admin"} through PostgREST and gain full admin access (is_admin()
-- policies, get_owner_contact, list_users, the /dashboard/users back office).
--
-- Fix: extend the protect_billing_columns trigger (0037/0038/0064 pattern) to
-- also revert `role` on every non-service-role update. Legitimate role writes
-- all go through the service role already:
--   * admin back office (app/[locale]/dashboard/users/actions.ts)
--   * ADMIN_EMAILS bootstrap (lib/auth/current-user.ts)
--   * OAuth signup callback (app/auth/callback/route.ts — switched to the
--     admin client alongside this migration)
-- Signup itself is unaffected: handle_new_user (INSERT) already refuses
-- 'admin', and profiles has no INSERT policy for clients.
--
-- Also hardens the function itself: pin an empty search_path (references are
-- schema-qualified) so it cannot be redirected by a caller's search_path.

create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.role                      := old.role;
    new.plan                      := old.plan;
    new.plan_interval             := old.plan_interval;
    new.plan_provider             := old.plan_provider;
    new.stripe_customer_id        := old.stripe_customer_id;
    new.stripe_subscription_id    := old.stripe_subscription_id;
    new.subscription_status       := old.subscription_status;
    new.plan_current_period_end   := old.plan_current_period_end;
    new.plan_cancel_at_period_end := old.plan_cancel_at_period_end;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_billing_columns on public.profiles;
create trigger protect_billing_columns
  before update on public.profiles
  for each row
  execute function public.protect_billing_columns();
