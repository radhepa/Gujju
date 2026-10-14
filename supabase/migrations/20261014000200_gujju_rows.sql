-- Applied to the Supabase project on 2026-10-14. Safe to re-run.
-- Gujju sync: one row per local record (a lesson, a review card, a day, a
-- book, the settings), private to the account that wrote it. The project is
-- shared with other apps; this table is Gujju's alone.
create table if not exists public.gujju_rows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tbl text not null check (tbl in ('lesson', 'card', 'day', 'book', 'settings')),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, tbl, id),
  -- A pasted book is the biggest thing stored; keep any one row well bounded.
  constraint gujju_rows_size check (pg_column_size(data) < 2000000)
);

create index if not exists gujju_rows_user_updated on public.gujju_rows (user_id, updated_at);

-- The server stamps every write, so "what changed since X" works across
-- devices whose clocks disagree.
create or replace function public.gujju_rows_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists gujju_rows_stamp on public.gujju_rows;
create trigger gujju_rows_stamp before insert or update on public.gujju_rows
for each row execute function public.gujju_rows_stamp();

alter table public.gujju_rows enable row level security;

drop policy if exists "gujju: read own" on public.gujju_rows;
drop policy if exists "gujju: insert own" on public.gujju_rows;
drop policy if exists "gujju: update own" on public.gujju_rows;
drop policy if exists "gujju: delete own" on public.gujju_rows;
create policy "gujju: read own" on public.gujju_rows for select to authenticated using (user_id = (select auth.uid()));
create policy "gujju: insert own" on public.gujju_rows for insert to authenticated with check (user_id = (select auth.uid()));
create policy "gujju: update own" on public.gujju_rows for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "gujju: delete own" on public.gujju_rows for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.gujju_rows from anon;
revoke all on public.gujju_rows from public;
grant select, insert, update, delete on public.gujju_rows to authenticated;
-- Supabase's default grants also give TRUNCATE, which skips row-level security.
revoke truncate, references, trigger on public.gujju_rows from authenticated;
