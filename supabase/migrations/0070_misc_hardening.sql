-- Assorted hardening (mediums/lows from the security audit).

-- 1. finance_transactions had SELECT/INSERT/DELETE policies but no UPDATE
--    policy, so edits silently affected 0 rows while the UI reported success
--    (functional bug, fails closed). Add the owner-scoped UPDATE policy.
drop policy if exists "Owners update own finance transactions"
  on public.finance_transactions;
create policy "Owners update own finance transactions"
  on public.finance_transactions for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 2. profiles.avatar_url is free text and rendered as a remote <img> to the
--    counterpart — an arbitrary URL leaks the viewer's IP + read time (a
--    tracking beacon). Google account pictures (googleusercontent.com) are
--    seeded once at signup via handle_new_user (an INSERT, unaffected here);
--    thereafter a non-service-role UPDATE may only set null or an avatars-
--    bucket public URL (what the app's own upload writes). Any other change
--    is reverted rather than rejected, so unrelated profile edits still work.
create or replace function public.protect_profile_avatar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and new.avatar_url is distinct from old.avatar_url
     and new.avatar_url is not null
     and new.avatar_url not like
       'https://cwjzjsfonhvcbednfaqm.supabase.co/storage/v1/object/public/avatars/%'
  then
    new.avatar_url := old.avatar_url;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_avatar on public.profiles;
create trigger protect_profile_avatar
  before update on public.profiles
  for each row
  execute function public.protect_profile_avatar();

-- 3. avatars is a public bucket with no size/type limit — any authenticated
--    user could host arbitrary content (incl. text/html) of arbitrary size on
--    the project domain. Cap it: 5 MB, images only.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'avatars';

-- 4. Webhook idempotency ledger (used by revenuecat-webhook to drop replays).
--    Service-role only — no client ever touches it.
create table if not exists public.webhook_events (
  event_id text primary key,
  source text not null default 'revenuecat',
  received_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;
-- No policies → deny-all for anon/authenticated; the service role bypasses RLS.
