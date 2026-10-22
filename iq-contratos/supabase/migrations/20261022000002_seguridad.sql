-- IQ Contratos: Row Level Security y reglas de negocio aplicadas en la base de datos.
--
-- Criterio de escritura:
--  * Lecturas: siempre con la sesión del usuario, filtradas por RLS a su organización.
--  * Decisiones humanas (validar hallazgos, cambiar estado, comentar, editar playbook):
--    con la sesión del usuario; RLS y triggers verifican el rol.
--  * Escrituras del sistema (procesar una subida, guardar un análisis, bitácora):
--    solo desde el servidor con la llave secreta, después de verificar la sesión.

create or replace function public.org_actual() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from profiles where id = auth.uid()
$$;

create or replace function public.rol_actual() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from profiles where id = auth.uid()
$$;

create or replace function public.puede_validar() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('abogado', 'director_juridico') from profiles where id = auth.uid()), false)
$$;

create or replace function public.es_director() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'director_juridico' from profiles where id = auth.uid()), false)
$$;

-- Activar RLS en todas las tablas.
alter table organizations enable row level security;
alter table areas enable row level security;
alter table profiles enable row level security;
alter table playbooks enable row level security;
alter table playbook_positions enable row level security;
alter table contracts enable row level security;
alter table contract_versions enable row level security;
alter table contract_sections enable row level security;
alter table analyses enable row level security;
alter table findings enable row level security;
alter table key_dates enable row level security;
alter table alerts enable row level security;
alter table comments enable row level security;
alter table counterproposals enable row level security;
alter table audit_events enable row level security;
alter table document_access_log enable row level security;

-- Lectura dentro de la propia organización.
create policy org_lectura on organizations for select to authenticated using (id = org_actual());
create policy org_lectura on areas for select to authenticated using (org_id = org_actual());
create policy org_lectura on profiles for select to authenticated using (org_id = org_actual());
create policy org_lectura on playbooks for select to authenticated using (org_id = org_actual());
create policy org_lectura on playbook_positions for select to authenticated using (org_id = org_actual());
create policy org_lectura on contracts for select to authenticated using (org_id = org_actual());
create policy org_lectura on contract_versions for select to authenticated using (org_id = org_actual());
create policy org_lectura on contract_sections for select to authenticated using (org_id = org_actual());
create policy org_lectura on analyses for select to authenticated using (org_id = org_actual());
create policy org_lectura on findings for select to authenticated using (org_id = org_actual());
create policy org_lectura on key_dates for select to authenticated using (org_id = org_actual());
create policy org_lectura on alerts for select to authenticated using (org_id = org_actual());
create policy org_lectura on comments for select to authenticated using (org_id = org_actual());
create policy org_lectura on counterproposals for select to authenticated using (org_id = org_actual());
create policy org_lectura on audit_events for select to authenticated using (org_id = org_actual());
-- La bitácora de accesos solo la consulta el director jurídico.
create policy director_lectura on document_access_log for select to authenticated
  using (org_id = org_actual() and es_director());

-- Playbook: solo el director jurídico lo modifica.
create policy director_escribe on playbooks for all to authenticated
  using (org_id = org_actual() and es_director())
  with check (org_id = org_actual() and es_director());
create policy director_escribe on playbook_positions for all to authenticated
  using (org_id = org_actual() and es_director())
  with check (org_id = org_actual() and es_director());

-- Contratos: abogado y director cambian estado y datos generales. Negocio solo lee.
create policy legal_actualiza on contracts for update to authenticated
  using (org_id = org_actual() and puede_validar())
  with check (org_id = org_actual() and puede_validar());

-- Hallazgos: solo abogado y director validan.
create policy legal_valida on findings for update to authenticated
  using (org_id = org_actual() and puede_validar())
  with check (org_id = org_actual() and puede_validar());

-- Alertas: abogado y director las marcan como atendidas o reasignan área.
create policy legal_actualiza on alerts for update to authenticated
  using (org_id = org_actual() and puede_validar())
  with check (org_id = org_actual() and puede_validar());

