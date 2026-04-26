-- Storage usage stats for the admin Settings page.
-- The storage schema isn't exposed to PostgREST, so we wrap a sum over
-- storage.objects in a security-definer function gated to admins.

create or replace function public.get_storage_usage()
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
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can read storage usage';
  end if;

  return query
  select
    o.bucket_id::text,
    count(*)::bigint as file_count,
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint as total_bytes
  from storage.objects o
  group by o.bucket_id
  order by o.bucket_id;
end;
$$;

grant execute on function public.get_storage_usage() to authenticated;
