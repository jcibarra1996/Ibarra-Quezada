-- =============================================================================
-- Operaciones del orquestador. Cada función es una sola transacción: el dato,
-- el cambio de estado y la bitácora se escriben juntos o no se escriben.
-- SECURITY INVOKER: RLS sigue aplicando con el rol declarado por la app.
-- =============================================================================

create function public.entity_status_es(p public.entity_status)
returns text language sql immutable set search_path = '' as $$
  select case p
    when 'pending'   then 'Pendiente'
    when 'approved'  then 'Aprobada'
    when 'rejected'  then 'Rechazada'
    when 'suspended' then 'Suspendida'
  end;
$$;

create function public.risk_level_es(p public.risk_level)
returns text language sql immutable set search_path = '' as $$
  select case p when 'low' then 'bajo' when 'medium' then 'medio' when 'high' then 'alto' end;
$$;

create function public.party_type_es(p public.party_type)
returns text language sql immutable set search_path = '' as $$
  select case p
    when 'legal_representative' then 'Representante legal'
    when 'shareholder'          then 'Accionista'
    when 'beneficial_owner'     then 'Beneficiario controlador'
  end;
$$;

create function public.status_change_es(p_from public.entity_status, p_to public.entity_status)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_from = p_to then format('Estado sin cambios: %s.', public.entity_status_es(p_from))
    else format('Estado: pasa de %s a %s.', public.entity_status_es(p_from), public.entity_status_es(p_to))
  end;
$$;

-- -----------------------------------------------------------------------------
-- Falsos positivos descartados
-- Solo coincidencias por nombre: un RFC idéntico no es un homónimo. El
-- descarte se recuerda por entidad, sujeto y entrada de lista, para que el
-- re-chequeo periódico no vuelva a suspender por la misma coincidencia.
-- -----------------------------------------------------------------------------
create table public.match_dismissals (
  id           uuid primary key default gen_random_uuid(),
  entity_id    uuid not null references public.legal_entities (id) on delete restrict,
  -- 'entity' o el id de la persona relacionada
  subject_key  text not null,
  source_code  text not null references public.watchlist_sources (code),
  match_key    text not null,
  matched_name text not null,
  reason       text not null check (length(btrim(reason)) >= 10),
  actor        text not null default public.app_actor(),
  created_at   timestamptz not null default now(),
  constraint match_dismissals_key unique (entity_id, subject_key, source_code, match_key)
);

alter table public.match_dismissals enable row level security;
alter table public.match_dismissals force row level security;
create policy dismissals_read on public.match_dismissals
  for select using (public.app_role() in ('admin', 'system'));
create policy dismissals_insert on public.match_dismissals
  for insert with check (public.app_role() in ('admin', 'system'));

-- Marca como descartadas las coincidencias por nombre ya revisadas y
-- recalcula el riesgo del sujeto sin ellas.
create function public.apply_dismissals(p_entity_id uuid, p_subject_key text, p_result jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with marked as (
    select case
             when d.id is not null and m ->> 'match_type' = 'name' then
               m || jsonb_build_object(
                 'dismissed', true,
                 'original_risk', m ->> 'risk',
                 'risk', 'low',
                 'dismissal_reason', d.reason,
                 'dismissed_by', d.actor,
                 'dismissed_at', d.created_at)
             else m
           end as m,
           ord
      from jsonb_array_elements(p_result -> 'matches') with ordinality as x(m, ord)
      left join public.match_dismissals d
        on d.entity_id = p_entity_id
       and d.subject_key = p_subject_key
       and d.source_code = m ->> 'source'
       and d.match_key = m ->> 'match_key'
  )
  select jsonb_build_object(
    'risk', coalesce((select case
                               when bool_or(m ->> 'risk' = 'high') then 'high'
                               when bool_or(m ->> 'risk' = 'medium') then 'medium'
                               else 'low'
                             end from marked), 'low'),
    'matches', coalesce((select jsonb_agg(m order by ord) from marked), '[]'::jsonb)
  );
$$;

-- -----------------------------------------------------------------------------
-- Alta de entidad
-- -----------------------------------------------------------------------------
create function public.create_legal_entity(p_name text, p_tax_id text, p_country text default 'MX')
returns public.legal_entities
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entity public.legal_entities%rowtype;
begin
  insert into public.legal_entities (name, tax_id, country)
  values (
    btrim(p_name),
    upper(regexp_replace(coalesce(p_tax_id, ''), '\s', '', 'g')),
    upper(btrim(coalesce(p_country, 'MX')))
  )
  returning * into v_entity;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    v_entity.id,
    'entity.created',
    format('Alta de %s (%s, %s). Estado inicial: %s.',
           v_entity.name, v_entity.tax_id, v_entity.country, public.entity_status_es(v_entity.status))
  );

  return v_entity;
