-- Initial auth schema: role enum, profiles table, auto-create-profile trigger, RLS.
-- Apply this to your Supabase project via: supabase db push, or paste into the SQL editor.

-- ---------------------------------------------------------------------------
-- Role enum (must match the 4 user types in the product)
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'admin',
  'owner',
  'tenant',
  'service_provider'
);

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth.users row, stores role and display info
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'tenant',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- Keep updated_at fresh on any row change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row is inserted.
-- Role and full_name are read from raw_user_meta_data supplied at signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
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

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    requested_role,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Profiles are readable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins read all profiles
create policy "Admins read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
