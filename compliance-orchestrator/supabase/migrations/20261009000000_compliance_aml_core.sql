-- =============================================================================
-- Compliance / AML orchestrator: núcleo de datos
--
-- Tablas: legal_entities, aml_screenings, compliance_documents, audit_logs.
-- RLS habilitado en todas. Por ahora solo administradores tienen acceso
-- (claim app_metadata.role = 'admin' en el JWT). El service_role de Supabase
-- ignora RLS y es el que usa el webhook de monitoreo continuo.
--
-- audit_logs es append-only: no hay políticas de UPDATE/DELETE y además un
-- trigger rechaza UPDATE, DELETE y TRUNCATE incluso para service_role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.entity_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.risk_level as enum ('low', 'medium', 'high');
create type public.document_status as enum ('pending_review', 'valid', 'expired', 'rejected');

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

  -- Normalizado en mayúsculas y sin espacios para que el UNIQUE sea confiable.
  constraint legal_entities_tax_id_normalized check (tax_id = upper(btrim(tax_id)) and tax_id !~ '\s'),
  -- Formato estructural del RFC mexicano: 3 letras (persona moral) o 4 letras
  -- (persona física), 6 dígitos de fecha y 3 caracteres de homoclave.
  -- Solo valida forma, no existencia ante el SAT.
  constraint legal_entities_rfc_format check (
    country <> 'MX' or tax_id ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'
  ),
  constraint legal_entities_tax_id_country_key unique (country, tax_id)
);

comment on table public.legal_entities is 'Personas morales o físicas sujetas a onboarding de crédito o validación de proveedor.';
comment on column public.legal_entities.tax_id is 'Identificador fiscal. Para country = MX es el RFC.';

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
create index compliance_documents_expiration_idx
  on public.compliance_documents (expiration_date)
  where expiration_date is not null;

