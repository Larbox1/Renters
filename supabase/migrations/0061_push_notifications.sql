-- Push notification infrastructure: device token registry + a database
-- trigger that pings the `push` edge function whenever a message is inserted.
-- The webhook secret lives in Vault (created out-of-band, never committed):
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_webhook_secret');

create extension if not exists pg_net with schema extensions;

-- ─── Device token registry ───────────────────────────────────────────────

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens"
  on public.push_tokens
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── Webhook secret accessor (service_role only; edge function calls it) ──

create or replace function public.get_push_webhook_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;
$$;

revoke all on function public.get_push_webhook_secret() from public;
revoke all on function public.get_push_webhook_secret() from anon;
revoke all on function public.get_push_webhook_secret() from authenticated;
grant execute on function public.get_push_webhook_secret() to service_role;

-- ─── Trigger: ping the push edge function on every new message ────────────

create or replace function public.notify_message_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;

  -- No secret configured (e.g. fresh local stack): skip silently rather
  -- than blocking the insert.
  if secret is null then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://cwjzjsfonhvcbednfaqm.supabase.co/functions/v1/push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', secret
      ),
      body := jsonb_build_object('message_id', new.id)
    );
  exception when others then
    null; -- push delivery must never break message sending
  end;

  return new;
end;
$$;

drop trigger if exists messages_notify_push on public.messages;
create trigger messages_notify_push
  after insert on public.messages
  for each row
  execute function public.notify_message_push();
