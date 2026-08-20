-- Auto-link tenant auth accounts to landlord tenant records by email.
--
-- The invite flow (tenant-invite edge function) only sets
-- tenants.auth_user_id when it creates the auth user itself. When the tenant
-- registered FIRST (email/password or Google), inviteUserByEmail fails with
-- "email already registered", tenant creation proceeds with a NULL link, and
-- nothing ever repairs it — the tenant sees an empty My Lease forever.
--
-- Two SECURITY DEFINER triggers close every ordering, linking only VERIFIED
-- emails and only auth users whose profile role is 'tenant' (so typing an
-- owner's email into a tenant form never cross-links roles):
--   1. tenants insert/update → adopt an existing confirmed auth user.
--   2. auth.users insert/confirmation → claim the oldest unlinked tenant row
--      with a matching email. Named to sort AFTER on_auth_user_created so the
--      profile row (role check) exists when it runs on INSERT (Google
--      signups arrive already confirmed).
-- A tenants.auth_user_id unique index allows one linked row per user; the
-- oldest matching row wins.
--
-- Also backfills already-orphaned pairs created before this migration.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

create or replace function public.link_tenant_to_existing_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate uuid;
begin
  if new.auth_user_id is not null or new.email is null or btrim(new.email) = '' then
    return new;
  end if;

  select u.id into candidate
  from auth.users u
  join public.profiles p on p.id = u.id and p.role = 'tenant'
  where lower(u.email) = lower(new.email)
    and u.email_confirmed_at is not null
    and not exists (
      select 1 from public.tenants t where t.auth_user_id = u.id
    )
  limit 1;

  if candidate is not null then
    new.auth_user_id := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists tenants_link_existing_user on public.tenants;

create trigger tenants_link_existing_user
before insert or update of email on public.tenants
for each row execute function public.link_tenant_to_existing_user();

create or replace function public.claim_tenant_rows_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;
  if exists (select 1 from public.tenants t where t.auth_user_id = new.id) then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = new.id and p.role = 'tenant'
  ) then
    return new;
  end if;

  update public.tenants
     set auth_user_id = new.id
   where id = (
     select id from public.tenants
      where auth_user_id is null
        and lower(email) = lower(new.email)
      order by created_at asc
      limit 1
   );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_zz_claim_tenants on auth.users;

create trigger on_auth_user_created_zz_claim_tenants
after insert or update of email_confirmed_at on auth.users
for each row execute function public.claim_tenant_rows_for_user();

-- Backfill: adopt existing confirmed tenant users into the oldest unlinked
-- tenant row carrying their email.
update public.tenants t
   set auth_user_id = candidates.user_id
  from (
    select distinct on (lower(u.email)) u.id as user_id, lower(u.email) as email
    from auth.users u
    join public.profiles p on p.id = u.id and p.role = 'tenant'
    where u.email_confirmed_at is not null
      and not exists (
        select 1 from public.tenants x where x.auth_user_id = u.id
      )
  ) candidates
 where t.auth_user_id is null
   and lower(t.email) = candidates.email
   and t.id = (
     select id from public.tenants t2
      where t2.auth_user_id is null
        and lower(t2.email) = candidates.email
      order by t2.created_at asc
      limit 1
   );
