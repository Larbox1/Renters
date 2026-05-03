-- Property amenities: yes/no flags for shared and in-unit features.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
--
-- All flags default false so existing rows get the same baseline. The
-- rolling_shutters_electric flag is meaningful only when rolling_shutters
-- is true; the form and actions enforce that pairing.

alter table public.properties
  add column if not exists elevator                  boolean not null default false,
  add column if not exists disabled_access           boolean not null default false,
  add column if not exists concierge                 boolean not null default false,
  add column if not exists bike_storage              boolean not null default false,
  add column if not exists fiber_optic               boolean not null default false,
  add column if not exists laundry_room              boolean not null default false,
  add column if not exists caretaker                 boolean not null default false,
  add column if not exists digicode                  boolean not null default false,
  add column if not exists intercom                  boolean not null default false,
  add column if not exists reinforced_door           boolean not null default false,
  add column if not exists cctv                      boolean not null default false,
  add column if not exists ev_charger                boolean not null default false,
  add column if not exists double_glazing            boolean not null default false,
  add column if not exists cable_tv                  boolean not null default false,
  add column if not exists rolling_shutters          boolean not null default false,
  add column if not exists rolling_shutters_electric boolean not null default false,
  add column if not exists air_conditioning          boolean not null default false,
  add column if not exists smoke_detector            boolean not null default false,
  add column if not exists balcony                   boolean not null default false,
  add column if not exists terrace                   boolean not null default false,
  add column if not exists garden                    boolean not null default false,
  add column if not exists gym                       boolean not null default false,
  add column if not exists playground                boolean not null default false,
  add column if not exists green_space               boolean not null default false;