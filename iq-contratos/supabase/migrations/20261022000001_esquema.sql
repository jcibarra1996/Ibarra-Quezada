-- IQ Contratos: esquema base.
-- Toda tabla lleva org_id para aislar a cada organización con Row Level Security,
-- aunque la demo tenga una sola empresa.

create type rol_usuario as enum ('abogado', 'director_juridico', 'negocio');
create type estado_contrato as enum ('recibido', 'en_revision', 'en_negociacion', 'aprobado', 'firmado');
create type nivel_riesgo as enum ('alto', 'medio', 'bajo');
create type estado_hallazgo as enum ('pendiente', 'aceptado', 'editado', 'descartado');
create type tipo_hallazgo as enum ('desviacion_playbook', 'ajena_al_objeto', 'omision');
create type tipo_contrato as enum (
  'suministro', 'prestacion_servicios', 'obra', 'arrendamiento',
  'confidencialidad', 'compraventa', 'otro'
);
create type tipo_seccion as enum ('proemio', 'encabezado', 'antecedente', 'declaracion', 'clausula', 'cierre', 'anexo');
create type tipo_fecha as enum (
  'inicio_vigencia', 'fin_vigencia', 'renovacion_automatica', 'plazo_aviso', 'vencimiento', 'pago'
);
create type estado_alerta as enum ('activa', 'atendida', 'descartada');
create type estado_analisis as enum ('en_proceso', 'completado', 'error');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamptz not null default now()
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nombre text not null,
  correo_aviso text,
  unique (org_id, nombre)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  nombre text not null,
  puesto text,
  rol rol_usuario not null,
  area_id uuid references areas(id) on delete set null,
  creado_en timestamptz not null default now()
);

create table playbooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  tipo_contrato tipo_contrato not null,
  nombre text not null,
  actualizado_por uuid references profiles(id),
  actualizado_en timestamptz not null default now(),
  unique (org_id, tipo_contrato)
);

create table playbook_positions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  playbook_id uuid not null references playbooks(id) on delete cascade,
  tema text not null,
  preferida text not null default '',
  respaldo text not null default '',
  nunca_se_acepta text not null default '',
  clausula_modelo text not null default '',
  orden int not null default 0,
  actualizado_en timestamptz not null default now()
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  titulo text not null,
  contraparte text not null default '',
  tipo_contrato tipo_contrato,
  objeto text,
  estado estado_contrato not null default 'recibido',
  recibido_en timestamptz not null default now(),
  aprobado_en timestamptz,
  firmado_en timestamptz,
  area_responsable_id uuid references areas(id) on delete set null,
  version_actual_id uuid,
  riesgo_max nivel_riesgo,
  creado_por uuid references profiles(id),
  creado_en timestamptz not null default now()
);

create table contract_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  numero int not null,
  origen text not null check (origen in ('subida', 'contrapropuesta')),
  nombre_archivo text not null,
  storage_path text not null,
  mime text not null,
  sha256 text not null,
  tamano_bytes int not null,
  texto_extraido text not null,
  paginas int not null default 1,
  paginas_virtuales boolean not null default false,
  creado_por uuid references profiles(id),
  creado_en timestamptz not null default now(),
  unique (contract_id, numero)
);

alter table contracts
  add constraint contracts_version_actual_fk
  foreign key (version_actual_id) references contract_versions(id) on delete set null;

create table contract_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  version_id uuid not null references contract_versions(id) on delete cascade,
  orden int not null,
  tipo tipo_seccion not null,
  etiqueta text not null,
  titulo text,
  texto text not null,
  inicio int not null,
  fin int not null,
  pagina int not null default 1
);
create index on contract_sections (version_id, orden);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  version_id uuid not null references contract_versions(id) on delete cascade,
  estado estado_analisis not null default 'en_proceso',
  modelo text not null,
  version_prompt text not null,
  playbook_id uuid references playbooks(id) on delete set null,
  tipo_detectado tipo_contrato,
  objeto_detectado text,
  resumen_negocio text,
  hallazgos_descartados_sin_cita int not null default 0,
  error text,
  duracion_ms int,
  tokens_entrada int,
  tokens_salida int,
  solicitado_por uuid references profiles(id),
  creado_en timestamptz not null default now()
);
create index on analyses (version_id, creado_en desc);

create table findings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  section_id uuid references contract_sections(id) on delete set null,
  numero int not null,
  tipo tipo_hallazgo not null,
  clausula text not null,
  tema text not null,
  posicion_id uuid references playbook_positions(id) on delete set null,
  riesgo nivel_riesgo not null,
  cita text,
  cita_inicio int,
  cita_fin int,
  explicacion text not null,
  redaccion_propuesta text not null,
  referencias_normativas jsonb not null default '[]'::jsonb,
  estado estado_hallazgo not null default 'pendiente',
  texto_final text,
  nota_decision text,
  decidido_por uuid references profiles(id),
  decidido_en timestamptz,
  creado_en timestamptz not null default now(),
  -- Un hallazgo sobre texto existente siempre trae su cita ubicada en el documento.
  constraint findings_cita_ubicada check (
    tipo = 'omision' or (cita is not null and cita_inicio is not null and cita_fin is not null)
  )
);
create index on findings (contract_id);
create index on findings (analysis_id, numero);

create table key_dates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  analysis_id uuid references analyses(id) on delete cascade,
  tipo tipo_fecha not null,
  descripcion text not null,
  fecha date,
  regla text,
  dias_aviso int,
  clausula text,
  cita text,
  derivada boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on key_dates (contract_id);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  key_date_id uuid references key_dates(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  titulo text not null,
  fecha_limite date not null,
  avisos_dias int[] not null default '{90,30,7}',
  estado estado_alerta not null default 'activa',
  correo_activo boolean not null default false,
  atendida_por uuid references profiles(id),
  atendida_en timestamptz,
  creado_en timestamptz not null default now()
);
create index on alerts (org_id, fecha_limite);

create table comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  finding_id uuid references findings(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  audiencia text not null default 'equipo' check (audiencia in ('equipo', 'negocio')),
  cuerpo text not null check (length(cuerpo) between 1 and 4000),
  creado_en timestamptz not null default now()
);
create index on comments (contract_id, creado_en);

create table counterproposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  version_id uuid not null references contract_versions(id) on delete cascade,
  storage_path text not null,
  hallazgos_incluidos uuid[] not null default '{}',
  generado_por uuid references profiles(id),
  creado_en timestamptz not null default now()
);

-- Historial de cambios. Nunca guarda texto del contrato, solo qué pasó.
create table audit_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  actor_id uuid references profiles(id),
  accion text not null,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
create index on audit_events (contract_id, creado_en desc);

-- Bitácora de quién vio o descargó cada documento.
create table document_access_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  version_id uuid references contract_versions(id) on delete set null,
  counterproposal_id uuid references counterproposals(id) on delete set null,
  actor_id uuid references profiles(id),
  accion text not null check (accion in ('ver', 'descargar')),
  ip text,
  user_agent text,
  creado_en timestamptz not null default now()
);
