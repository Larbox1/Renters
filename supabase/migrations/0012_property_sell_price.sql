-- Asking price when a property is listed for sale. Distinct from value_cents
-- (which is the asset / portfolio valuation). NULL means "not for sale".

alter table public.properties
  add column if not exists sell_price_cents bigint;
