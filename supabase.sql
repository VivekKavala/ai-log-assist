-- Run once in Supabase: SQL Editor -> New query
create table if not exists feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  useful boolean not null,
  format text,
  summary text,
  sources text[]
);
alter table feedback enable row level security; -- no policies: only the server (service key) can access
