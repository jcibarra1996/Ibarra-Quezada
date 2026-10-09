# compliance-orchestrator

Orquestador de Compliance y AML para onboarding de crédito y validación de
proveedores. Revisa a cada empresa y a las personas detrás de ella
(representante legal, accionistas, beneficiario controlador) contra listas
oficiales públicas, suspende en automático ante riesgo alto y deja todo en una
bitácora que no se puede editar.

Next.js (App Router) + TypeScript + Postgres en Neon (`pg`). Vive en su propio
directorio para no convertir el sitio estático de la raíz en un proyecto
Next.js; `.vercelignore` lo excluye del deploy de ibarraquezada.com.

## Contra qué revisa

| Lista | Fuente | Qué se compara |
| --- | --- | --- |
| OFAC SDN | Tesoro de EE. UU. (`sdn.csv` + `alt.csv`) | Nombre y alias; RFC cuando OFAC lo anota en sus observaciones |
| ONU | Lista consolidada del Consejo de Seguridad (`consolidated.xml`) | Nombre y alias |
| SAT 69-B | Listado completo del artículo 69-B del CFF | RFC y nombre, con la situación del contribuyente |

**No incluida:** la Lista de Personas Bloqueadas de la UIF. No se encontró una
descarga oficial pública verificable; las fuentes secundarias se contradicen
sobre si es pública o de acceso restringido a sujetos obligados.

**Limitación conocida:** el servidor del SAT corta la conexión por https y solo
responde por http, así que esa descarga va sin cifrar.

### Criterios de riesgo

Son decisiones de diseño del motor, no umbrales normativos. Viven en
`db/migrations/0002_watchlists.sql` (`screen_subject`).

| Coincidencia | Riesgo |
| --- | --- |
| RFC idéntico en OFAC u ONU | Alto |
| RFC idéntico en 69-B, situación Definitivo o Presunto | Alto |
| RFC idéntico en 69-B, Desvirtuado o Sentencia Favorable | Bajo, se muestra como informativo |
| Nombre en OFAC/ONU con similitud de 85% o más | Alto (medio si la entrada trae otro RFC: probable homónimo) |
| Nombre en OFAC/ONU con similitud de 65% a 85% | Medio, requiere revisión |
| Persona: todas las palabras del nombre listado (3 o más) presentes, en cualquier orden | Similitud plena |
| Nombre en 69-B (Definitivo/Presunto) con similitud de 90% o más, sin RFC que lo confirme | Medio, nunca alto |

El SAT publica 81 RFC más de una vez con situaciones distintas (por ejemplo
Definitivo y Sentencia Favorable). El motor toma la más grave y el panel avisa
que hay que revisar los oficios de cada publicación.

Si alguna lista no está cargada, el chequeo **falla** en lugar de devolver un
riesgo bajo falso.

## Flujo

1. Alta de la entidad (razón social, RFC, país).
2. Registro de personas relacionadas.
3. **Chequeo AML**: empresa y personas contra las tres listas, en una sola
   transacción. Riesgo alto suspende la entidad.
4. Revisión humana:
   - una coincidencia por nombre que resulta homónimo se **descarta como falso
     positivo** con motivo; el descarte se recuerda y el re-chequeo periódico ya
     no vuelve a suspender por ella. Una coincidencia por RFC idéntico no se
     puede descartar.
   - **decisión** con motivo obligatorio: aprobar, rechazar, reactivar o
     reabrir, según el estado.
5. **Monitoreo continuo**: cada día se descargan las listas; si alguna cambió,
   se re-chequean todas las entidades no rechazadas.

Todo queda en `audit_logs` con quién lo hizo.

## Estructura

