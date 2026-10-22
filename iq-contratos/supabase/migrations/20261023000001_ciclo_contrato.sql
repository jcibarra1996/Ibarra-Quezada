-- IQ Contratos: ciclo de vida del contrato.
--  * Expedientes corporativos de cada parte (la propia empresa y sus contrapartes) con
--    sus documentos: acta constitutiva, poderes, constancia de situación fiscal, etc.
--  * Plantillas de contrato de la dirección legal, que se llenan con el expediente.
--  * Solicitudes del área de negocio y verificación de declaraciones contra el expediente.
--  * Organizaciones de demostración, que permiten cambiar de perfil.

alter table organizations add column es_demo boolean not null default false;

create type tipo_documento_corporativo as enum (
  'acta_constitutiva', 'reforma_estatutos', 'poder', 'constancia_fiscal',
  'identificacion', 'comprobante_domicilio', 'otro'
);
create type estado_validacion as enum ('por_validar', 'validado');
create type estado_extraccion as enum ('en_proceso', 'completado', 'error');

-- Discrepancias entre las declaraciones del contrato y el expediente corporativo.
-- Siempre van ancladas a un fragmento de las declaraciones (la regla de cita ubicada aplica).
alter type tipo_hallazgo add value if not exists 'dato_corporativo';

create table companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  -- La empresa que usa la herramienta (puede tener más de una razón social).
  es_propia boolean not null default false,
  tipo_persona text not null default 'moral' check (tipo_persona in ('moral', 'fisica')),
  denominacion text not null check (length(trim(denominacion)) between 2 and 300),
  rfc text,
  -- Campos del expediente (ver lib/corporativo/campos.ts) y de qué documento sale cada uno.
  datos jsonb not null default '{}'::jsonb,
  fuentes jsonb not null default '{}'::jsonb,
  estado estado_validacion not null default 'por_validar',
  validado_por uuid references profiles(id),
  validado_en timestamptz,
  creado_por uuid references profiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on companies (org_id, denominacion);

create table corporate_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  tipo tipo_documento_corporativo not null,
  nombre_archivo text not null,
  storage_path text not null,
  mime text not null,
  sha256 text not null,
  tamano_bytes int not null,
  -- No se guarda el texto del documento: solo los datos que se extrajeron de él.
  estado estado_extraccion not null default 'en_proceso',
  error text,
  datos_extraidos jsonb not null default '{}'::jsonb,
  resumen text,
  modelo text,
  creado_por uuid references profiles(id),
  creado_en timestamptz not null default now()
);
create index on corporate_documents (company_id, creado_en desc);

create table templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  tipo_contrato tipo_contrato not null,
  nombre text not null,
  descripcion text not null default '',
  -- Las dos partes del contrato: [{clave, termino, etiqueta}]
  roles jsonb not null,
  -- Datos del negocio que pide la solicitud: [{clave, etiqueta, tipo, ayuda, requerido}]
  campos jsonb not null default '[]'::jsonb,
  cuerpo text not null,
  version int not null default 1,
  activa boolean not null default true,
  actualizado_por uuid references profiles(id),
  actualizado_en timestamptz not null default now(),
  unique (org_id, nombre)
);

alter table contracts
  add column contraparte_id uuid references companies(id) on delete set null,
  add column propia_id uuid references companies(id) on delete set null,
  add column plantilla_id uuid references templates(id) on delete set null,
  add column solicitado_por uuid references profiles(id),
  add column datos_solicitud jsonb not null default '{}'::jsonb;

alter table contract_versions drop constraint contract_versions_origen_check;
alter table contract_versions add constraint contract_versions_origen_check
  check (origen in ('subida', 'contrapropuesta', 'plantilla'));

