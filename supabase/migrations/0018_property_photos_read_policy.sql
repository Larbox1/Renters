-- Let owners and admins read objects in the property-photos bucket so they
-- can mint signed URLs from the mobile client. The web app reads via the
-- service role and didn't need this; mobile's anon client does.
--
-- The bucket stays private (no public-read policy); access still requires a
-- valid auth session AND the role check via is_owner_or_admin (defined in
-- migration 0005).

drop policy if exists "owners and admins read property photos"
  on storage.objects;

create policy "owners and admins read property photos"
  on storage.objects for select
  using (
    bucket_id = 'property-photos'
    and public.is_owner_or_admin()
  );
