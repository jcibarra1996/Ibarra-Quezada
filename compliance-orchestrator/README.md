# compliance-orchestrator

Backend del orquestador de Compliance y AML para onboarding de crédito y
validación de proveedores. Next.js (App Router) + TypeScript + `@supabase/ssr`.
Sin UI.

Vive en su propio directorio para no convertir el sitio estático de la raíz
(que Vercel sirve tal cual) en un proyecto Next.js.

## Estructura

| Ruta | Qué hace |
| --- | --- |
| `supabase/migrations/20261009000000_compliance_aml_core.sql` | Tablas, enums, RLS, bitácora inmutable y RPC transaccionales |
| `types/compliance.ts` | Interfaces 1:1 con el esquema, `ActionResult<T>` y el tipo `Database` |
| `lib/supabase/server.ts` | Cliente con sesión del usuario (respeta RLS) |
| `lib/supabase/admin.ts` | Cliente `service_role` para el webhook (ignora RLS) |
| `lib/aml/provider.ts` | Llamada REST al proveedor AML y su mock |
| `app/actions/compliance-engine.ts` | Server Action `executeInitialAMLCheck(entityId)` |
| `app/api/webhooks/aml-alerts/route.ts` | `POST` de alertas de monitoreo continuo |

## Decisiones

- **Atomicidad.** PostgREST abre una transacción por request, así que
  screening + cambio de estado + bitácora viven en una sola función SQL
  (`record_aml_screening`, `apply_aml_alert`). O se escriben los tres o
  ninguno: no puede quedar un screening `high` sin suspensión ni sin bitácora.
- **Acceso.** RLS en las cuatro tablas; solo pasa un JWT con
  `app_metadata.role = 'admin'` (ese campo solo se escribe con service_role).
  Las funciones son `SECURITY INVOKER`, así que RLS sigue aplicando.
- **Bitácora inmutable.** `audit_logs` no tiene políticas de UPDATE/DELETE,
  se revocan esos privilegios y un trigger rechaza UPDATE, DELETE y TRUNCATE
  incluso para `service_role`.
- **Integridad.** FKs con `on delete restrict`: no se puede borrar una
  entidad con historial AML. RFC normalizado y con validación de formato
  cuando `country = 'MX'` (solo forma, no existencia ante el SAT).
- **Fallas.** Todo devuelve `{ success, data, error }`. Si el proveedor AML
  falla, se registra `aml.initial_check_failed` en la bitácora y la entidad
  no cambia de estado. El webhook responde 500 genérico para que el
  proveedor reintente; el detalle queda en el log del servidor.

## Mock del proveedor

Sin `AML_PROVIDER_URL`, la llamada REST se resuelve con `mockAmlFetch`
(datos ficticios, no consulta listas reales). Según el nombre de la entidad:

| Nombre contiene | Resultado |
| --- | --- |
| `SANCION` u `OFAC` | `high` (suspende la entidad) |
| `PEP` | `medium` |
| `TIMEOUT` | HTTP 503 (falla del proveedor) |
| otro | `low` |

## Webhook

```
POST /api/webhooks/aml-alerts
Authorization: Bearer <AML_WEBHOOK_SECRET>
Content-Type: application/json

{
  "entity_id": "<uuid>",
  "provider": "ComplyAdvantage",
  "alert": {
    "list": "OFAC SDN",
    "description": "Representante legal listado",
    "subject_name": "Nombre de la persona",
    "external_id": "id-del-proveedor",
    "detected_at": "2026-10-09T12:00:00Z"
  }
}
```

Respuestas: 200, 400 (payload), 401 (token), 404 (entidad), 413 (>64 KB),
500 (persistencia, reintentable). Actualiza el screening más reciente de ese
proveedor (o crea uno), lo marca `high`, acumula la alerta en
`raw_json_response.alerts`, suspende la entidad y escribe
`aml.monitoring_alert` en la bitácora.

## Puesta en marcha

```bash
cp .env.example .env.local   # llenar valores
npm install
supabase db push             # o aplicar la migración desde el dashboard
npm run typecheck && npm run build
```

Para dar acceso de administrador a un usuario, desde SQL con service_role:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
 where email = '<correo>';
```

## Pendiente

- Idempotencia del webhook por `external_id` (hoy un reintento del
  proveedor agrega la alerta dos veces al arreglo y a la bitácora).
- Firma HMAC del cuerpo si el proveedor real la ofrece, en lugar de token fijo.
- Middleware de refresco de sesión de `@supabase/ssr` cuando exista UI.
