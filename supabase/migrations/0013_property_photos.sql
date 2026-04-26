-- Property photos: jsonb array of {path, name, mime_type, size}.
-- Files live in a private "property-photos" bucket; the app reads them via
-- service-role signed URLs (same pattern as message-attachments).

alter table public.properties
  add column if not exists photos jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do nothing;