-- Comentarios: cualquier miembro de la organización comenta con su propio nombre.
create policy miembro_comenta on comments for insert to authenticated
  with check (org_id = org_actual() and autor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reglas sobre hallazgos
-- ---------------------------------------------------------------------------

create or replace function public.trg_hallazgo_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Cuando la escritura viene de un usuario (no del servidor), solo puede tocar la decisión.
  if auth.uid() is not null then
    if (new.org_id, new.analysis_id, new.contract_id, new.section_id, new.numero, new.tipo,
        new.clausula, new.tema, new.posicion_id, new.riesgo, new.cita, new.cita_inicio,
        new.cita_fin, new.explicacion, new.redaccion_propuesta, new.referencias_normativas)
       is distinct from
       (old.org_id, old.analysis_id, old.contract_id, old.section_id, old.numero, old.tipo,
        old.clausula, old.tema, old.posicion_id, old.riesgo, old.cita, old.cita_inicio,
        old.cita_fin, old.explicacion, old.redaccion_propuesta, old.referencias_normativas) then
      raise exception 'Solo se puede registrar la decisión sobre el hallazgo.';
    end if;
  end if;

  if new.estado is distinct from old.estado or new.texto_final is distinct from old.texto_final then
    if new.estado = 'pendiente' then
      new.texto_final := null;
      new.decidido_por := null;
      new.decidido_en := null;
    else
      if new.estado = 'aceptado' then
        new.texto_final := old.redaccion_propuesta;
      elsif new.estado = 'editado' then
        if new.texto_final is null or length(trim(new.texto_final)) = 0 then
          raise exception 'Un hallazgo editado necesita el texto final.';
        end if;
      elsif new.estado = 'descartado' then
        new.texto_final := null;
      end if;
      new.decidido_por := coalesce(auth.uid(), new.decidido_por);
      new.decidido_en := now();
    end if;

    insert into audit_events (org_id, contract_id, actor_id, accion, detalle)
    values (new.org_id, new.contract_id, coalesce(auth.uid(), new.decidido_por), 'hallazgo_' || new.estado,
            jsonb_build_object('hallazgo', new.numero, 'clausula', new.clausula, 'tema', new.tema,
                               'riesgo', new.riesgo, 'estado_anterior', old.estado));
  end if;
  return new;
end $$;

create trigger hallazgo_decision before update on findings
  for each row execute function trg_hallazgo_decision();

-- ---------------------------------------------------------------------------
-- Reglas sobre el estado del contrato
-- ---------------------------------------------------------------------------

create or replace function public.analisis_vigente(p_contract uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select a.id
  from contracts c
  join analyses a on a.version_id = c.version_actual_id and a.estado = 'completado'
  where c.id = p_contract
  order by a.creado_en desc
  limit 1
$$;

create or replace function public.altos_pendientes(p_contract uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from findings
  where analysis_id = analisis_vigente(p_contract) and riesgo = 'alto' and estado = 'pendiente'
$$;

create or replace function public.trg_contrato_estado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if (new.org_id, new.version_actual_id, new.riesgo_max, new.creado_por, new.recibido_en)
       is distinct from (old.org_id, old.version_actual_id, old.riesgo_max, old.creado_por, old.recibido_en) then
      raise exception 'Ese dato del contrato lo administra el sistema.';
    end if;
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'aprobado' then
      if altos_pendientes(new.id) > 0 then
        raise exception 'No se puede aprobar: hay % hallazgo(s) de riesgo alto pendientes de validar.',
          altos_pendientes(new.id);
      end if;
      new.aprobado_en := now();
    elsif new.estado = 'firmado' then
      if old.estado <> 'aprobado' then
        raise exception 'Solo un contrato aprobado puede marcarse como firmado.';
      end if;
      new.firmado_en := coalesce(new.firmado_en, now());
    else
      new.aprobado_en := null;
      new.firmado_en := null;
    end if;

    insert into audit_events (org_id, contract_id, actor_id, accion, detalle)
    values (new.org_id, new.id, auth.uid(), 'estado_cambiado',
            jsonb_build_object('de', old.estado, 'a', new.estado));
  end if;
  return new;
end $$;

create trigger contrato_estado before update on contracts
  for each row execute function trg_contrato_estado();

-- Comentarios al historial (sin el cuerpo del comentario).
create or replace function public.trg_comentario_historial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_events (org_id, contract_id, actor_id, accion, detalle)
  values (new.org_id, new.contract_id, new.autor_id, 'comentario',
          jsonb_build_object('audiencia', new.audiencia, 'hallazgo', new.finding_id));
  return new;
end $$;

create trigger comentario_historial after insert on comments
  for each row execute function trg_comentario_historial();

-- ---------------------------------------------------------------------------
-- Almacenamiento privado. Sin políticas para usuarios: los archivos solo salen
-- por enlaces firmados que emite el servidor, que deja registro en la bitácora.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contratos', 'contratos', false, 20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;
