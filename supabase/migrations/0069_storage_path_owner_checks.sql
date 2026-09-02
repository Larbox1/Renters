-- SECURITY: fix the storage confused-deputy and cross-tenant document reads.
--
-- Both storage-access helpers granted access based on a client-controllable
-- pointer (a documents.path / messages.attachments[].path the attacker could
-- set) instead of on who owns the file. Combined with self-inserted
-- tenant/lease/document rows this was a read oracle for the private buckets.
-- Separately, 0042/0062 exposed EVERY document on a property to EVERY tenant
-- of it (a new tenant could read the previous tenant's signed lease + ID).
--
-- Fixes:
--   1. Documents: scope to the tenant's OWN lease (drop the property-wide
--      disjunct), and require the storage object to live under the document
--      row's own owner prefix — so a forged path can't point at another
--      owner's file (documents.owner_id is pinned to auth.uid() on insert).
--   2. Message attachments: require the referenced path to live under the
--      message sender's prefix (pairs with the INSERT check in 0067).

-- 1a. Table policy: lease-scoped only.
drop policy if exists "Tenants select lease documents" on public.documents;
create policy "Tenants select lease documents"
  on public.documents for select
  using (
    exists (
      select 1
      from public.leases l
      join public.tenants t on t.id = l.tenant_id
      where t.auth_user_id = auth.uid()
        and documents.lease_id = l.id
    )
  );

-- 1b. Storage helper: lease-scoped + owner-prefix bound.
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
    join public.leases l on d.lease_id = l.id
    join public.tenants t on t.id = l.tenant_id
    where d.path = object_name
      and object_name like (d.owner_id::text || '/%')
      and t.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.can_tenant_read_document_object(text) from public;
grant execute on function public.can_tenant_read_document_object(text) to authenticated;

-- 2. Message attachments: referenced path must belong to the sender.
create or replace function public.can_access_message_attachment(object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    object_path like (auth.uid()::text || '/%')
    or exists (
      select 1 from public.messages m
      where (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
        and object_path like (m.sender_id::text || '/%')
        and exists (
          select 1
          from jsonb_array_elements(m.attachments) as a
          where a ->> 'path' = object_path
        )
    );
$$;

revoke all on function public.can_access_message_attachment(text) from public;
grant execute on function public.can_access_message_attachment(text) to authenticated;