alter table audit_events add column company_id uuid references companies(id) on delete cascade;
create index on audit_events (company_id, creado_en desc);
alter table document_access_log
  add column corporate_document_id uuid references corporate_documents(id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table companies enable row level security;
alter table corporate_documents enable row level security;
alter table templates enable row level security;

create policy org_lectura on companies for select to authenticated using (org_id = org_actual());
create policy org_lectura on corporate_documents for select to authenticated using (org_id = org_actual());
create policy org_lectura on templates for select to authenticated using (org_id = org_actual());

-- Cualquier integrante (también quien solicita desde el negocio) abre expedientes y corrige
-- datos; el trigger regresa el expediente a "por validar" si quien cambia no es de Legal.
create policy miembro_crea on companies for insert to authenticated
  with check (org_id = org_actual() and creado_por = auth.uid());
create policy miembro_actualiza on companies for update to authenticated
  using (org_id = org_actual()) with check (org_id = org_actual());

-- Las plantillas son de la dirección jurídica.
create policy director_escribe on templates for all to authenticated
  using (org_id = org_actual() and es_director())
  with check (org_id = org_actual() and es_director());

-- ---------------------------------------------------------------------------
-- Reglas del expediente
-- ---------------------------------------------------------------------------
create or replace function public.trg_expediente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cambio boolean;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.es_propia := false;
      new.estado := 'por_validar';
      new.validado_por := null;
      new.validado_en := null;
    end if;
    return new;
  end if;

  if auth.uid() is not null and (new.org_id, new.es_propia, new.creado_por, new.creado_en)
     is distinct from (old.org_id, old.es_propia, old.creado_por, old.creado_en) then
    raise exception 'Ese dato del expediente lo administra el sistema.';
  end if;

  v_cambio := (new.datos, new.denominacion, new.rfc, new.tipo_persona)
              is distinct from (old.datos, old.denominacion, old.rfc, old.tipo_persona);

  -- Solo Legal valida. Si alguien más cambia datos, el expediente vuelve a revisión.
  if auth.uid() is not null and not puede_validar() then
    if new.estado = 'validado' and old.estado <> 'validado' then
      raise exception 'Solo Legal puede validar un expediente corporativo.';
    end if;
    if v_cambio then
      new.estado := 'por_validar';
    end if;
  end if;

  if new.estado = 'validado' and (old.estado <> 'validado' or v_cambio) then
    new.validado_por := coalesce(auth.uid(), new.validado_por);
    new.validado_en := now();
  elsif new.estado = 'por_validar' then
    new.validado_por := null;
    new.validado_en := null;
  end if;
  new.actualizado_en := now();

  if new.estado is distinct from old.estado or v_cambio then
    insert into audit_events (org_id, company_id, actor_id, accion, detalle)
    values (new.org_id, new.id, auth.uid(),
            case when new.estado is distinct from old.estado then 'expediente_' || new.estado else 'expediente_actualizado' end,
            jsonb_build_object('campos', (
              select coalesce(jsonb_agg(k), '[]'::jsonb) from (
                select key as k from jsonb_each(new.datos)
                where new.datos -> key is distinct from old.datos -> key
                union
                select key from jsonb_each(old.datos) where not new.datos ? key
              ) c)));
  end if;
  return new;
end $$;

create trigger expediente before insert or update on companies
  for each row execute function trg_expediente();

create or replace function public.trg_plantilla_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.cuerpo, new.campos, new.roles, new.nombre, new.descripcion)
     is distinct from (old.cuerpo, old.campos, old.roles, old.nombre, old.descripcion) then
    new.version := old.version + 1;
  end if;
  new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  new.actualizado_en := now();
  return new;
end $$;

create trigger plantilla_version before update on templates
  for each row execute function trg_plantilla_version();

revoke execute on function public.trg_expediente() from public, anon, authenticated;
revoke execute on function public.trg_plantilla_version() from public, anon, authenticated;

-- Los documentos corporativos se guardan en el mismo almacenamiento privado. Las
-- identificaciones y comprobantes suelen llegar como fotografía.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]
where id = 'contratos';
