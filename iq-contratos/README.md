# IQ Contratos

Plataforma de revisión de contratos con inteligencia artificial para direcciones legales.
**La IA hace la primera lectura. Su equipo decide.** La herramienta nunca aprueba ni firma
nada sola: propone, y un abogado del equipo valida.

Esta carpeta es una demo funcional construida para crecer a producción: Next.js (App Router)
con TypeScript y Tailwind CSS, Supabase (Postgres, autenticación y almacenamiento con Row
Level Security por organización) y la API de Anthropic desde rutas del servidor.

> Estado: **etapa 1 de 5** (subir y leer el contrato). Las secciones marcadas como
> "siguiente etapa" en la interfaz se completan en las etapas 2 a 5.

## Requisitos

- Node.js 20 o superior.
- Docker (para Supabase local) o un proyecto de Supabase en la nube.

## Correr en local

```bash
cd iq-contratos
npm install
npx supabase start          # levanta Postgres, Auth y Storage locales (Docker)
npx supabase db reset       # aplica las migraciones de supabase/migrations
cp .env.example .env.local  # y complete los valores (ver abajo)
npm run seed                # empresa ficticia, 3 usuarios, playbook y 5 contratos
npm run dev                 # http://localhost:3000
```

`npx supabase status` muestra la URL y las llaves locales para `.env.local`.

Usuarios de demostración (contraseña `Demo-IQ-2026`):

| Usuario | Rol |
|---|---|
| directora@empresa-cliente.example | Director jurídico |
| abogado@empresa-cliente.example | Abogado |
| compras@empresa-cliente.example | Negocio |

## Variables de entorno

| Variable | Dónde se usa | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador y servidor | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador y servidor | Llave pública (publishable o anon). Todo acceso con ella pasa por RLS |
| `SUPABASE_SECRET_KEY` | solo servidor | Llave secreta (secret o service_role). Solo para escrituras del sistema |
| `ANTHROPIC_API_KEY` | solo servidor | Llave de la API de Anthropic. Nunca llega al navegador |
| `ANTHROPIC_MODEL` | solo servidor | Modelo para el análisis. Por defecto `claude-sonnet-5-5` |
| `MODO_DEMO` | servidor | `true` muestra accesos rápidos a los usuarios demo en el ingreso. Nunca en un ambiente con datos reales |
| `ALERTAS_CORREO_ACTIVAS` | servidor | `false` en la demo: las alertas solo se muestran en la app |

## Pruebas

```bash
npm test                    # parser de cláusulas y validaciones (sin servicios externos)
npm run test:integracion    # RLS y permisos por rol contra Supabase local (requiere seed)
npm run lint                # revisión de tipos
```

## Estructura

```
app/                      rutas (App Router)
  (app)/                  pantallas con sesión: inicio, contratos, vencimientos, playbook, firmas, reportes
  api/contratos/          subida y lectura de contratos
  api/documentos/         descarga con enlace firmado y bitácora
  login/                  ingreso
components/               interfaz (revisión, menú, elementos comunes)
lib/
  parsing/                extracción de PDF (pdfjs vía unpdf) y Word (mammoth); parser de cláusulas
  contratos/              registro de contratos y bitácora de accesos
  supabase/               clientes con sesión (RLS) y del sistema
supabase/
  migrations/             esquema, RLS, triggers de reglas de negocio y bucket privado
  seed/                   semilla y los 5 contratos ficticios
tests/                    pruebas unitarias e integración
```

### Criterio de acceso a datos

- **Lecturas**: siempre con la sesión del usuario; RLS limita todo a su organización.
- **Decisiones humanas** (validar hallazgos, cambiar estado, comentar, editar playbook): con la
  sesión del usuario; RLS y triggers verifican el rol.
- **Escrituras del sistema** (procesar una subida, guardar un análisis, bitácora): desde el
  servidor con la llave secreta, después de verificar la sesión y la organización.

### Confidencialidad

- Bucket privado `contratos` sin políticas para usuarios: los archivos solo salen por enlaces
  firmados de 5 minutos que emite el servidor, y cada descarga queda en `document_access_log`.
- La vista del documento también registra quién lo vio (una vez cada 15 minutos por persona).
- El texto de los contratos nunca se escribe en logs (`lib/log.ts` solo registra identificadores y conteos).

### Limitaciones conocidas de la lectura

- PDF escaneado (sin texto seleccionable): se rechaza con un mensaje claro. No hay OCR.
- Word no tiene páginas fijas: el visor arma páginas de lectura de tamaño similar.
- Formato `.doc` (Word 97-2003): no compatible; se pide guardarlo como `.docx` o PDF.

## Despliegue en Vercel

Se documenta completo en la etapa final. Puntos ya resueltos:

- Proyecto de Vercel independiente del sitio web, con **Root Directory = `iq-contratos`**.
- El `.vercelignore` de la raíz del repositorio excluye `iq-contratos/` del despliegue del sitio
  ibarraquezada.com.
