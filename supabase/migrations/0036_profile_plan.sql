-- Subscription plan for owners (landlords). One of the four public tiers
-- shown on the marketing pricing section. Everyone starts on 'free'.
-- Plain text + CHECK keeps the schema light and lets owners self-serve
-- upgrades from Settings (no billing integration yet).
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'plus', 'pro', 'unlimited'));
