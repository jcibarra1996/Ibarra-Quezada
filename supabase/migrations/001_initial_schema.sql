-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique,
  role        text not null,
  department  text not null,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Contracts table
create table public.contracts (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  expiration_date  date not null,
  area_id          uuid not null references public.profiles(id) on delete restrict,
  status           text not null check (status in ('active', 'expired', 'pending', 'cancelled')),
  file_url         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.contracts enable row level security;

create policy "Authenticated users can view contracts"
  on public.contracts for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert contracts"
  on public.contracts for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update contracts"
  on public.contracts for update
  using (auth.role() = 'authenticated');

-- Notifications log table
create table public.notifications_log (
  id           uuid primary key default uuid_generate_v4(),
  contract_id  uuid not null references public.contracts(id) on delete cascade,
  sent_at      timestamptz not null default now()
);

alter table public.notifications_log enable row level security;

create policy "Authenticated users can view notification logs"
  on public.notifications_log for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert notification logs"
  on public.notifications_log for insert
  with check (auth.role() = 'authenticated');

-- Auto-update updated_at on contracts
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contracts_updated_at
  before update on public.contracts
  for each row execute procedure public.set_updated_at();
