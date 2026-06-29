-- Billing cadence for the owner's current subscription: 'month' or 'year'.
-- Written by the Stripe webhook (service-role) from the subscription's price.
-- Null while on the free plan. Lets Settings show the right price and
-- pre-select the monthly/annual toggle.
--
-- Also re-creates protect_billing_columns (from 0037) so this new column is
-- guarded the same way — only the service-role webhook may change it.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).

alter table public.profiles
  add column if not exists plan_interval text
    check (plan_interval in ('month', 'year'));

create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.plan                      := old.plan;
    new.plan_interval             := old.plan_interval;
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
