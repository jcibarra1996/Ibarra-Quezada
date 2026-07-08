# IQ TaskForge — Hoy

App single-player, anti-TDAH, gamificada. Sin login: acceso mediante una
URL secreta hardcodeada. Dos categorías de tareas nada más — **Trabajo**
y **Casa** — visión de túnel sobre "Hoy", cierre forzoso a las 9 PM y
recordatorios por WhatsApp (nunca Web Push, inestable en iOS).

## Estructura

```
app/
  page.tsx                 → pantalla "Hoy" (server component, fetch inicial)
  layout.tsx / globals.css
  enter/page.tsx            → pantalla de acceso (clave manual, fallback)
  t/[uuid]/page.tsx         → Magic Link público de una tarea
  api/
    enter/route.ts          → set cookie de acceso (GET ?key=, POST form)
    tasks/route.ts          → crear tarea (Captura Cero Fricción)
    tasks/[id]/route.ts     → reprogramar (PATCH) / eliminar (DELETE)
    tasks/[id]/complete/route.ts
    day-close/route.ts      → Cierre Forzoso: aplica decisiones por tarea
    day-close/escape/route.ts → "Hoy no tengo energía"
    quick-add/route.ts      → Atajo de Siri (header secreto, sin cookie)
    magic/[token]/complete/route.ts → completar vía Magic Link (público)
    weekly-reward/reveal/route.ts

components/
  EnergyCore.tsx            → reactor SVG animado
  CaptureBar.tsx / ContextToggle.tsx
  TaskList.tsx / TaskCard.tsx
  DayCloseModal.tsx         → bloqueo 9 PM
  MorningLockModal.tsx      → bloqueo 8:45 AM si no hay registro
  EnvelopeReward.tsx        → "El Sobre" de los viernes
  MagicComplete.tsx         → botón "Listo" del Magic Link

lib/
  supabase/server.ts        → cliente admin (service_role), server-only
  smartTags.ts              → auto-etiquetado por regex
  haptics.ts / confetti.ts  → micro-dopamina táctil y visual
  accessGate.ts             → hash del cookie de acceso
  dateHelpers.ts

proxy.ts                     → gate de acceso single-player

supabase/
  migrations/0001_init.sql   → tablas
  migrations/0002_cron.sql   → pg_cron + pg_net → Edge Functions
  seed_examples.sql          → ejemplos de tareas fantasma
  functions/
    morning-plan/            → WhatsApp 8:30 AM
    evening-reminder/        → WhatsApp 7:30/7:45/8:00 PM
    ghost-tasks/              → inyecta recurring_tasks del día
    weekly-reward/            → evalúa la semana, desbloquea El Sobre
    _shared/                  → auth, messaging (Meta/Twilio), supabaseAdmin
```

## 1. Variables de entorno

Copia `.env.example` a `.env.local` y llena todo. Puntos clave:

- `APP_ACCESS_KEY`: el secreto de tu URL única. Genera uno con
  `openssl rand -hex 24`. Tu "acceso directo" del iPhone apunta a
  `https://tu-app.com/api/enter?key=<ese valor>` — eso setea la cookie
  de sesión (hasheada, nunca se guarda el secreto en claro) y ya
  quedas dentro. `/enter` es el fallback manual si pierdes el link.
- `QUICK_ADD_SECRET`: header que debe mandar el Atajo de Siri.
- `SUPABASE_SERVICE_ROLE_KEY`: **nunca** se expone al cliente. Todas las
  rutas de la app pasan por el servidor — el navegador nunca habla
  directo con Supabase, por eso las tablas no necesitan RLS permisiva.

## 2. Supabase

```bash
supabase link --project-ref <tu-project-ref>
supabase db push                     # corre 0001_init.sql y 0002_cron.sql
supabase functions deploy morning-plan
supabase functions deploy evening-reminder
supabase functions deploy ghost-tasks
supabase functions deploy weekly-reward
```

Configura los secretos de las Edge Functions (Twilio o Meta, elige uno
vía `WHATSAPP_PROVIDER`):

```bash
supabase secrets set \
  EDGE_FUNCTION_SECRET=... \
  NEXT_PUBLIC_APP_URL=https://tu-app.com \
  WHATSAPP_PROVIDER=meta \
  META_WA_PHONE_NUMBER_ID=... \
  META_WA_ACCESS_TOKEN=... \
  META_WA_TO_NUMBER=+52...
```

Siembra `app_settings` para que `pg_cron` sepa a dónde pegarle (mismo
`EDGE_FUNCTION_SECRET` de arriba):

```sql
insert into app_settings (key, value) values
  ('edge_function_base_url', 'https://<project-ref>.functions.supabase.co'),
  ('edge_function_secret', '<EDGE_FUNCTION_SECRET>');
```

Los horarios de `0002_cron.sql` están calculados para Ciudad de México
(UTC-6) — ajusta las expresiones cron si vives en otro huso horario.

## 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000/api/enter?key=<APP_ACCESS_KEY>` una vez
para setear la cookie.

## 4. Atajo de Siri

Crea un Atajo de iOS: "Dictar texto" → "Obtener contenido de URL"
(`POST` a `https://tu-app.com/api/quick-add`, header
`x-quick-add-secret: <QUICK_ADD_SECRET>`, body = texto dictado). Súbelo
a la pantalla de bloqueo como acción rápida.

## 5. Deploy

Vercel para el frontend (variables de entorno del `.env.example` menos
las de Twilio/Meta, que van en Supabase secrets). Supabase para DB +
Edge Functions + `pg_cron`.
