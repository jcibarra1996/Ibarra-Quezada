-- ═══════════════════════════════════════════════════════════════════
-- Hardening a partir de `get_advisors`:
--  1. set_updated_at sin search_path fijo → vector de schema hijacking
--  2. call_edge_function es SECURITY DEFINER y quedó ejecutable por
--     anon/authenticated vía /rest/v1/rpc — solo debe correrlo pg_cron
--     (rol postgres), nunca alguien con la anon key.
-- ═══════════════════════════════════════════════════════════════════

create or replace function set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function call_edge_function(text, jsonb) from public;
revoke execute on function call_edge_function(text, jsonb) from anon;
revoke execute on function call_edge_function(text, jsonb) from authenticated;
