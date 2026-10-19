-- Run once in Supabase SQL Editor, in the Meu Zé project.
-- The server uses SUPABASE_SERVICE_ROLE_KEY; clients must never access this table.
create table if not exists public.push_devices (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  constraint push_token_length check (length(token) between 30 and 4096)
);
create index if not exists push_devices_user_id_idx on public.push_devices (user_id);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
-- No RLS policies: only the service role can read/write device tokens.