end;
$$;

-- -----------------------------------------------------------------------------
-- Personas relacionadas
-- -----------------------------------------------------------------------------
create function public.add_related_party(p_entity_id uuid, p_full_name text, p_party_type public.party_type, p_tax_id text)
returns public.related_parties
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_party public.related_parties%rowtype;
begin
  perform 1 from public.legal_entities where id = p_entity_id;
  if not found then
    raise exception 'legal_entity % no existe o no es accesible', p_entity_id using errcode = 'no_data_found';
  end if;

  insert into public.related_parties (entity_id, full_name, party_type, tax_id)
  values (
    p_entity_id,
    btrim(p_full_name),
    p_party_type,
    nullif(upper(regexp_replace(coalesce(p_tax_id, ''), '\s', '', 'g')), '')
  )
  returning * into v_party;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    p_entity_id,
    'party.added',
    format('Se registra %s: %s%s. No se ha revisado contra listas hasta el siguiente chequeo.',
           lower(public.party_type_es(v_party.party_type)), v_party.full_name,
           coalesce(' (' || v_party.tax_id || ')', ''))
  );

  return v_party;
end;
$$;

create function public.remove_related_party(p_party_id uuid, p_reason text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_party public.related_parties%rowtype;
begin
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'El motivo es obligatorio (mínimo 10 caracteres)' using errcode = 'check_violation';
  end if;

  delete from public.related_parties where id = p_party_id returning * into v_party;
  if not found then
    raise exception 'related_party % no existe o no es accesible', p_party_id using errcode = 'no_data_found';
  end if;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    v_party.entity_id,
    'party.removed',
    format('Se retira %s: %s. Motivo: %s',
           lower(public.party_type_es(v_party.party_type)), v_party.full_name, btrim(p_reason))
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Chequeo AML contra listas oficiales: la empresa y cada persona relacionada
-- p_action: 'aml.initial_check' (desde el panel) o 'aml.periodic_check'
-- (re-chequeo tras actualizar las listas).
-- -----------------------------------------------------------------------------
create function public.run_aml_screening(p_entity_id uuid, p_action text default 'aml.initial_check')
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_provider   constant text := 'IQ Listas oficiales (OFAC SDN, ONU, SAT 69-B)';
  c_stale      constant interval := interval '8 days';
  v_entity     public.legal_entities%rowtype;
  v_party      record;
  v_missing    text;
  v_sources    jsonb;
  v_warnings   jsonb := '[]'::jsonb;
  v_subjects   jsonb := '[]'::jsonb;
  v_result     jsonb;
  v_risk       public.risk_level := 'low';
  v_new_status public.entity_status;
  v_screening  public.aml_screenings%rowtype;
  v_hits       int;
  v_summary    text;
begin
  if p_action not in ('aml.initial_check', 'aml.periodic_check') then
    raise exception 'p_action inválido: %', p_action;
  end if;

  select * into v_entity from public.legal_entities where id = p_entity_id for update;
  if not found then
    raise exception 'legal_entity % no existe o no es accesible', p_entity_id using errcode = 'no_data_found';
  end if;

  -- Sin listas cargadas no hay chequeo: un "riesgo bajo" con listas vacías
  -- sería falso.
  select string_agg(name, ', ') into v_missing
    from public.watchlist_sources
   where last_synced_at is null or record_count = 0;
  if v_missing is not null then
    raise exception 'Listas sin cargar: %. Ejecuta la sincronización antes de revisar.', v_missing
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  select jsonb_agg(jsonb_build_object(
           'code', code, 'name', name, 'list_date', list_date,
           'last_synced_at', last_synced_at, 'record_count', record_count,
           'stale', last_synced_at < now() - c_stale) order by code)
    into v_sources
    from public.watchlist_sources;

  select coalesce(jsonb_agg(format('%s no se actualiza desde %s.', name, to_char(last_synced_at, 'YYYY-MM-DD'))), '[]'::jsonb)
    into v_warnings
    from public.watchlist_sources
   where last_synced_at < now() - c_stale;

  -- Empresa (las de RFC de 13 caracteres son personas físicas con actividad empresarial)
  v_result := public.apply_dismissals(p_entity_id, 'entity', public.screen_subject(
    v_entity.name,
    case when v_entity.country = 'MX' then v_entity.tax_id end,
    case when v_entity.country = 'MX' and length(v_entity.tax_id) = 13 then 'individual' else 'entity' end
  ));
  -- jsonb_build_array: sin él, "arreglo || objeto || objeto" agrega dos
  -- elementos en vez de un solo sujeto combinado.
  v_subjects := v_subjects || jsonb_build_array(jsonb_build_object(
    'role', 'entity', 'role_label', 'Entidad', 'name', v_entity.name, 'tax_id', v_entity.tax_id
  ) || v_result);

  -- Personas relacionadas
  for v_party in
    select * from public.related_parties where entity_id = p_entity_id order by created_at
  loop
    v_result := public.apply_dismissals(p_entity_id, v_party.id::text,
                                        public.screen_subject(v_party.full_name, v_party.tax_id, 'individual'));
    v_subjects := v_subjects || jsonb_build_array(jsonb_build_object(
      'role', v_party.party_type, 'role_label', public.party_type_es(v_party.party_type),
      'party_id', v_party.id, 'name', v_party.full_name, 'tax_id', v_party.tax_id
    ) || v_result);
  end loop;

  select case
           when bool_or(s ->> 'risk' = 'high') then 'high'
           when bool_or(s ->> 'risk' = 'medium') then 'medium'
           else 'low'
         end::public.risk_level,
         coalesce(sum((select count(*) from jsonb_array_elements(s -> 'matches') m
                        where not coalesce((m ->> 'dismissed')::boolean, false))), 0)
    into v_risk, v_hits
    from jsonb_array_elements(v_subjects) s;

  insert into public.aml_screenings (entity_id, provider, risk_level, raw_json_response, last_checked_at)
  values (
    p_entity_id,
    c_provider,
    v_risk,
    jsonb_build_object(
      'engine', 'iq-listas', 'version', 1,
      'risk_level', v_risk,
      'checked_at', now(),
      'sources', v_sources,
      'warnings', v_warnings,
      'subjects', v_subjects
    ),
    now()
  )
  returning * into v_screening;

  v_new_status := v_entity.status;
  if v_risk = 'high' and v_entity.status not in ('suspended', 'rejected') then
    update public.legal_entities set status = 'suspended' where id = p_entity_id;
    v_new_status := 'suspended';
  end if;

  select string_agg(
           format('%s %s: %s', s ->> 'role_label', s ->> 'name',
                  (select string_agg(format('%s en %s%s (%s, riesgo %s)',
                                            case m ->> 'match_type' when 'rfc' then 'RFC' else 'nombre' end,
                                            m ->> 'source_name',
                                            coalesce(', ' || (m ->> 'status'), ''),
                                            m ->> 'matched_name',
                                            public.risk_level_es((m ->> 'risk')::public.risk_level)), '; ')
                     from jsonb_array_elements(s -> 'matches') m
                    where not coalesce((m ->> 'dismissed')::boolean, false))),
           '. ')
    into v_summary
    from jsonb_array_elements(v_subjects) s
   where exists (select 1 from jsonb_array_elements(s -> 'matches') m
                  where not coalesce((m ->> 'dismissed')::boolean, false));

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    p_entity_id,
    p_action,
    format('%s contra OFAC SDN, ONU y SAT 69-B (%s %s). Riesgo %s. %s Screening %s. %s%s',
           case p_action when 'aml.initial_check' then 'Chequeo AML' else 'Re-chequeo periódico' end,
           jsonb_array_length(v_subjects),
           case jsonb_array_length(v_subjects) when 1 then 'sujeto' else 'sujetos' end,
           public.risk_level_es(v_risk),
           case when v_hits = 0 then 'Sin coincidencias.' else 'Coincidencias: ' || v_summary || '.' end,
           v_screening.id,
           public.status_change_es(v_entity.status, v_new_status),
           case when jsonb_array_length(v_warnings) > 0
                then ' Aviso: ' || (select string_agg(w #>> '{}', ' ') from jsonb_array_elements(v_warnings) w)
                else '' end)
  );

  return jsonb_build_object(
    'screening', to_jsonb(v_screening),
    'previous_status', v_entity.status,
    'entity_status', v_new_status
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Descartar una coincidencia por nombre como falso positivo. Debe existir en
-- el chequeo más reciente de la entidad. No cambia el estado: el riesgo se
-- recalcula en el siguiente chequeo y la decisión sigue siendo humana.
-- -----------------------------------------------------------------------------
create function public.dismiss_match(
  p_entity_id   uuid,
  p_subject_key text,
  p_source      text,
  p_match_key   text,
  p_reason      text
)
returns public.match_dismissals
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reason   text := btrim(coalesce(p_reason, ''));
  v_subject  jsonb;
  v_match    jsonb;
  v_row      public.match_dismissals%rowtype;
begin
  if length(v_reason) < 10 then
    raise exception 'El motivo es obligatorio (mínimo 10 caracteres)' using errcode = 'check_violation';
  end if;

  select s, m into v_subject, v_match
    from (select raw_json_response from public.aml_screenings
           where entity_id = p_entity_id
           order by last_checked_at desc
           limit 1) last,
         jsonb_array_elements(last.raw_json_response -> 'subjects') s,
         jsonb_array_elements(s -> 'matches') m
   where coalesce(s ->> 'party_id', 'entity') = p_subject_key
     and m ->> 'source' = p_source
     and m ->> 'match_key' = p_match_key
   limit 1;

  if v_match is null then
    raise exception 'La coincidencia no está en el chequeo más reciente de la entidad' using errcode = 'no_data_found';
  end if;
  if v_match ->> 'match_type' <> 'name' then
    raise exception 'Una coincidencia por RFC idéntico no se puede descartar como homónimo' using errcode = 'check_violation';
  end if;

  insert into public.match_dismissals (entity_id, subject_key, source_code, match_key, matched_name, reason)
  values (p_entity_id, p_subject_key, p_source, p_match_key, v_match ->> 'primary_name', v_reason)
  on conflict on constraint match_dismissals_key do nothing
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Esa coincidencia ya estaba descartada' using errcode = 'check_violation';
  end if;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    p_entity_id,
    'aml.match_dismissed',
    format('Falso positivo descartado para %s %s: %s en %s (%s, similitud %s). Motivo: %s',
           lower(v_subject ->> 'role_label'), v_subject ->> 'name',
           v_match ->> 'primary_name', v_match ->> 'source_name', v_match ->> 'external_id',
           v_match ->> 'score', v_reason)
  );

  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- Decisión humana con motivo obligatorio
--   pending   -> approved | rejected
--   approved  -> rejected | pending (reabrir)
--   suspended -> pending (reactivar, p. ej. falso positivo) | rejected
--   rejected  -> pending (reabrir)
-- -----------------------------------------------------------------------------
create function public.decide_entity(p_entity_id uuid, p_new_status public.entity_status, p_reason text)
returns public.legal_entities
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entity public.legal_entities%rowtype;
  v_prev   public.entity_status;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if length(v_reason) < 10 then
    raise exception 'El motivo es obligatorio (mínimo 10 caracteres)' using errcode = 'check_violation';
  end if;

  select * into v_entity from public.legal_entities where id = p_entity_id for update;
  if not found then
    raise exception 'legal_entity % no existe o no es accesible', p_entity_id using errcode = 'no_data_found';
  end if;

  if not (
    (v_entity.status = 'pending'   and p_new_status in ('approved', 'rejected')) or
    (v_entity.status = 'approved'  and p_new_status in ('rejected', 'pending')) or
    (v_entity.status = 'suspended' and p_new_status in ('pending', 'rejected')) or
    (v_entity.status = 'rejected'  and p_new_status = 'pending')
  ) then
    raise exception 'Transición no permitida: % a %',
      public.entity_status_es(v_entity.status), public.entity_status_es(p_new_status)
      using errcode = 'check_violation';
  end if;

  v_prev := v_entity.status;
  update public.legal_entities set status = p_new_status where id = p_entity_id returning * into v_entity;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    p_entity_id,
    'entity.decision',
    format('Decisión: %s Motivo: %s',
           public.status_change_es(v_prev, p_new_status), v_reason)
  );

  return v_entity;
end;
$$;

-- -----------------------------------------------------------------------------
-- Alerta externa de monitoreo (webhook): actualiza el screening más reciente
-- del proveedor o crea uno, suspende y deja bitácora.
-- -----------------------------------------------------------------------------
create function public.apply_aml_alert(p_entity_id uuid, p_provider text, p_alert jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entity     public.legal_entities%rowtype;
  v_screening  public.aml_screenings%rowtype;
  v_alert      jsonb := jsonb_set(coalesce(p_alert, '{}'::jsonb), '{received_at}', to_jsonb(now()));
  v_new_status public.entity_status;
begin
  select * into v_entity from public.legal_entities where id = p_entity_id for update;
  if not found then
    raise exception 'legal_entity % no existe o no es accesible', p_entity_id using errcode = 'no_data_found';
  end if;

  select * into v_screening
    from public.aml_screenings
   where entity_id = p_entity_id and provider = p_provider
   order by last_checked_at desc
   limit 1
   for update;

  if found then
    update public.aml_screenings
       set risk_level = 'high',
           last_checked_at = now(),
           raw_json_response = jsonb_set(
             raw_json_response, '{alerts}',
             coalesce(raw_json_response -> 'alerts', '[]'::jsonb) || jsonb_build_array(v_alert))
     where id = v_screening.id
     returning * into v_screening;
  else
    insert into public.aml_screenings (entity_id, provider, risk_level, raw_json_response, last_checked_at)
    values (p_entity_id, p_provider, 'high', jsonb_build_object('alerts', jsonb_build_array(v_alert)), now())
    returning * into v_screening;
  end if;

  v_new_status := case when v_entity.status = 'rejected' then 'rejected' else 'suspended' end;
  update public.legal_entities set status = v_new_status where id = p_entity_id;

  insert into public.audit_logs (entity_id, action_type, description)
  values (
    p_entity_id,
    'aml.monitoring_alert',
    format('Alerta de %s en %s: %s. Screening %s marcado con riesgo alto. %s',
           p_provider,
           coalesce(v_alert ->> 'list', 'lista no especificada'),
           coalesce(v_alert ->> 'description', 'sin descripción'),
           v_screening.id,
           public.status_change_es(v_entity.status, v_new_status))
  );

  return jsonb_build_object(
    'screening', to_jsonb(v_screening),
    'previous_status', v_entity.status,
    'entity_status', v_new_status
  );
end;
$$;
