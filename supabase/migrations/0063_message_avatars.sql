-- Surface profile avatars in the messaging RPCs so the conversation list and
-- chat header can show them. Return-row shapes change, so the functions are
-- dropped and recreated (create or replace cannot alter OUT parameters).
-- Additive columns only — existing clients (mobile app) ignore them.

-- ---------------------------------------------------------------------------
-- list_my_conversations(): + counterpart_avatar_url
-- ---------------------------------------------------------------------------
drop function if exists public.list_my_conversations();

create function public.list_my_conversations()
returns table (
  counterpart_id         uuid,
  counterpart_name       text,
  counterpart_email      text,
  counterpart_role       public.user_role,
  counterpart_avatar_url text,
  last_message_id        uuid,
  last_message_body      text,
  last_message_at        timestamptz,
  last_message_inbound   boolean,
  unread_count           int
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
    p.avatar_url,
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
-- get_counterpart_info(other_user_id): + avatar_url
-- ---------------------------------------------------------------------------
drop function if exists public.get_counterpart_info(uuid);

create function public.get_counterpart_info(other_user_id uuid)
returns table (
  id         uuid,
  full_name  text,
  email      text,
  role       public.user_role,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.full_name, u.email::text, p.role, p.avatar_url
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
