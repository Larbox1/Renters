-- 0071 — explicit role choice for OAuth signups
--
-- Problem: OAuth signups (Google today, Apple soon) carry no role metadata,
-- so handle_new_user defaulted every one of them to tenant/FR. The web
-- callback patched the role afterwards from signup-page query params, but
-- the web *login* page and the mobile app never sent any — a first-time
-- OAuth user silently became a tenant with no way to change it, since
-- profiles.role is locked against client writes (0065).
--
-- Fix: profiles.onboarded_at records that the user explicitly chose a role.
--   * email signups: the trigger sets it (role came from signup metadata)
--   * OAuth signups: left null → both apps show a one-time role picker
--   * complete_onboarding(role, country): applies that choice exactly once
-- Existing profiles are backfilled so nobody is asked retroactively.

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

update public.profiles
   set onboarded_at = now()
 where onboarded_at is null;

-- ---------------------------------------------------------------------------
-- Signup trigger: same as 0058, plus onboarded_at is set only when the signup
-- metadata carried a valid (non-admin) role.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  requested_country public.operation_country;
  explicit_role boolean := false;
begin
  -- Parse the role the user picked at signup, defaulting to 'tenant'.
  -- Admin cannot be self-assigned at signup — it must be granted separately.
  begin
    requested_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    requested_role := null;
  end;

  if requested_role is null or requested_role = 'admin' then
    requested_role := 'tenant';
  else
    explicit_role := true;
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

  insert into public.profiles
    (id, role, full_name, operation_country, avatar_url, onboarded_at)
  values (
    new.id,
    requested_role,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    requested_country,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    case when explicit_role then now() else null end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Column lock: same as 0065, plus
--   * onboarded_at joins the locked set (clients must not self-stamp it)
--   * role and onboarded_at may change inside complete_onboarding, signalled
--     by the transaction-local setting app.onboarding = '1'. Clients have no
--     way to set that GUC through PostgREST; only the RPC below does, and it
--     is transaction-scoped. Even then 'admin' is never accepted.
-- ---------------------------------------------------------------------------
create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  onboarding boolean :=
    coalesce(current_setting('app.onboarding', true), '') = '1';
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if not (onboarding and new.role <> 'admin') then
      new.role := old.role;
    end if;
    if not onboarding then
      new.onboarded_at := old.onboarded_at;
    end if;
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

-- ---------------------------------------------------------------------------
-- complete_onboarding(role, country)
-- One-shot: applies the caller's role choice to their own profile, only while
-- onboarded_at is still null. Raises 'already_onboarded' otherwise, so it can
-- never be used to switch roles later. Upserts so an account whose signup
-- trigger somehow failed to create a profile row still gets one.
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_role text,
  p_country text default 'FR'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_country public.operation_country;
  v_full_name text;
  v_avatar text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('owner', 'tenant', 'service_provider') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  v_role := p_role::public.user_role;

  v_country := case
    when p_country in ('FR', 'US') then p_country::public.operation_country
    else 'FR'::public.operation_country
  end;

  select coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
         coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
    into v_full_name, v_avatar
    from auth.users u
   where u.id = v_uid;

  -- Unlock role/onboarded_at for this transaction only (see protect_billing_columns).
  perform set_config('app.onboarding', '1', true);

  insert into public.profiles
    (id, role, full_name, operation_country, avatar_url, onboarded_at)
  values
    (v_uid, v_role, v_full_name, v_country, v_avatar, now())
  on conflict (id) do update
     set role = excluded.role,
         operation_country = excluded.operation_country,
         onboarded_at = excluded.onboarded_at
   where public.profiles.onboarded_at is null;

  if not found then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.complete_onboarding(text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text) to authenticated;
