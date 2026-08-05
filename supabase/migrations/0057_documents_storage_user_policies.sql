-- Storage policies for the documents bucket: user-JWT access to one's own
-- folder, so the mobile app can list/open/upload/delete documents without the
-- service role (which the web keeps using unchanged).
--
-- Objects live under "<ownerId>/…" (uploads + generated PDFs) and
-- "<ownerId>/edl/…" (condition-report photos, already covered by 0050 —
-- these broader policies supersede them but both can coexist).
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

drop policy if exists "users read own documents folder" on storage.objects;

create policy "users read own documents folder"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users upload to own documents folder" on storage.objects;

create policy "users upload to own documents folder"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete from own documents folder" on storage.objects;

create policy "users delete from own documents folder"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
