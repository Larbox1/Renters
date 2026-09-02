-- Multi-provider billing: record which store owns the current subscription so
-- the Stripe (web) and RevenueCat (mobile: Play now, App Store later) webhooks
-- never overwrite each other's state.

alter table public.profiles
  add column if not exists plan_provider text
    check (plan_provider in ('stripe', 'play', 'app_store'));

-- Existing subscribers all came through Stripe.
update public.profiles
  set plan_provider = 'stripe'
  where plan_provider is null and stripe_subscription_id is not null;

-- Re-create the billing-column guard (0037/0038 pattern) to cover the new
-- column: only service-role writes (the webhooks) may change it.
create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
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
