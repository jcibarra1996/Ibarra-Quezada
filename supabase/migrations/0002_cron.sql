-- ═══════════════════════════════════════════════════════════════════
-- pg_cron + pg_net → dispara las Edge Functions de WhatsApp / fantasmas
-- ═══════════════════════════════════════════════════════════════════
-- NOTA DE ZONA HORARIA: pg_cron en Supabase corre en UTC. Los horarios
-- de abajo están calculados para Ciudad de México (UTC-6, sin horario
-- de verano desde 2022). Ajusta si vives en otro huso horario:
--   8:30 AM CDMX -> 14:30 UTC
--   7:30 PM CDMX -> 01:30 UTC (día siguiente)
--   7:45 PM CDMX -> 01:45 UTC
--   8:00 PM CDMX -> 02:00 UTC
--   5:00 PM (vie) CDMX -> 23:00 UTC (mismo viernes)
--   5:00 AM CDMX (fantasmas) -> 11:00 UTC

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper: llama a una Edge Function por nombre usando la config en
-- app_settings. Sembrar estos valores tras el deploy:
--   insert into app_settings (key, value) values
--     ('edge_function_base_url', 'https://<project-ref>.functions.supabase.co'),
--     ('edge_function_secret', '<mismo valor que EDGE_FUNCTION_SECRET>');
create or replace function call_edge_function(function_name text, payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  secret text;
begin
  select value into base_url from app_settings where key = 'edge_function_base_url';
  select value into secret from app_settings where key = 'edge_function_secret';

  if base_url is null or secret is null then
    raise notice 'app_settings sin configurar: omitiendo llamada a %', function_name;
    return;
  end if;

  perform net.http_post(
    url := base_url || '/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := payload
  );
end;
$$;

-- 8:30 AM — "¿Qué vamos a destruir hoy?"
select cron.schedule(
  'whatsapp-morning-plan',
  '30 14 * * *',
  $$select call_edge_function('morning-plan')$$
);

-- 7:30 PM, 7:45 PM, 8:00 PM — recordatorio de cierre de Casa,
-- insistiendo cada 15 min hasta detectar actividad (la función misma
-- revisa activity_log y no reenvía si ya hubo actividad hoy).
select cron.schedule(
  'whatsapp-evening-1930',
  '30 1 * * *',
  $$select call_edge_function('evening-reminder')$$
);
select cron.schedule(
  'whatsapp-evening-1945',
  '45 1 * * *',
  $$select call_edge_function('evening-reminder')$$
);
select cron.schedule(
  'whatsapp-evening-2000',
  '0 2 * * *',
  $$select call_edge_function('evening-reminder')$$
);

-- 5:00 AM — inyecta "tareas fantasma" (recurring_tasks) del día en Hoy
select cron.schedule(
  'ghost-tasks-daily',
  '0 11 * * *',
  $$select call_edge_function('ghost-tasks')$$
);

-- Viernes 5:00 PM — evalúa la semana y desbloquea "El Sobre"
select cron.schedule(
  'weekly-reward-friday',
  '0 23 * * 5',
  $$select call_edge_function('weekly-reward')$$
);
