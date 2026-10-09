-- =============================================================================
-- Compliance / AML orchestrator: núcleo de datos (Postgres / Neon)
--
-- Control de acceso en dos capas:
--   1. La aplicación valida la sesión y abre cada transacción declarando un
--      rol en el GUC app.role ('auth', 'admin' o 'system') y quién actúa en
--      app.actor.
--   2. RLS forzado (FORCE ROW LEVEL SECURITY) en todas las tablas: incluso el
--      dueño de las tablas, que es el rol con el que se conecta la app en
--      Neon, solo ve y escribe lo que el rol declarado permite. Sin rol, nada.
--
-- audit_logs es append-only: sin políticas de UPDATE/DELETE y un trigger que
-- rechaza UPDATE, DELETE y TRUNCATE para cualquier rol.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- Contexto de la transacción
-- -----------------------------------------------------------------------------
create function public.app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.role', true), ''), 'none');
$$;

create function public.app_actor()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.actor', true), ''), 'sistema');
$$;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.entity_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.risk_level as enum ('low', 'medium', 'high');
create type public.document_status as enum ('pending_review', 'valid', 'expired', 'rejected');
create type public.party_type as enum ('legal_representative', 'shareholder', 'beneficial_owner');

-- -----------------------------------------------------------------------------
-- legal_entities
-- -----------------------------------------------------------------------------
create table public.legal_entities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  tax_id      text not null,
  country     char(2) not null default 'MX' check (country ~ '^[A-Z]{2}$'),
  status      public.entity_status not null default 'pending',
  created_at  timestamptz not null default now(),

  constraint legal_entities_tax_id_normalized check (tax_id = upper(btrim(tax_id)) and tax_id !~ '\s'),
  -- Formato estructural del RFC: 3 letras (persona moral) o 4 (persona
  -- física), 6 dígitos de fecha y 3 de homoclave. Solo forma, no existencia.
  constraint legal_entities_rfc_format check (
    country <> 'MX' or tax_id ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'
  ),
  constraint legal_entities_tax_id_country_key unique (country, tax_id)
);

-- -----------------------------------------------------------------------------
-- related_parties: representante legal, accionistas, beneficiario controlador
-- -----------------------------------------------------------------------------
create table public.related_parties (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid not null references public.legal_entities (id) on delete restrict,
  full_name   text not null check (length(btrim(full_name)) > 0),
  party_type  public.party_type not null,
  tax_id      text check (
    tax_id is null
    or (tax_id = upper(btrim(tax_id)) and tax_id ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$')
  ),
  created_at  timestamptz not null default now()
);

create index related_parties_entity_idx on public.related_parties (entity_id);

-- -----------------------------------------------------------------------------
-- aml_screenings
-- -----------------------------------------------------------------------------
create table public.aml_screenings (
  id                 uuid primary key default gen_random_uuid(),
  entity_id          uuid not null references public.legal_entities (id) on delete restrict,
  provider           text not null check (length(btrim(provider)) > 0),
  risk_level         public.risk_level not null,
  raw_json_response  jsonb not null default '{}'::jsonb,
  last_checked_at    timestamptz not null default now()
);

create index aml_screenings_entity_checked_idx
  on public.aml_screenings (entity_id, last_checked_at desc);

-- -----------------------------------------------------------------------------
-- compliance_documents
-- -----------------------------------------------------------------------------
create table public.compliance_documents (
  id               uuid primary key default gen_random_uuid(),
  entity_id        uuid not null references public.legal_entities (id) on delete restrict,
  doc_type         text not null check (length(btrim(doc_type)) > 0),
  file_path        text not null check (length(btrim(file_path)) > 0),
  expiration_date  date,
  status           public.document_status not null default 'pending_review'
);

create index compliance_documents_entity_idx on public.compliance_documents (entity_id);

-- -----------------------------------------------------------------------------
-- audit_logs (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  entity_id    uuid not null references public.legal_entities (id) on delete restrict,
  action_type  text not null check (action_type ~ '^[a-z][a-z0-9_.]*$'),
  description  text not null check (length(btrim(description)) > 0),
  actor        text not null default public.app_actor(),
  "timestamp"  timestamptz not null default now()
);

create index audit_logs_entity_timestamp_idx on public.audit_logs (entity_id, "timestamp" desc);

create function public.audit_logs_reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs es inmutable: % no está permitido', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- A nivel sentencia: RLS filtra las filas antes que un trigger por fila, así
-- que un UPDATE/DELETE "sin filas visibles" pasaría en silencio. Por
-- sentencia, cualquier intento falla con error.
create trigger audit_logs_no_mutation
  before update or delete or truncate on public.audit_logs
  for each statement execute function public.audit_logs_reject_mutation();

-- -----------------------------------------------------------------------------
-- Usuarios y sesiones (autenticación propia de la app)
-- La contraseña se guarda como hash scrypt generado en la app; la sesión se
-- guarda como SHA-256 del token, nunca el token en claro.
-- -----------------------------------------------------------------------------
create table public.app_users (
  id               uuid primary key default gen_random_uuid(),
  email            text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  password_hash    text not null,
  role             text not null default 'admin' check (role in ('admin')),
  failed_attempts  integer not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now(),
  constraint app_users_email_key unique (email)
);

create table public.app_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_users (id) on delete cascade,
  token_hash  bytea not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  constraint app_sessions_token_hash_key unique (token_hash)
);

create index app_sessions_user_idx on public.app_sessions (user_id);
create index app_sessions_expires_idx on public.app_sessions (expires_at);

-- -----------------------------------------------------------------------------
-- RLS forzado
-- -----------------------------------------------------------------------------
alter table public.legal_entities       enable row level security;
alter table public.related_parties      enable row level security;
alter table public.aml_screenings       enable row level security;
alter table public.compliance_documents enable row level security;
alter table public.audit_logs           enable row level security;
alter table public.app_users            enable row level security;
alter table public.app_sessions         enable row level security;

alter table public.legal_entities       force row level security;
alter table public.related_parties      force row level security;
alter table public.aml_screenings       force row level security;
alter table public.compliance_documents force row level security;
alter table public.audit_logs           force row level security;
alter table public.app_users            force row level security;
alter table public.app_sessions         force row level security;

create policy domain_all on public.legal_entities
  for all using (public.app_role() in ('admin', 'system')) with check (public.app_role() in ('admin', 'system'));
create policy domain_all on public.related_parties
  for all using (public.app_role() in ('admin', 'system')) with check (public.app_role() in ('admin', 'system'));
create policy domain_all on public.aml_screenings
  for all using (public.app_role() in ('admin', 'system')) with check (public.app_role() in ('admin', 'system'));
create policy domain_all on public.compliance_documents
  for all using (public.app_role() in ('admin', 'system')) with check (public.app_role() in ('admin', 'system'));

create policy audit_select on public.audit_logs
  for select using (public.app_role() in ('admin', 'system'));
create policy audit_insert on public.audit_logs
  for insert with check (public.app_role() in ('admin', 'system'));

-- Usuarios y sesiones: solo el flujo de autenticación y los scripts.
create policy auth_all on public.app_users
  for all using (public.app_role() in ('auth', 'system')) with check (public.app_role() in ('auth', 'system'));
create policy auth_all on public.app_sessions
  for all using (public.app_role() in ('auth', 'system')) with check (public.app_role() in ('auth', 'system'));
