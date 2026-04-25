-- Properties, tenants, and leases data model.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).
-- The set_updated_at() function is already defined by migration 0001.

-- ---------------------------------------------------------------------------
-- Lease status enum
-- ---------------------------------------------------------------------------
create type public.lease_status as enum ('pending', 'active', 'ended');

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------
create table public.properties (
  id               uuid        primary key default gen_random_uuid(),
  owner_id         uuid        not null references auth.users on delete cascade,
  label            text,
  address          text        not null,
  city             text        not null,
  postal_code      text,
  country          text        not null default 'FR',
  monthly_rent_cents int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index properties_owner_id_idx on public.properties(owner_id);

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tenants (landlord-owned records; no auth.users row required at this stage)
-- ---------------------------------------------------------------------------
create table public.tenants (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references auth.users on delete cascade,
  full_name  text        not null,
  email      text,
  phone      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tenants_owner_id_idx on public.tenants(owner_id);

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Leases
-- ---------------------------------------------------------------------------
create table public.leases (
  id                 uuid              primary key default gen_random_uuid(),
  property_id        uuid              not null references public.properties on delete cascade,
  tenant_id          uuid              not null references public.tenants   on delete restrict,
  start_date         date              not null,
  end_date           date,
  monthly_rent_cents int               not null,
  deposit_cents      int               not null default 0,
  status             public.lease_status not null default 'pending',
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz       not null default now()
);

create index leases_property_id_idx on public.leases(property_id);
create index leases_tenant_id_idx   on public.leases(tenant_id);
create index leases_status_idx      on public.leases(status);

create trigger leases_set_updated_at
before update on public.leases
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — properties
-- ---------------------------------------------------------------------------
alter table public.properties enable row level security;

create policy "Owners select own properties"
  on public.properties for select
  using (owner_id = auth.uid());

create policy "Owners insert own properties"
  on public.properties for insert
  with check (owner_id = auth.uid());

create policy "Owners update own properties"
  on public.properties for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners delete own properties"
  on public.properties for delete
  using (owner_id = auth.uid());

create policy "Admins read all properties"
  on public.properties for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Row Level Security — tenants
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;

create policy "Owners select own tenants"
  on public.tenants for select
  using (owner_id = auth.uid());

create policy "Owners insert own tenants"
  on public.tenants for insert
  with check (owner_id = auth.uid());

create policy "Owners update own tenants"
  on public.tenants for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners delete own tenants"
  on public.tenants for delete
  using (owner_id = auth.uid());

create policy "Admins read all tenants"
  on public.tenants for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Row Level Security — leases (join through properties to verify ownership)
-- ---------------------------------------------------------------------------
alter table public.leases enable row level security;

create policy "Owners select own leases"
  on public.leases for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owners insert own leases"
  on public.leases for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owners update own leases"
  on public.leases for update
  using (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owners delete own leases"
  on public.leases for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = leases.property_id and p.owner_id = auth.uid()
    )
  );

create policy "Admins read all leases"
  on public.leases for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
