-- Tenant categorisation + extended individual fields (rental application
-- material). Apply via: paste into the Supabase SQL Editor.
--
-- Most fields are nullable: existing tenants predate this expansion. The
-- "particulier" branch in the form drives most of the new columns; the
-- "societe" branch leaves them null and will get its own follow-up fields.
--
-- ID documents are uploaded to a private storage bucket; the tenant row
-- only stores the storage path + filename, never the file itself.

create type public.tenant_type as enum ('particulier', 'societe');
create type public.civilite as enum ('mr', 'mrs');
create type public.id_document_type as enum (
  'id_card',
  'passport',
  'driver_license',
  'residence_permit'
);

alter table public.tenants
  add column if not exists tenant_type            public.tenant_type,
  add column if not exists civilite               public.civilite,
  add column if not exists date_of_birth          date,
  add column if not exists place_of_birth         text,
  add column if not exists nationality            text,
  add column if not exists profession             text,
  add column if not exists income_cents           bigint,
  add column if not exists previous_address       text,
  add column if not exists previous_city          text,
  add column if not exists previous_postal_code   text,
  add column if not exists previous_country       text,
  add column if not exists id_document_type       public.id_document_type,
  add column if not exists id_document_number     text,
  add column if not exists id_document_expiration date,
  add column if not exists id_document_path       text,
  add column if not exists id_document_name       text;

-- Private bucket; reads/writes go through the service role from the
-- "use server" actions, same as property-photos.
insert into storage.buckets (id, name, public)
values ('tenant-documents', 'tenant-documents', false)
on conflict (id) do nothing;
