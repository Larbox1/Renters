-- SECURITY: stop owners from silently binding arbitrary tenant accounts.
--
-- 0060 added a BEFORE INSERT/UPDATE trigger on tenants that adopted any
-- confirmed 'tenant' auth user whose email matched the row — so an owner who
-- typed a victim's email captured the victim's real account (unsolicited DMs
-- via can_message, the victim's My Lease showing the attacker's lease/IBAN,
-- and an email-registration oracle). Ownership of the email was never checked.
--
-- Also: tenants.auth_user_id was owner-settable (0058 policies check only
-- owner_id), which by itself flips can_message() and the tenant-facing
-- SELECT policies toward any uuid.
--
-- Fix:
--   1. Drop the insert/update auto-link trigger. Linking now happens only via
--      service-role paths: the tenant-invite edge function (after verifying
--      ownership through RLS) and the web/mobile create flows.
--   2. Keep claim_tenant_rows_for_user (fires on auth.users when the TENANT
--      themselves confirms their email) — that direction is consent-based.
--   3. Freeze auth_user_id against non-service-role writes with a trigger.

drop trigger if exists tenants_link_existing_user on public.tenants;
drop function if exists public.link_tenant_to_existing_user();

create or replace function public.protect_tenant_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.auth_user_id := null;
  else
    new.auth_user_id := old.auth_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_tenant_link on public.tenants;
create trigger protect_tenant_link
  before insert or update on public.tenants
  for each row
  execute function public.protect_tenant_link();
