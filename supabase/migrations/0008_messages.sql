-- Messaging system.
-- Rules enforced by can_message():
--   * admin ↔ anyone
--   * owner ↔ their invited tenants (tenants.owner_id = owner & tenants.auth_user_id = tenant)
--   * tenant ↔ their owner
-- Service providers can only correspond with admins.
-- Anyone is allowed to message an admin (so service providers can reach support).

-- ---------------------------------------------------------------------------
-- Messages table
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid        primary key default gen_random_uuid(),
  sender_id    uuid        not null references auth.users(id) on delete cascade,
  recipient_id uuid        not null references auth.users(id) on delete cascade,
  subject      text,
  body         text        not null check (length(trim(body)) > 0),
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists messages_recipient_created_idx
  on public.messages(recipient_id, created_at desc);
create index if not exists messages_sender_created_idx
  on public.messages(sender_id, created_at desc);

-- ---------------------------------------------------------------------------
-- can_message(sender, recipient): is this pair allowed to exchange messages?
-- Used by the INSERT RLS policy.
-- ---------------------------------------------------------------------------
create or replace function public.can_message(sender uuid, recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    sender is not null
    and recipient is not null
    and sender <> recipient
    and (
      -- sender is admin
      exists (select 1 from public.profiles where id = sender   and role = 'admin')
      -- recipient is admin
      or exists (select 1 from public.profiles where id = recipient and role = 'admin')
      -- sender is owner of a tenant whose auth user is recipient
      or exists (
        select 1 from public.tenants t
        where t.owner_id = sender and t.auth_user_id = recipient
      )
      -- sender is a tenant whose owner is recipient
      or exists (
        select 1 from public.tenants t
        where t.auth_user_id = sender and t.owner_id = recipient
      )
    );
$$;

grant execute on function public.can_message(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "Read own conversations"
  on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Send to allowed recipients"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.can_message(auth.uid(), recipient_id)
  );

-- The recipient can mark a message as read (UPDATE read_at). No body edits.
create policy "Recipient marks own messages"
  on public.messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- messageable_recipients(): contacts the caller is allowed to message.
-- ---------------------------------------------------------------------------
create or replace function public.messageable_recipients()
returns table (
  id        uuid,
  full_name text,
  email     text,
  role      public.user_role
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  caller uuid := auth.uid();
  caller_role public.user_role;
begin
  if caller is null then
    return;
  end if;

  select p.role into caller_role from public.profiles p where p.id = caller;
  if caller_role is null then
    return;
  end if;

  if caller_role = 'admin' then
    return query
    select p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id <> caller
    order by p.role, p.full_name nulls last, u.email;

  elsif caller_role = 'owner' then
    return query
    select distinct p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id <> caller
      and (
        p.role = 'admin'
        or p.id in (
          select t.auth_user_id from public.tenants t
          where t.owner_id = caller and t.auth_user_id is not null
        )
      )
    order by p.role, p.full_name nulls last, u.email;

  elsif caller_role = 'tenant' then
    return query
    select distinct p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id <> caller
      and (
        p.role = 'admin'
        or p.id in (
          select t.owner_id from public.tenants t
          where t.auth_user_id = caller
        )
      )
    order by p.role, p.full_name nulls last, u.email;

  elsif caller_role = 'service_provider' then
    -- Service providers can only message admins.
    return query
    select p.id, p.full_name, u.email::text, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'admin' and p.id <> caller
    order by p.full_name nulls last, u.email;
  end if;
end;
$$;

grant execute on function public.messageable_recipients() to authenticated;

-- ---------------------------------------------------------------------------
-- list_my_messages(): hydrated list of caller's messages (sent + received).
-- ---------------------------------------------------------------------------
create or replace function public.list_my_messages()
returns table (
  id              uuid,
  sender_id       uuid,
  sender_name     text,
  sender_email    text,
  recipient_id    uuid,
  recipient_name  text,
  recipient_email text,
  subject         text,
  body            text,
  read_at         timestamptz,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    m.id,
    m.sender_id,
    sp.full_name as sender_name,
    su.email::text as sender_email,
    m.recipient_id,
    rp.full_name as recipient_name,
    ru.email::text as recipient_email,
    m.subject,
    m.body,
    m.read_at,
    m.created_at
  from public.messages m
  join auth.users su on su.id = m.sender_id
  join auth.users ru on ru.id = m.recipient_id
  left join public.profiles sp on sp.id = m.sender_id
  left join public.profiles rp on rp.id = m.recipient_id
  where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  order by m.created_at desc;
$$;

grant execute on function public.list_my_messages() to authenticated;
