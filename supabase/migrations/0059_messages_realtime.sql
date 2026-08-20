-- Enable Realtime for messages. The mobile chat screen has subscribed to
-- postgres_changes on public.messages since day one, but the
-- supabase_realtime publication contained no tables, so no events were ever
-- delivered — chat only updated on manual refresh. Postgres-changes events
-- respect RLS, so users only receive events for conversations they're in.
--
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

alter publication supabase_realtime add table public.messages;
