-- Profile pictures. profiles.avatar_url holds either the Google account
-- picture (seeded from signup metadata) or the public URL of a picture
-- uploaded to the new public `avatars` bucket (mobile Settings).
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

alter table public.profiles
  add column if not exists avatar_url text;

-- Public bucket: avatars are displayed in shared surfaces (user lists,
-- conversations), so public read + stable URLs beat signed-URL expiry.
-- Writes stay scoped to the owner's folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "users upload own avatar" on storage.objects;

create policy "users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own avatar" on storage.objects;

create policy "users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own avatar" on storage.objects;

create policy "users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Recreate the signup trigger so OAuth signups (Google) seed the profile
-- picture from their auth metadata. Everything else matches 0051.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  requested_country public.operation_country;
begin
  -- Parse the role the user picked at signup, defaulting to 'tenant'.
  -- Admin cannot be self-assigned at signup — it must be granted separately.
  begin
    requested_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    requested_role := 'tenant';
  end;

  if requested_role is null or requested_role = 'admin' then
    requested_role := 'tenant';
  end if;

  begin
    requested_country :=
      (new.raw_user_meta_data ->> 'operation_country')::public.operation_country;
  exception when others then
    requested_country := 'FR';
  end;

  if requested_country is null then
    requested_country := 'FR';
  end if;

  insert into public.profiles (id, role, full_name, operation_country, avatar_url)
  values (
    new.id,
    requested_role,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    requested_country,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;
