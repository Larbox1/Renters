-- Storage policies for condition-report (EDL) walkthrough photos.
--
-- Web uploads + reads via the service role (per 0049 / documents storage
-- helpers), so no policies were needed there. The mobile client uses the anon
-- key bound to the caller's JWT, so it needs explicit policies to take photos
-- during a walkthrough. The bucket stays private.
--
-- Scope: only the caller's own EDL prefix — "<auth.uid()>/edl/<reportId>/…"
-- (the convention of reportPhotoPrefix on both web and mobile). The rest of
-- the documents bucket (uploaded files, generated PDFs) remains service-role
-- only. Mirrors the message-attachments approach of migration 0020.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

drop policy if exists "users upload own edl photos" on storage.objects;

create policy "users upload own edl photos"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'edl'
  );

drop policy if exists "users read own edl photos" on storage.objects;

create policy "users read own edl photos"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'edl'
  );

drop policy if exists "users delete own edl photos" on storage.objects;

create policy "users delete own edl photos"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'edl'
  );
