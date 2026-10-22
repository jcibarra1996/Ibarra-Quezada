-- Las funciones con SECURITY DEFINER no deben poder llamarse desde la API pública.
-- Las de rol y organización las necesitan las políticas RLS de usuarios con sesión;
-- las demás solo las usan los triggers, que corren con los privilegios de su dueño.

revoke execute on function public.org_actual() from public, anon;
revoke execute on function public.rol_actual() from public, anon;
revoke execute on function public.puede_validar() from public, anon;
revoke execute on function public.es_director() from public, anon;
grant execute on function public.org_actual() to authenticated;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.puede_validar() to authenticated;
grant execute on function public.es_director() to authenticated;

revoke execute on function public.analisis_vigente(uuid) from public, anon, authenticated;
revoke execute on function public.altos_pendientes(uuid) from public, anon, authenticated;
revoke execute on function public.trg_hallazgo_decision() from public, anon, authenticated;
revoke execute on function public.trg_contrato_estado() from public, anon, authenticated;
revoke execute on function public.trg_comentario_historial() from public, anon, authenticated;
revoke execute on function public.trg_hallazgo_contrato_cerrado() from public, anon, authenticated;
