-- Alta de entidad con bitácora en la misma transacción.
-- Normaliza el identificador fiscal (mayúsculas, sin espacios) para que el
-- CHECK de formato de RFC y el UNIQUE (country, tax_id) operen sobre el
-- valor limpio.
create function public.create_legal_entity(
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
    format('Alta de entidad %s (%s, %s). Estado inicial: %s.', v_entity.name, v_entity.tax_id, v_entity.country, v_entity.status)
  );

  return v_entity;
end;
$$;

revoke execute on function public.create_legal_entity(text, text, text) from public, anon;
grant execute on function public.create_legal_entity(text, text, text) to authenticated, service_role;
