-- Extended property attributes: description, type, surface, room counts,
-- amenity flags, and explicit "to rent" / "to sell" status flags.
--
-- Notes on the boolean defaults:
--   * to_rent defaults TRUE — most properties in this app are rentals,
--     so existing rows are flagged as rentals automatically.
--   * to_sell defaults FALSE — selling is an explicit, opt-in state.

create type public.property_type as enum (
  'apartment',
  'house',
  'studio',
  'commercial',
  'land',
  'other'
);

alter table public.properties
  add column if not exists description text,
  add column if not exists type        public.property_type,
  add column if not exists surface_sqm int,
  add column if not exists rooms       int,
  add column if not exists bedrooms    int,
  add column if not exists parking     boolean not null default false,
  add column if not exists basement    boolean not null default false,
  add column if not exists to_rent     boolean not null default true,
  add column if not exists to_sell     boolean not null default false;