| Ruta | Qué hace |
| --- | --- |
| `db/migrations/0001_base.sql` | Tablas, usuarios y sesiones, RLS forzado, bitácora inmutable |
| `db/migrations/0002_watchlists.sql` | Listas, normalización de nombres, motor de coincidencias |
| `db/migrations/0003_workflows.sql` | Alta, personas, chequeo, descartes, decisiones, alertas externas |
| `lib/db/pool.ts` | Conexión y transacciones con rol declarado |
| `lib/auth/` | Contraseñas (scrypt) y sesiones en base de datos |
| `lib/watchlists/parsers.ts` | Lectura de los archivos de cada lista |
| `app/actions/` | Server Actions: chequeo, alta, personas, descartes, decisiones |
| `app/api/webhooks/aml-alerts/route.ts` | Alertas de un proveedor externo de monitoreo (opcional) |
| `app/(panel)/entidades/` | Lista y expediente |
| `scripts/` | Migraciones, sincronización de listas, alta de administradores, pruebas |
| `../.github/workflows/compliance-listas.yml` | Sincronización diaria |

## Seguridad

- **Acceso en dos capas.** La app valida la sesión y abre cada transacción
  declarando un rol (`auth`, `admin` o `system`). En la base, RLS está
  **forzado** en todas las tablas: sin rol declarado no se ve nada, `admin` no
  puede leer usuarios ni sesiones, y solo `system` escribe las listas.
- **Bitácora inmutable.** `audit_logs` solo acepta lectura e inserción; un
  trigger por sentencia rechaza cualquier UPDATE, DELETE o TRUNCATE.
- **Contraseñas** con scrypt; **sesiones** de 12 horas guardadas como hash
  SHA-256 del token (nunca el token); cookie `httpOnly`, `secure` en
  producción, `sameSite=lax`. Bloqueo de 15 minutos tras 5 intentos fallidos.
  Mismo mensaje y mismo costo de cómputo para correo inexistente o contraseña
  incorrecta.
- El rol de conexión **no debe ser superusuario**: un superusuario ignora RLS.
  En Neon, `neondb_owner` no lo es.

## Puesta en marcha

Requiere Node 22.18 o superior (corre TypeScript directo en los scripts).

```bash
cp .env.example .env.local        # DATABASE_URL de Neon
npm install
npm run db:migrate                # crea el esquema
npm run listas:sync               # descarga y carga las tres listas (~10 s)
npm run admin:create -- tu@correo.com   # imprime una contraseña generada
npm run dev
```

`ADMIN_PASSWORD=... npm run admin:create -- correo` fija la contraseña en vez
de generarla, y sirve también para cambiarla (cierra las sesiones abiertas).

### Sincronización diaria

`.github/workflows/compliance-listas.yml` corre migraciones y
`listas:sync` cada día. Para activarlo en GitHub:

1. Secreto de repositorio `COMPLIANCE_DATABASE_URL` con la cadena de Neon.
2. Variable de repositorio `COMPLIANCE_SYNC_ENABLED` = `true`.

Protecciones: si una descarga trae menos del 50% de los registros de la
versión anterior (o menos del mínimo esperado), no se reemplaza la lista y el
job falla.

### Pruebas

```bash
DATABASE_URL=... npm run db:migrate
DATABASE_URL=... npm run listas:sync -- --sin-rechequeo
DATABASE_URL=... npm run test:db
```

32 pruebas contra la base real con las listas cargadas: normalización, casos
reales de cada lista, nombres comunes sin falsos positivos, RLS, bitácora
inmutable, chequeo completo, descartes y decisiones. Cada prueba se revierte.

## Webhook de proveedor externo (opcional)

Si más adelante se contrata un proveedor de monitoreo, sus alertas entran por:

```
POST /api/webhooks/aml-alerts
Authorization: Bearer <AML_WEBHOOK_SECRET>

{ "entity_id": "<uuid>", "provider": "Nombre", "alert": { "list": "OFAC SDN", "description": "..." } }
```

Respuestas: 200, 400, 401, 404, 413, 500 (reintentable). Marca riesgo alto,
suspende y deja bitácora.

## Marca

Superficie crema en el panel, negra en el acceso; acento `#D8551D` solo donde
hay acción o identidad de sección; esquinas cuadradas. Las tipografías
(Georgia y sans de sistema) son aproximaciones: las del brochure no están
confirmadas. `public/monograma.png` trae fondo `#0D0D0D` incrustado, por eso
solo aparece sobre negro.

## Pendiente

- Carga de documentos (requiere almacenamiento de archivos).
- Idempotencia del webhook por `external_id`.
- Lista de Personas Bloqueadas de la UIF, si se confirma un canal oficial.
