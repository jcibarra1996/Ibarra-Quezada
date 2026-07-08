-- ═══════════════════════════════════════════════════════════════════
-- IQ TaskForge — Esquema inicial
-- Modo single-player: sin auth.users, sin RLS permisiva. Todo el
-- acceso pasa por el service_role key desde rutas de Next.js /
-- Edge Functions, nunca desde el navegador con la anon key.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Tareas recurrentes ("Tareas Fantasma") ──────────────────────────
-- Plantillas fijas (servicio del coche, pagos del depa, etc.) que un
-- cron diario materializa como tasks reales en su fecha correspondiente.
create table if not exists recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text not null check (context in ('trabajo', 'casa')),
  smart_tags text[] not null default '{}',
  recurrence text not null check (recurrence in ('monthly', 'weekly', 'interval')),
  day_of_month smallint check (day_of_month between 1 and 31),
  day_of_week smallint check (day_of_week between 0 and 6), -- 0=domingo
  interval_days int check (interval_days > 0),
  last_injected_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint recurring_shape check (
    (recurrence = 'monthly' and day_of_month is not null) or
    (recurrence = 'weekly' and day_of_week is not null) or
    (recurrence = 'interval' and interval_days is not null)
  )
);

-- ── Tareas ───────────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text not null check (context in ('trabajo', 'casa')),
  -- Etiquetas invisibles asignadas por regex (Legal, Crédito, Perro, Pareja, ...)
  smart_tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'completed', 'archived')),
  -- Visión de túnel: la UI principal solo muestra scheduled_for = hoy
  scheduled_for date not null default (current_date),
  source text not null default 'manual' check (source in ('manual', 'quick_add', 'recurring', 'magic_link')),
  recurring_task_id uuid references recurring_tasks(id) on delete set null,
  -- Magic link de delegación: /t/[share_token]
  share_token uuid not null default gen_random_uuid(),
  completed_at timestamptz,
  completed_via text check (completed_via in ('app', 'magic_link')),
  archived_at timestamptz,
  archive_reason text check (archive_reason in ('no_energy', 'day_close_delete', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tasks_share_token_idx on tasks (share_token);
create index if not exists tasks_scheduled_for_idx on tasks (scheduled_for) where status = 'pending';
create index if not exists tasks_context_idx on tasks (context);
create index if not exists tasks_status_idx on tasks (status);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ── Cierres de día ("Cierre Forzoso" a las 9:00 PM) ─────────────────
create table if not exists day_closes (
  id uuid primary key default gen_random_uuid(),
  close_date date not null unique,
  closed_at timestamptz,
  total_tasks int not null default 0,
  completed_tasks int not null default 0,
  effectiveness numeric(5,2) not null default 0, -- 0-100
  used_escape_button boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Recompensa semanal ("El Sobre") ─────────────────────────────────
create table if not exists weekly_rewards (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique, -- lunes de esa semana
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  revealed boolean not null default false,
  revealed_at timestamptz,
  skin_id text,
  created_at timestamptz not null default now()
);

-- ── Bitácora de actividad ───────────────────────────────────────────
-- Usada para: (a) saber si hoy ya se agregó una tarea (bloqueo 8:45am),
-- (b) saber si hubo actividad para dejar de insistir en la noche,
-- (c) calcular efectividad semanal para "El Sobre".
create table if not exists activity_log (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'task_created', 'task_completed', 'day_close_completed',
    'day_close_escape', 'app_opened', 'whatsapp_sent'
  )),
  context text,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index if not exists activity_log_type_time_idx on activity_log (event_type, occurred_at desc);

-- ── Configuración de la app (usada por pg_cron → Edge Functions) ───
create table if not exists app_settings (
  key text primary key,
  value text not null
);

comment on table app_settings is
  'Config runtime para pg_cron (URL base de Edge Functions + secreto). '
  'Sembrar manualmente después del deploy, ver README.';

-- Todas las tablas quedan con RLS habilitada y SIN policies: el acceso
-- normal siempre usa el service_role key (bypassa RLS), nunca la anon key.
alter table tasks enable row level security;
alter table recurring_tasks enable row level security;
alter table day_closes enable row level security;
alter table weekly_rewards enable row level security;
alter table activity_log enable row level security;
alter table app_settings enable row level security;
