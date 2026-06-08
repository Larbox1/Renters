-- Extend get_my_storage_usage to count the buckets added after 0015:
--   * tenant-documents — paths "<tenant_id>/..." for tenants the caller owns
--   * documents        — paths "<owner_id>/..." (the caller's own folder),
--                        covers both uploaded files and generated contracts.
--
-- Same shape as before so the Settings storage table picks up the new
-- rows without code changes.

create or replace function public.get_my_storage_usage()
returns table (
  bucket_id   text,
  file_count  bigint,
  total_bytes bigint
)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return;
  end if;

  return query
  with
    my_property_ids as (
      select id::text as id from public.properties where owner_id = caller
    ),
    my_tenant_ids as (
      select id::text as id from public.tenants where owner_id = caller
    ),
    my_message_ids as (
      select id::text as id from public.messages where sender_id = caller
    ),
    property_objects as (
      select o.bucket_id, o.metadata
      from storage.objects o
      join my_property_ids p on split_part(o.name, '/', 1) = p.id
      where o.bucket_id = 'property-photos'
    ),
    tenant_doc_objects as (
      select o.bucket_id, o.metadata
      from storage.objects o
      join my_tenant_ids t on split_part(o.name, '/', 1) = t.id
      where o.bucket_id = 'tenant-documents'
    ),
    document_objects as (
      select o.bucket_id, o.metadata
      from storage.objects o
      where o.bucket_id = 'documents'
        and split_part(o.name, '/', 1) = caller::text
    ),
    message_objects as (
      select o.bucket_id, o.metadata
      from storage.objects o
      join my_message_ids m on split_part(o.name, '/', 1) = m.id
      where o.bucket_id = 'message-attachments'
    ),
    combined as (
      select * from property_objects
      union all
      select * from tenant_doc_objects
      union all
      select * from document_objects
      union all
      select * from message_objects
    )
  select
    c.bucket_id::text,
    count(*)::bigint,
    coalesce(sum((c.metadata ->> 'size')::bigint), 0)::bigint
  from combined c
  group by c.bucket_id
  order by c.bucket_id;
end;
$$;

grant execute on function public.get_my_storage_usage() to authenticated;
