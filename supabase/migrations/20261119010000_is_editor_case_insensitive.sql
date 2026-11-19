-- is_editor() runs with search_path = '' so the citext "=" operator (schema extensions) is not
-- found and the comparison silently fell back to case-sensitive text equality.
-- Compare lower-cased text explicitly so 'Ana@Example.com' matches 'ana@example.com'.
create or replace function public.is_editor()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors e
    where lower(e.email::text) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(auth.jwt() ->> 'email', '') <> ''
  );
$$;
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

-- Same idea for the editors table itself: store emails lower-cased.
alter table public.editors add constraint editors_email_lowercase check (email::text = lower(email::text));
