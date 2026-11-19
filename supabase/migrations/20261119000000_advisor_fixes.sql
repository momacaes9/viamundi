-- Fixes from the Supabase security/performance advisors (2026-11-19).

-- Trigger-only functions must not be callable through /rest/v1/rpc.
revoke execute on function public.handle_new_user()  from public, anon, authenticated;
revoke execute on function public.leads_rate_limit() from public, anon, authenticated;
-- Intentionally kept: public.is_editor() — RLS policies and the editor UI call it; it only
-- returns true/false for the caller's own JWT and reveals nothing else.

-- Indexes for foreign keys.
create index if not exists orders_program_id_idx  on public.orders (program_id);
create index if not exists orders_lead_id_idx     on public.orders (lead_id);
create index if not exists orders_verified_by_idx on public.orders (verified_by);
create index if not exists posts_author_id_idx    on public.posts (author_id);

-- One SELECT policy per role on programs (the FOR ALL policy also covered SELECT).
drop policy if exists programs_editor_write on public.programs;
create policy programs_editor_insert on public.programs
  for insert to authenticated with check (public.is_editor());
create policy programs_editor_update on public.programs
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy programs_editor_delete on public.programs
  for delete to authenticated using (public.is_editor());
