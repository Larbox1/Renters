-- properties.country becomes the authority for which legal regime a lease
-- follows (FR bail types vs US lease types), so the free-text column is
-- normalized to the two supported ISO codes and constrained going forward.

-- Normalize existing values: common spellings of France/USA map to their
-- codes; anything unrecognized falls back to FR (the historical default).
update public.properties
set country = case
  when upper(trim(country)) in ('US', 'USA', 'U.S.', 'U.S.A.', 'UNITED STATES', 'UNITED STATES OF AMERICA', 'ETATS-UNIS', 'ÉTATS-UNIS') then 'US'
  else 'FR'
end;

alter table public.properties
  alter column country set default 'FR';

alter table public.properties
  add constraint properties_country_check check (country in ('FR', 'US'));
