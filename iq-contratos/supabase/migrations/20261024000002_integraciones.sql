-- Credenciales de servicios externos (por ahora, Mifiel) por organización. Los secretos
-- se guardan cifrados en Supabase Vault; la tabla solo tiene sus identificadores. Nadie
-- los lee con su sesión: solo el servidor, con la llave secreta, mediante funciones que
-- no se pueden llamar desde la API pública.

create table integraciones (
  org_id uuid not null references organizations(id) on delete cascade,
  proveedor text not null check (proveedor in ('mifiel')),
  entorno text not null check (entorno in ('sandbox', 'produccion')),
  app_id text not null,
  secreto_id uuid not null,
  webhook_clave_id uuid not null,
  avisos_conectados_en timestamptz,
  actualizado_por uuid references profiles(id),
  actualizado_en timestamptz not null default now(),
  primary key (org_id, proveedor)
);

alter table integraciones enable row level security;
-- La dirección jurídica ve que la integración existe (entorno y APP_ID), no el secreto.
create policy director_lectura on integraciones for select to authenticated
  using (org_id = org_actual() and es_director());

create or replace function public.guardar_integracion(
  p_org uuid, p_proveedor text, p_entorno text, p_app_id text, p_secreto text, p_usuario uuid
) returns void
language plpgsql security definer set search_path = public, vault as $$
declare
  v integraciones;
  v_secreto uuid;
  v_clave uuid;
begin
  select * into v from integraciones where org_id = p_org and proveedor = p_proveedor;
  if found then
    perform vault.update_secret(v.secreto_id, p_secreto);
    update integraciones
      set entorno = p_entorno, app_id = p_app_id, actualizado_por = p_usuario, actualizado_en = now(),
          avisos_conectados_en = case when v.entorno = p_entorno and v.app_id = p_app_id then v.avisos_conectados_en end
      where org_id = p_org and proveedor = p_proveedor;
  else
    v_secreto := vault.create_secret(p_secreto, 'integracion_' || p_proveedor || '_' || p_org || '_secreto');
    v_clave := vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'integracion_' || p_proveedor || '_' || p_org || '_webhook');
    insert into integraciones (org_id, proveedor, entorno, app_id, secreto_id, webhook_clave_id, actualizado_por)
      values (p_org, p_proveedor, p_entorno, p_app_id, v_secreto, v_clave, p_usuario);
  end if;
end $$;

create or replace function public.credenciales_integracion(p_org uuid, p_proveedor text)
returns table (entorno text, app_id text, secreto text, webhook_clave text)
language sql stable security definer set search_path = public, vault as $$
  select i.entorno, i.app_id, s.decrypted_secret, c.decrypted_secret
  from integraciones i
  join vault.decrypted_secrets s on s.id = i.secreto_id
  join vault.decrypted_secrets c on c.id = i.webhook_clave_id
  where i.org_id = p_org and i.proveedor = p_proveedor
$$;

-- Al desconectar, los secretos se sobrescriben y el servidor borra el registro.
create or replace function public.vaciar_integracion(p_org uuid, p_proveedor text) returns void
language plpgsql security definer set search_path = public, vault as $$
declare
  v integraciones;
begin
  select * into v from integraciones where org_id = p_org and proveedor = p_proveedor;
  if not found then return; end if;
  perform vault.update_secret(v.secreto_id, '');
  perform vault.update_secret(v.webhook_clave_id, '');
end $$;

revoke execute on function public.guardar_integracion(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.credenciales_integracion(uuid, text) from public, anon, authenticated;
revoke execute on function public.vaciar_integracion(uuid, text) from public, anon, authenticated;
grant execute on function public.guardar_integracion(uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.credenciales_integracion(uuid, text) to service_role;
grant execute on function public.vaciar_integracion(uuid, text) to service_role;
