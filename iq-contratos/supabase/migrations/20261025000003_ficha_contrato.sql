-- Ficha del contrato: los términos de negocio que hacen del portal el registro de contratos
-- vigentes de la empresa (monto, vigencia, renovación, aviso, ley y jurisdicción), el
-- abogado responsable y la terminación anticipada. La IA llena la ficha desde el documento
-- y Legal la confirma; ficha_fuentes guarda de dónde sale cada dato.

alter table contracts
  add column monto numeric(18, 2) check (monto is null or monto >= 0),
  add column moneda text check (moneda in ('MXN', 'USD', 'EUR')),
  add column monto_periodo text check (monto_periodo in ('total', 'mensual', 'anual')),
  add column inicio_vigencia date,
  add column fin_vigencia date,
  add column duracion_meses int check (duracion_meses is null or duracion_meses > 0),
  add column renovacion_automatica boolean,
  add column renovacion_meses int check (renovacion_meses is null or renovacion_meses > 0),
  add column aviso_dias int check (aviso_dias is null or aviso_dias >= 0),
  add column aviso_habiles boolean not null default false,
  add column ley_aplicable text,
  add column jurisdiccion text,
  add column responsable_id uuid references profiles(id) on delete set null,
  add column terminado_en date,
  add column motivo_terminacion text,
  -- Por campo: {"origen": "ia" | "manual", "cita"?, "por"?, "en"?}
  add column ficha_fuentes jsonb not null default '{}'::jsonb,
  add column ficha_confirmada_en timestamptz,
  add column ficha_confirmada_por uuid references profiles(id);

create index contracts_fin_vigencia on contracts (org_id, fin_vigencia) where fin_vigencia is not null;
create index contracts_responsable on contracts (org_id, responsable_id) where responsable_id is not null;

-- Solo se termina un contrato firmado, y la fecha de terminación no puede ser anterior a la
-- firma. El responsable debe ser de Legal y de la misma organización.
create or replace function public.trg_contrato_ficha() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.terminado_en is not null and old.terminado_en is distinct from new.terminado_en then
    if new.estado <> 'firmado' then
      raise exception 'Solo un contrato firmado puede darse por terminado.';
    end if;
    if new.firmado_en is not null and new.terminado_en < (new.firmado_en at time zone 'America/Mexico_City')::date then
      raise exception 'La fecha de terminación no puede ser anterior a la firma.';
    end if;
  end if;
  if new.responsable_id is not null and new.responsable_id is distinct from old.responsable_id then
    if not exists (select 1 from profiles p where p.id = new.responsable_id and p.org_id = new.org_id and p.rol in ('abogado', 'director_juridico')) then
      raise exception 'El responsable debe ser un abogado o la dirección jurídica de la organización.';
    end if;
  end if;
  if new.inicio_vigencia is not null and new.fin_vigencia is not null and new.fin_vigencia < new.inicio_vigencia then
    raise exception 'El fin de la vigencia no puede ser anterior a su inicio.';
  end if;
  return new;
end $$;

create trigger contrato_ficha before update on contracts
  for each row execute function trg_contrato_ficha();

revoke execute on function public.trg_contrato_ficha() from public, anon, authenticated;
