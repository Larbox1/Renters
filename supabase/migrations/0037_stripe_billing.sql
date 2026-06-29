-- Stripe billing state for owners. The `plan` column (migration 0036) stays
-- the effective tier the rest of the app reads; these columns hold the Stripe
-- bookkeeping needed to keep `plan` in sync via the webhook.
--
-- Source of truth is Stripe: the webhook (service-role) writes every column
-- below. To stop a user from POSTing a profile update that grants themselves a
-- paid tier for free, a trigger reverts any change to these columns unless the
-- write comes from the service-role connection (i.e. the webhook).
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).

alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists plan_current_period_end timestamptz,
  add column if not exists plan_cancel_at_period_end boolean not null default false;

-- Reverts any non-service-role attempt to change billing columns. Normal
-- profile edits (name, address, phone, language) pass through untouched.
create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.plan                      := old.plan;
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
