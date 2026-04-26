-- Per-user storage usage. Counts the bytes of files the caller "owns":
--   * property-photos under properties they own (path = "<property_id>/...")
--   * message-attachments under messages they sent (path = "<message_id>/...")
-- Same shape as get_storage_usage() so the Settings page can render either.

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
    my_message_ids as (
      select id::text as id from public.messages where sender_id = caller
    ),
    property_objects as (
      select o.bucket_id, o.metadata
      from storage.objects o
      join my_property_ids p on split_part(o.name, '/', 1) = p.id
      where o.bucket_id = 'property-photos'
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
