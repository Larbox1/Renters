-- Contact messages: submissions from the public /contact form (name, email, message).
-- Anyone — including anonymous visitors — can submit; only admins can read.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

create table public.contact_messages (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null check (char_length(name) between 1 and 200),
  email      text        not null check (char_length(email) between 3 and 320),
  message    text        not null check (char_length(message) between 1 and 5000),
  locale     text,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "Anyone can submit a contact message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

create policy "Admins read contact messages"
  on public.contact_messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
