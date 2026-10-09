-- Las descripciones de audit_logs mezclaban español con los valores crudos
-- de los enums ("Riesgo: low", "pending -> suspended"). Se reemplazan las
-- funciones para que redacten en español. Los registros ya escritos no se
-- tocan: audit_logs es inmutable.

create function public.entity_status_es(p public.entity_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p
    when 'pending'   then 'Pendiente'
    when 'approved'  then 'Aprobada'
    when 'rejected'  then 'Rechazada'
    when 'suspended' then 'Suspendida'
  end;
$$;

create function public.risk_level_es(p public.risk_level)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p
    when 'low'    then 'bajo'
    when 'medium' then 'medio'
    when 'high'   then 'alto'
  end;
$$;

create or replace function public.record_aml_screening(
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
      'Chequeo AML inicial con %s. Riesgo %s. Screening %s. %s',
      p_provider,
      public.risk_level_es(p_risk_level),
      v_screening.id,
      case
        when v_new_status = v_entity.status
          then format('Estado sin cambios: %s.', public.entity_status_es(v_entity.status))
        else format('Estado: pasa de %s a %s.', public.entity_status_es(v_entity.status), public.entity_status_es(v_new_status))
      end
    )
  );

  return jsonb_build_object(
    'screening', to_jsonb(v_screening),
    'previous_status', v_entity.status,
    'entity_status', v_new_status
  );
end;
$$;

create or replace function public.apply_aml_alert(
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
      'Alerta de %s en %s: %s. Screening %s marcado con riesgo alto. %s',
      p_provider,
      coalesce(v_alert ->> 'list', 'lista no especificada'),
      coalesce(v_alert ->> 'description', 'sin descripción'),
      v_screening.id,
      case
        when v_entity.status = 'suspended' then 'La entidad ya estaba suspendida.'
        else format('Estado: pasa de %s a Suspendida.', public.entity_status_es(v_entity.status))
      end
    )
  );

  return jsonb_build_object(
    'screening', to_jsonb(v_screening),
    'previous_status', v_entity.status,
    'entity_status', 'suspended'
  );
end;
$$;

create or replace function public.create_legal_entity(
  p_name     text,
  p_tax_id   text,
  p_country  text default 'MX'
)
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
    format(
      'Alta de %s (%s, %s). Estado inicial: %s.',
      v_entity.name, v_entity.tax_id, v_entity.country, public.entity_status_es(v_entity.status)
    )
  );

  return v_entity;
end;
$$;
