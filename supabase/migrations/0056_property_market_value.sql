-- Estimated market value: what the property is worth today, as opposed to
-- value_cents (what it was bought for) and sell_price_cents (the asking price
-- when it is actually listed for sale).
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

alter table public.properties
  add column if not exists market_value_cents bigint;
