-- Un contrato aprobado o firmado congela sus validaciones: para cambiarlas hay que
-- regresarlo primero a "En negociación" o "En revisión". Así nunca queda un contrato
-- aprobado con un hallazgo de riesgo alto reabierto.

create or replace function public.trg_hallazgo_contrato_cerrado() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_estado estado_contrato;
begin
  if new.estado is distinct from old.estado or new.texto_final is distinct from old.texto_final then
    select estado into v_estado from contracts where id = new.contract_id;
    if v_estado in ('aprobado', 'firmado') then
      raise exception 'El contrato está %: para modificar validaciones, regréselo primero a En negociación.',
        case v_estado when 'aprobado' then 'aprobado' else 'firmado' end;
    end if;
  end if;
  return new;
end $$;

create trigger hallazgo_contrato_cerrado before update on findings
  for each row execute function trg_hallazgo_contrato_cerrado();

-- Mensaje de bloqueo con singular o plural correcto.
create or replace function public.trg_contrato_estado() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_altos int;
begin
  if auth.uid() is not null then
    if (new.org_id, new.version_actual_id, new.riesgo_max, new.creado_por, new.recibido_en)
       is distinct from (old.org_id, old.version_actual_id, old.riesgo_max, old.creado_por, old.recibido_en) then
      raise exception 'Ese dato del contrato lo administra el sistema.';
    end if;
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'aprobado' then
      v_altos := altos_pendientes(new.id);
      if v_altos = 1 then
        raise exception 'No se puede aprobar: queda 1 hallazgo de riesgo alto pendiente de validar.';
      elsif v_altos > 1 then
        raise exception 'No se puede aprobar: quedan % hallazgos de riesgo alto pendientes de validar.', v_altos;
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
