-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  user_name text not null,
  created_at timestamptz not null default now(),
  unique (client_id, user_name)
);

create index if not exists client_users_user_name_idx on client_users (user_name);

alter table clients enable row level security;
alter table client_users enable row level security;

-- Internal tool: open anon access (tighten later if you add auth)
create policy "clients_all" on clients
  for all using (true) with check (true);

create policy "client_users_all" on client_users
  for all using (true) with check (true);
