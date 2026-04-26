-- Upgrade messaging into a conversation model with attachments.
--   * attachments: jsonb array on messages — [{path,name,mime_type,size}, ...]
--   * private storage bucket "message-attachments" — files only readable via
--     server-side signed URLs (uploads + reads happen via the service role,
--     so no RLS policies on storage.objects are needed).
--   * helper RPCs to power the conversation UI.

-- ---------------------------------------------------------------------------
-- Attachments column
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- Private storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- list_my_conversations(): one row per conversation partner.
-- Latest message preview + unread count per conversation, sorted by recency.
-- ---------------------------------------------------------------------------
create or replace function public.list_my_conversations()
returns table (
  counterpart_id        uuid,
  counterpart_name      text,
  counterpart_email     text,
  counterpart_role      public.user_role,
  last_message_id       uuid,
  last_message_body     text,
  last_message_at       timestamptz,
  last_message_inbound  boolean,
  unread_count          int
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with my_msgs as (
    select
      m.id, m.body, m.created_at, m.read_at,
      case when m.sender_id = auth.uid()
        then m.recipient_id else m.sender_id end as counterpart_id,
      m.sender_id = auth.uid() as is_outbound
    from public.messages m
    where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  ),
  ranked as (
    select
      counterpart_id, id, body, created_at, is_outbound,
      row_number() over (
        partition by counterpart_id order by created_at desc
      ) as rn
    from my_msgs
  ),
  unread as (
    select counterpart_id, count(*)::int as cnt
    from my_msgs
    where not is_outbound and read_at is null
    group by counterpart_id
  )
  select
    r.counterpart_id,
    p.full_name,
    u.email::text,
    p.role,
    r.id,
    r.body,
    r.created_at,
    not r.is_outbound,
    coalesce(unr.cnt, 0)
  from ranked r
  join auth.users u on u.id = r.counterpart_id
  left join public.profiles p on p.id = r.counterpart_id
  left join unread unr on unr.counterpart_id = r.counterpart_id
  where r.rn = 1
  order by r.created_at desc;
$$;

grant execute on function public.list_my_conversations() to authenticated;

-- ---------------------------------------------------------------------------
-- list_conversation_messages(other_user_id): all messages between caller and
-- the other user, oldest first (chat order).
-- ---------------------------------------------------------------------------
create or replace function public.list_conversation_messages(other_user_id uuid)
returns table (
  id           uuid,
  sender_id    uuid,
  recipient_id uuid,
  subject      text,
  body         text,
  attachments  jsonb,
  read_at      timestamptz,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.sender_id,
    m.recipient_id,
    m.subject,
    m.body,
    m.attachments,
    m.read_at,
    m.created_at
  from public.messages m
  where (m.sender_id = auth.uid() and m.recipient_id = other_user_id)
     or (m.sender_id = other_user_id and m.recipient_id = auth.uid())
  order by m.created_at asc;
$$;

grant execute on function public.list_conversation_messages(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_counterpart_info(other_user_id): name/email/role of the other party.
-- Returns a row only if the caller has either exchanged messages with them
-- or is currently allowed to (so the conversation header works for new
-- conversations too).
-- ---------------------------------------------------------------------------
create or replace function public.get_counterpart_info(other_user_id uuid)
returns table (
  id        uuid,
  full_name text,
  email     text,
  role      public.user_role
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.full_name, u.email::text, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = other_user_id
    and (
      exists (
        select 1 from public.messages m
        where (m.sender_id = auth.uid() and m.recipient_id = other_user_id)
           or (m.sender_id = other_user_id and m.recipient_id = auth.uid())
      )
      or public.can_message(auth.uid(), other_user_id)
    );
$$;

grant execute on function public.get_counterpart_info(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_conversation_read(other_user_id): bulk-mark received messages from
-- this counterpart as read.
-- ---------------------------------------------------------------------------
create or replace function public.mark_conversation_read(other_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
  set read_at = now()
  where recipient_id = auth.uid()
    and sender_id = other_user_id
    and read_at is null;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;
