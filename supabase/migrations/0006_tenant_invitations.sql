-- Allow a tenant record to be linked to an auth.users entry once the tenant
-- has been invited via Supabase auth (inviteUserByEmail). The link is set
-- by the createTenantAction server action when an email is provided.

alter table public.tenants
  add column if not exists auth_user_id uuid
    references auth.users(id) on delete set null;

-- One tenant record per auth user (many tenants can have NULL auth_user_id).
create unique index if not exists tenants_auth_user_id_unique
  on public.tenants(auth_user_id)
  where auth_user_id is not null;
