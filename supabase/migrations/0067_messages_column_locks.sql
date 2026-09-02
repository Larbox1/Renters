-- SECURITY: column-scope message edits and pin attachment paths to the sender.
--
-- Two defects in the 0008/0010 UPDATE policies (both row-scoped only):
--   1. "Recipient marks own messages" was meant for read_at but allowed the
--      recipient to rewrite body/subject/sender_id — fabricating messages
--      "sent" by the landlord/tenant (these are evidence in rental disputes).
--   2. "Sender edits unread messages" allowed rewriting `attachments` to
--      reference other users' storage paths, which both the storage policy
--      (0020) and the web app's service-role signing trusted — an attachment
--      IDOR. It also allowed repointing recipient_id past can_message().
--
-- Fix: a trigger adds the column scoping the policies lack (policies stay for
-- row scoping). For non-service-role callers:
--   * UPDATE: sender_id, recipient_id, created_at, attachments are frozen;
--     a pure recipient may additionally only change read_at.
--   * INSERT/UPDATE: every attachments[].path must live under the sender's
--     own storage prefix ("<sender_id>/..."), matching how both apps upload.

create or replace function public.protect_message_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  att jsonb;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Immutable once sent, for everyone but the service role.
    new.sender_id    := old.sender_id;
    new.recipient_id := old.recipient_id;
    new.created_at   := old.created_at;
    new.attachments  := old.attachments;

    -- A pure recipient (not also the sender) may only mark read state.
    if auth.uid() = old.recipient_id and auth.uid() is distinct from old.sender_id then
      new.body    := old.body;
      new.subject := old.subject;
    end if;
    return new;
  end if;

  -- INSERT: attachment paths must belong to the sender's own prefix.
  if new.attachments is not null then
    if jsonb_typeof(new.attachments) <> 'array' then
      raise exception 'attachments must be a JSON array';
    end if;
    for att in select * from jsonb_array_elements(new.attachments) loop
      if att ->> 'path' is null
         or att ->> 'path' not like (new.sender_id::text || '/%') then
        raise exception 'attachment path must start with the sender id';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_message_columns on public.messages;
create trigger protect_message_columns
  before insert or update on public.messages
  for each row
  execute function public.protect_message_columns();
