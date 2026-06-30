-- Admins can read every document (migration 0031, "Admins read all documents")
-- but the only DELETE policy is owner-scoped (owner_id = auth.uid()). So when an
-- admin deletes a document they don't own, RLS silently removes 0 rows with no
-- error: the action cleans up the storage file but the row survives and the
-- document keeps showing. Add an admin DELETE policy mirroring the read policy.
-- Apply via: paste into the Supabase SQL Editor (Dashboard → SQL Editor → Run).

create policy "Admins delete all documents"
  on public.documents for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
