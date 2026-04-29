-- Storage policies for the message-attachments bucket.
--
-- Web uploads + reads via the service role (per 0009), so no policies were
-- needed there. The mobile client uses the anon key bound to the caller's
-- JWT, so we need explicit INSERT + SELECT policies. The bucket stays private.
--
-- Uploads: a user can write to objects whose path starts with their own
-- auth.uid() (matching the convention in lib/api/messages.ts uploadAttachment,
-- which puts files under "<sender_user_id>/<ts>_<filename>").
--
-- Reads: a user can read an object if either
--   (a) the path is in their own folder (so the sender can see their just-
--       uploaded files even before the message row exists), or
--   (b) they are sender or recipient of a message whose attachments JSONB
--       array references that path.
-- Wrapped in a SECURITY DEFINER function so the lookup against public.messages
-- doesn't fight RLS.

create or replace function public.can_access_message_attachment(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    object_path like (auth.uid()::text || '/%')
    or exists (
      select 1 from public.messages m
      where (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
        and exists (
          select 1
          from jsonb_array_elements(m.attachments) as a
          where a ->> 'path' = object_path
        )
    );
$$;

grant execute on function public.can_access_message_attachment(text) to authenticated;

drop policy if exists "users upload to own message-attachments folder"
  on storage.objects;

create policy "users upload to own message-attachments folder"
  on storage.objects for insert
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users read message attachments they're party to"
  on storage.objects;

create policy "users read message attachments they're party to"
  on storage.objects for select
  using (
    bucket_id = 'message-attachments'
    and public.can_access_message_attachment(name)
  );