-- -----------------------------------------------------------------------------
-- audit_logs (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  entity_id    uuid not null references public.legal_entities (id) on delete restrict,
  action_type  text not null check (action_type ~ '^[a-z][a-z0-9_.]*$'),
  description  text not null check (length(btrim(description)) > 0),
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

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function public.audit_logs_reject_mutation();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public.audit_logs_reject_mutation();

-- -----------------------------------------------------------------------------
-- Rol administrador
-- app_metadata solo se puede escribir con service_role, así que el usuario
-- no puede autoasignarse el rol.
-- -----------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.legal_entities       enable row level security;
alter table public.aml_screenings       enable row level security;
alter table public.compliance_documents enable row level security;
alter table public.audit_logs           enable row level security;

create policy "admins_all_legal_entities" on public.legal_entities
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins_all_aml_screenings" on public.aml_screenings
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins_all_compliance_documents" on public.compliance_documents
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- audit_logs: lectura e inserción, nunca edición ni borrado.
create policy "admins_select_audit_logs" on public.audit_logs
  for select to authenticated
  using ((select public.is_admin()));

create policy "admins_insert_audit_logs" on public.audit_logs
  for insert to authenticated
  with check ((select public.is_admin()));

revoke update, delete, truncate on public.audit_logs from anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC transaccionales
--
-- PostgREST ejecuta cada llamada en su propia transacción. Por eso el
-- registro del screening, el cambio de estado y la bitácora viven en una
-- sola función: o se escriben los tres o no se escribe ninguno.
-- SECURITY INVOKER: las políticas RLS de arriba siguen aplicando.
-- -----------------------------------------------------------------------------

-- Chequeo inicial: inserta screening, suspende si el riesgo es alto y deja
-- bitácora obligatoria.
create function public.record_aml_screening(
  p_entity_id          uuid,
  p_provider           text,
  p_risk_level         public.risk_level,
  p_raw_json_response  jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entity      public.legal_entities%rowtype;
  v_screening   public.aml_screenings%rowtype;
  v_new_status  public.entity_status;
begin
  select * into v_entity
    from public.legal_entities
   where id = p_entity_id
   for update;

  if not found then
    raise exception 'legal_entity % no existe o no es accesible', p_entity_id
      using errcode = 'no_data_found';
  end if;

  insert into public.aml_screenings (entity_id, provider, risk_level, raw_json_response, last_checked_at)
  values (p_entity_id, p_provider, p_risk_level, coalesce(p_raw_json_response, '{}'::jsonb), now())
  returning * into v_screening;

  v_new_status := v_entity.status;
  if p_risk_level = 'high' and v_entity.status <> 'suspended' then
    update public.legal_entities
       set status = 'suspended'
     where id = p_entity_id;
    v_new_status := 'suspended';
  end if;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    p_entity_id,
    'aml.initial_check',
    format(
      'Chequeo AML inicial con %s. Riesgo: %s. Screening %s. Estado de la entidad: %s -> %s.',
      p_provider, p_risk_level, v_screening.id, v_entity.status, v_new_status
    )
  );

  return jsonb_build_object(
    'screening', to_jsonb(v_screening),
    'previous_status', v_entity.status,
    'entity_status', v_new_status
  );
end;
$$;

-- Alerta de monitoreo continuo: actualiza el screening más reciente del
-- proveedor (o crea uno si no existe), suspende la entidad y deja bitácora.
-- Las alertas se acumulan en raw_json_response.alerts para no perder historial.
create function public.apply_aml_alert(
  p_entity_id  uuid,
  p_provider   text,
  p_alert      jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entity      public.legal_entities%rowtype;
  v_screening   public.aml_screenings%rowtype;
  v_alert       jsonb := jsonb_set(coalesce(p_alert, '{}'::jsonb), '{received_at}', to_jsonb(now()));
begin
  select * into v_entity
    from public.legal_entities
   where id = p_entity_id
   for update;

  if not found then
    raise exception 'legal_entity % no existe o no es accesible', p_entity_id
      using errcode = 'no_data_found';
  end if;

  select * into v_screening
    from public.aml_screenings
   where entity_id = p_entity_id
     and provider = p_provider
   order by last_checked_at desc
   limit 1
   for update;

  if found then
    update public.aml_screenings
       set risk_level = 'high',
           last_checked_at = now(),
           raw_json_response = jsonb_set(
             raw_json_response,
             '{alerts}',
             coalesce(raw_json_response -> 'alerts', '[]'::jsonb) || jsonb_build_array(v_alert)
           )
     where id = v_screening.id
     returning * into v_screening;
  else
    insert into public.aml_screenings (entity_id, provider, risk_level, raw_json_response, last_checked_at)
    values (p_entity_id, p_provider, 'high', jsonb_build_object('alerts', jsonb_build_array(v_alert)), now())
    returning * into v_screening;
  end if;

  update public.legal_entities
     set status = 'suspended'
   where id = p_entity_id;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    p_entity_id,
    'aml.monitoring_alert',
    format(
      'Alerta de monitoreo de %s (%s): %s. Screening %s marcado high. Estado de la entidad: %s -> suspended.',
      p_provider,
      coalesce(v_alert ->> 'list', 'lista no especificada'),
      coalesce(v_alert ->> 'description', 'sin descripción'),
      v_screening.id,
      v_entity.status
    )
  );

  return jsonb_build_object(
    'screening', to_jsonb(v_screening),
    'previous_status', v_entity.status,
    'entity_status', 'suspended'
  );
end;
$$;

-- Bitácora de fallos: deja rastro cuando el chequeo no pudo completarse
-- (por ejemplo, el proveedor AML no respondió).
create function public.log_audit_event(
  p_entity_id    uuid,
  p_action_type  text,
  p_description  text
)
returns public.audit_logs
language sql
security invoker
set search_path = ''
as $$
  insert into public.audit_logs (entity_id, action_type, description)
  values (p_entity_id, p_action_type, p_description)
  returning *;
$$;

revoke execute on function public.record_aml_screening(uuid, text, public.risk_level, jsonb) from public, anon;
revoke execute on function public.apply_aml_alert(uuid, text, jsonb) from public, anon;
revoke execute on function public.log_audit_event(uuid, text, text) from public, anon;

grant execute on function public.record_aml_screening(uuid, text, public.risk_level, jsonb) to authenticated, service_role;
grant execute on function public.apply_aml_alert(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.log_audit_event(uuid, text, text) to authenticated, service_role;
