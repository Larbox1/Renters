-- Storage counterpart of 0042 ("Tenants select lease documents"): the table
-- policy lets tenants list their lease/property documents, but the files in
-- the private documents bucket were only readable via the owner's own-folder
-- policy (0057) or the web's service role. Mobile signs URLs with the user
-- JWT, so tenants need a storage SELECT policy too.
--
-- SECURITY DEFINER helper (mirrors can_access_message_attachment): the check
-- must see documents/leases/tenants rows without tripping over their RLS.

create or replace function public.can_tenant_read_document_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents d
    join public.leases l
      on d.lease_id = l.id or d.property_id = l.property_id
    join public.tenants t on t.id = l.tenant_id
    where d.path = object_name
      and t.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.can_tenant_read_document_object(text) from public;
grant execute on function public.can_tenant_read_document_object(text) to authenticated;

drop policy if exists "tenants read lease document files" on storage.objects;
create policy "tenants read lease document files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and public.can_tenant_read_document_object(name)
  );
