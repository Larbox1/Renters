-- Allow the sender to edit or delete their own messages — but only while
-- the recipient hasn't read them yet. The recipient's existing read-marker
-- policy stays untouched.
--
-- PostgreSQL combines policies of the same operation with OR, so adding a
-- second UPDATE policy widens what the sender can do without overriding
-- the recipient's read-marking permission.

create policy "Sender edits unread messages"
  on public.messages for update
  using (sender_id = auth.uid() and read_at is null)
  with check (sender_id = auth.uid());

create policy "Sender deletes unread messages"
  on public.messages for delete
  using (sender_id = auth.uid() and read_at is null);
