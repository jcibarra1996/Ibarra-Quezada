-- La contrapropuesta mueve el contrato: al descargarla Legal, el contrato pasa a En
-- negociación. Se registra la primera descarga y nadie puede marcar En negociación con su
-- sesión si no hay una contrapropuesta descargada.

alter table counterproposals
  add column descargada_en timestamptz,
  add column descargada_por uuid references profiles(id);

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
    if new.estado = 'en_negociacion' and auth.uid() is not null
       and not exists (select 1 from counterproposals c where c.contract_id = new.id and c.descargada_en is not null) then
      raise exception 'El contrato pasa a En negociación al descargar la contrapropuesta.';
    end if;

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

revoke execute on function public.trg_contrato_estado() from public, anon, authenticated;
