-- IQ Contratos: lo que ve el área de negocio y firma electrónica con Mifiel.

-- ---------------------------------------------------------------------------
-- El análisis de la IA (hallazgos, resumen, riesgos) es trabajo interno de Legal.
-- El área de negocio ve el estado de su solicitud, no los comentarios de la IA.
-- ---------------------------------------------------------------------------
drop policy org_lectura on analyses;
create policy legal_lectura on analyses for select to authenticated
  using (org_id = org_actual() and puede_validar());

drop policy org_lectura on findings;
create policy legal_lectura on findings for select to authenticated
  using (org_id = org_actual() and puede_validar());

-- El historial de decisiones sobre hallazgos y análisis tampoco se muestra a Negocio.
drop policy org_lectura on audit_events;
create policy org_lectura on audit_events for select to authenticated
  using (
    org_id = org_actual()
    and (puede_validar() or (accion not like 'hallazgo\_%' and accion not like 'analisis\_%'))
  );

-- Los comentarios internos de Legal ("equipo") solo los ve Legal; los dirigidos al
-- negocio, toda la organización. Cada quien ve siempre los suyos.
drop policy org_lectura on comments;
create policy org_lectura on comments for select to authenticated
  using (org_id = org_actual() and (puede_validar() or audiencia = 'negocio' or autor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Firma electrónica (Mifiel). Las escrituras son del sistema: el servidor habla con
-- Mifiel con la llave de la organización y registra aquí el resultado.
-- ---------------------------------------------------------------------------
create table signature_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  proveedor text not null default 'mifiel',
  entorno text not null check (entorno in ('sandbox', 'produccion')),
  externo_id text,
  estado text not null default 'enviado' check (estado in ('enviado', 'firmado', 'rechazado', 'cancelado', 'error')),
  -- [{nombre, correo, rfc, widget_id, firmado}]
  firmantes jsonb not null default '[]'::jsonb,
  archivo_path text not null,
  firmado_pdf_path text,
  firmado_xml_path text,
  error text,
  enviado_por uuid references profiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on signature_requests (contract_id, creado_en desc);
create unique index on signature_requests (proveedor, externo_id) where externo_id is not null;

alter table signature_requests enable row level security;
create policy org_lectura on signature_requests for select to authenticated using (org_id = org_actual());

alter table document_access_log
  add column signature_request_id uuid references signature_requests(id) on delete set null;
