# IQ Contratos

Plataforma de gestión del ciclo de vida de contratos (CLM) con revisión por inteligencia artificial,
hecha para direcciones legales en México: solicitud, plantilla, revisión, negociación, aprobación,
firma y vigencia.
La herramienta nunca aprueba ni firma nada sola: propone, y un abogado del equipo valida cada
punto.

Demo funcional construida para crecer a producción: Next.js 16 (App Router) con TypeScript y
Tailwind CSS 4, Supabase (Postgres, autenticación y almacenamiento con Row Level Security por
organización) y la API de Anthropic llamada solo desde el servidor.

## Qué hace

| Módulo | Qué hace |
|---|---|
| Subir y leer | PDF con texto o Word (.docx). Extrae el texto y reconoce proemio, declaraciones (I, II, III), cláusulas (PRIMERA... o CLÁUSULA 1) y cierre, con página y posición exacta de cada sección. |
| Análisis IA | Tipo y objeto del contrato, cláusulas ajenas al objeto, comparación contra el playbook, omisiones, fechas clave y resumen para negocio. Salida estructurada validada con zod. Cada cita se ubica en el texto; si no aparece textual, el hallazgo se descarta. Las normas mencionadas se marcan "Por verificar por el abogado". |
| Revisión | Visor con citas resaltadas y numeradas, marcas al margen y paginación. Panel con resumen, contadores por riesgo y tarjetas con control de cambios: Aceptar cambio, Editar, Descartar. Barra de Validación de Legal. |
| Validación | Cada hallazgo guarda estado, usuario y hora. La base de datos impide aprobar con hallazgos de riesgo alto pendientes y congela las validaciones de un contrato aprobado. |
| Contrapropuesta | .docx con control de cambios real de Word (w:ins / w:del) a nombre de quien aceptó cada cambio. Las omisiones aceptadas entran como cláusulas nuevas numeradas. Al descargarla Legal, queda marcada como descargada y el contrato pasa a En negociación; ese estado no se elige a mano. |
| Vencimientos | Lista y calendario de plazos de aviso, fines de vigencia y periodos renovados, con área responsable y avisos programados. El correo está preparado y desactivado. |
| Ficha del contrato | Portada de cada contrato: monto (total, mensual o anual), vigencia, renovación automática, plazo de aviso, ley aplicable, jurisdicción, abogado responsable y área. La IA la llena desde el documento al cargarlo, cada dato con la cita textual de donde sale (sin cita no se guarda); Legal la confirma o la edita, y lo capturado a mano ya no lo cambia la IA. |
| Vigencia | Para los contratos firmados se calcula sola: por iniciar, vigente, renovado (con renovación automática avanza el periodo), por vencer (90 días o el último día de aviso a 30 días), vencido o terminado. Legal registra la terminación anticipada con fecha y motivo. |
| Contratos | Cartera vigente, en proceso, por vencer, vencidos y terminados, con monto, término, situación y responsable; resumen con contratos vigentes, valor anual estimado, por vencer y sin responsable. Búsqueda por contraparte o título, tipo, área y "solo los míos". Versiones, comentarios de Legal y de Negocio, historial completo. |
| Reportes | Contratos en revisión, tiempo promedio de revisión, hallazgos por riesgo y por tema, próximos vencimientos. Todo calculado con los registros de la app. |
| Expedientes corporativos | Por cada parte (la empresa y sus contrapartes): acta constitutiva, poderes, constancia de situación fiscal, identificación y comprobante de domicilio. Acepta PDF (también escaneado), Word o fotografía. La IA extrae escritura, notaría, folio mercantil, representante, poder y facultades, RFC y domicilio, cada dato con su documento y cita; Legal lo corrige y lo valida. |
| Verificación de declaraciones | Al analizar un contrato, la IA compara las declaraciones de cada parte contra su expediente. Si un dato no coincide o es de relleno ("escritura número 00000"), propone corregirlo; si falta y el expediente lo tiene, propone agregarlo. Son hallazgos normales: con cita exacta, control de cambios y decisión de Legal. |
| Plantillas | Prestación de servicios, suministro, compraventa, arrendamiento y convenio de confidencialidad, alineadas con el playbook. Se llenan solas con los expedientes (proemio, declaraciones, firmas) y los datos del negocio (importes y plazos con letra). Lo que falte queda marcado como pendiente. La dirección jurídica edita las plantillas y cada cambio sube la versión. |
| Solicitudes | Quien solicita (área de negocio) sube el contrato que le envió la contraparte y carga los documentos corporativos; entra como "Recibido" a revisión de Legal. Los contratos desde plantilla los genera Legal. |
| Firma electrónica | Integración con Mifiel: Legal envía a firma un contrato aprobado. Si la versión vigente es Word, se convierte sola a PDF (texto completo, negritas, listas y tablas; no el formato exacto del Word) y se puede revisar antes con *Ver el PDF que se enviará*. Mifiel invita a cada firmante a firmar con su e.firma; los firmantes marcados como de la empresa también firman desde el contrato con *Ver y firmar* (componente oficial de firma de Mifiel). Al concluir, el portal guarda el PDF firmado y el XML con la constancia de conservación NOM-151 y marca el contrato como firmado. También se puede registrar una firma autógrafa a mano. |
| Roles | Abogado (revisa y valida), Director jurídico (todo, más editar playbook y plantillas, y reportes), Negocio (solicita contratos subiendo el de la contraparte, sube documentos, comenta y ve en qué va su solicitud; no ve el análisis de la IA, los riesgos, los comentarios internos de Legal, las plantillas ni el playbook, y la base de datos lo impide aunque se intente por la API). En una organización de demostración se cambia de perfil con un clic en la barra lateral. |

## Correr en local

Requisitos: Node.js 20 o superior y Docker (para Supabase local).

```bash
cd iq-contratos
npm install
npx supabase start            # Postgres, Auth y Storage locales
npx supabase db reset         # aplica supabase/migrations
cp .env.example .env.local    # complete los valores (ver abajo)
npm run seed                  # empresa ficticia, 3 usuarios, playbook, plantillas, expedientes y 7 contratos
npm run dev                   # http://localhost:3000
```

`npx supabase status` muestra la URL y las llaves locales. Con `ANTHROPIC_API_KEY` en
`.env.local`, `npm run seed -- --analizar` deja analizado el contrato de suministro para que la
demo arranque con ese análisis listo (tarda de 1 a 3 minutos).

Usuarios de demostración (contraseña `Demo-IQ-2026`; con `MODO_DEMO=true` aparecen como accesos
rápidos en la pantalla de ingreso):

| Usuario | Nombre | Rol |
|---|---|---|
| directora@empresa-cliente.example | Laura Méndez | Director jurídico |
| abogado@empresa-cliente.example | Carlos Rivas | Abogado |
| compras@empresa-cliente.example | Sofía Herrera | Negocio |

Datos de la demo: EMPRESA CLIENTE, S.A. DE C.V. y siete contratos ficticios con contrapartes
genéricas (PROVEEDOR XYZ, S.A. DE C.V. y otras "DEMO" o "EJEMPLO"), con su ficha llenada como la
dejaría la IA: tres en proceso de revisión, uno vigente, uno renovado automáticamente, uno por
vencer y uno vencido. El contrato de suministro trae a propósito
intereses moratorios solo a cargo del cliente, renovación automática anual con aviso de 90 días
naturales y jurisdicción en Monterrey; el de mantenimiento trae cláusulas de obra dentro de un
contrato de servicios. El playbook precargado es un ejemplo y debe revisarlo la dirección legal.

## Variables de entorno

| Variable | Alcance | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador y servidor | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador y servidor | Llave pública (publishable o anon). Todo acceso con ella pasa por RLS |
| `SUPABASE_SECRET_KEY` | solo servidor | Llave secreta (secret o service_role). Solo para escrituras del sistema |
| `ANTHROPIC_API_KEY` | solo servidor | Llave de la API de Anthropic. Nunca llega al navegador |
| `ANTHROPIC_MODEL` | solo servidor | Modelo del análisis. Por defecto `claude-sonnet-5-5` |
| `MODO_DEMO` | servidor | `true` muestra los usuarios demo en el ingreso. Nunca en un ambiente con datos reales |
| `ALERTAS_CORREO_ACTIVAS` | servidor | `false` en la demo: las alertas solo se muestran en la app |
| `CRON_SECRET` | servidor | Secreto de la tarea diaria de avisos (`/api/alertas/cron`) |
| `MIFIEL_APP_ID` | solo servidor | Opcional. Normalmente la dirección jurídica conecta Mifiel desde *Firmas* y las credenciales se guardan cifradas en Supabase Vault por organización; estas variables solo sirven para una instalación de una sola empresa. APP_ID de Mifiel |
| `MIFIEL_APP_SECRET` | solo servidor | APP_SECRET de Mifiel. Nunca llega al navegador |
| `MIFIEL_ENTORNO` | servidor | `sandbox` (por defecto, sin validez legal) o `produccion` |
| `MIFIEL_WEBHOOK_CLAVE` | solo servidor | Opcional, junto con las anteriores: clave de 16 caracteres o más que protege la URL de avisos. Al conectar desde *Firmas*, la clave se genera sola |

## Pruebas

```bash
npm test                    # unitarias: parser, esquema JSON, citas, fechas, avisos, reportes, .docx
npm run test:integracion    # RLS, permisos y reglas de validación contra Supabase local
npm run lint                # revisión de tipos
```

Las pruebas de integración modifican datos de la semilla; corra `npm run seed` después.

## Despliegue en Vercel

1. **Supabase en la nube.** Cree un proyecto (de preferencia en una región cercana a México) y
   aplique las migraciones:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```
   En Authentication, desactive el registro abierto (los usuarios se dan de alta por invitación).
2. **Datos de demo (opcional).** Con las variables del proyecto en `.env.local`, `npm run seed`.
   No lo corra en un proyecto con datos reales: borra y recrea la empresa de demostración.
3. **Proyecto en Vercel.** Importe el repositorio como un proyecto nuevo, separado del sitio
   ibarraquezada.com, con **Root Directory = `iq-contratos`** (Vercel detecta Next.js).
   El `vercel.json` de la raíz (el del sitio) redirige `/iq-contratos/...` a la página de inicio
   para que el sitio no publique el código de la app. No use `.vercelignore` para eso: Vercel
   aplica el de la raíz del repositorio a todos sus proyectos y borraría la app antes de construirla.
4. **Variables.** Cargue las de la tabla anterior en Settings > Environment Variables. En
   producción use `MODO_DEMO=false`.
5. **Duración de funciones.** El análisis declara `maxDuration = 300` segundos. Verifique que su
   plan de Vercel permita esa duración; un contrato largo puede tardar varios minutos.
6. **Avisos por correo (cuando se activen).** Agregue un cron en `vercel.json` hacia
   `/api/alertas/cron`, defina `CRON_SECRET`, conecte un proveedor de correo en
   `lib/alertas/correo.ts` y cambie `ALERTAS_CORREO_ACTIVAS=true`.

## Arquitectura

```
app/                      rutas (App Router)
  (app)/                  inicio, contratos, expedientes, plantillas, vencimientos, playbook, firmas, reportes
  api/contratos/          subida, análisis y contrapropuesta
  api/documentos/         descarga del original con enlace firmado y bitácora
  api/contrapropuestas/   descarga de contrapropuestas con enlace firmado y bitácora
  api/expedientes/        carga de documentos corporativos y extracción con IA
  api/plantillas/         generación de contratos desde plantilla
  api/alertas/cron/       tarea diaria de avisos (desactivada)
lib/
  parsing/                extracción PDF (pdfjs vía unpdf) y Word (mammoth); parser de cláusulas
  ai/                     esquema zod, prompt, llamada a la API, verificación de citas
  corporativo/            campos del expediente, extracción de documentos, vínculo con contratos
  plantillas/             plantillas base, llenado y cantidades con letra
  docx/                   contrapropuesta con control de cambios y Word desde texto
  fechas/                 fechas derivadas, alertas y avisos
  reportes/               indicadores del tablero
supabase/migrations/      esquema, RLS, triggers de reglas y bucket privado
supabase/seed/            semilla, contratos y expedientes ficticios
tests/                    pruebas unitarias e integración
```

**Acceso a datos.** Las lecturas usan la sesión del usuario y RLS las limita a su organización.
Las decisiones humanas (validar, cambiar estado, comentar, editar playbook) también usan la sesión,
y RLS más triggers verifican el rol. Las escrituras del sistema (procesar una subida, guardar un
análisis, bitácora) se hacen desde el servidor con la llave secreta, después de verificar sesión y
organización.

**Análisis.** Una sola llamada con salida estructurada (`output_config.format` con el esquema zod),
esfuerzo `high` y respaldo automático de la API si el modelo declina. El playbook va en el prompt de
sistema con caché. La respuesta se valida de nuevo con zod en el servidor; las citas se ubican en el
texto tolerando solo diferencias tipográficas; las fechas se extraen tal como las dice el contrato y
el servidor calcula periodos y plazos. Cada análisis guarda modelo y versión del prompt.

**Expedientes y plantillas.** Los documentos corporativos se mandan al modelo como PDF, imagen o
texto con salida estructurada; el servidor valida fechas y RFC, y un documento solo reemplaza un dato
si es su fuente primaria (el poder para el representante, el acta para la constitución); si no, solo
reporta la diferencia. No se guarda el texto de esos documentos, solo los datos y la cita breve de
cada uno. Si alguien fuera de Legal cambia un dato, un trigger regresa el expediente a "por validar".
Las plantillas se llenan con una función pura (`lib/plantillas/llenar.ts`), así que la vista previa
y el Word generado son idénticos y lo que falta nunca se inventa.

**Cambio de perfil (solo demo).** Si la organización tiene `es_demo = true`, el servidor genera un
enlace de un solo uso para el perfil elegido y lo canjea en la misma solicitud; nunca sale al
navegador. En una organización real `es_demo` debe ser `false` y la opción no aparece.

**Confidencialidad.** Bucket privado sin políticas para usuarios: los archivos solo salen por
enlaces firmados de 5 minutos emitidos por el servidor; cada vista y descarga queda en
`document_access_log` (consultable por el director jurídico). Los logs técnicos (`lib/log.ts`) solo
registran identificadores y conteos, nunca texto del contrato.

## Limitaciones conocidas de la demo

- Los expedientes y documentos corporativos de la semilla son ficticios (las notarías 901 a 903 no
  existen). Las plantillas son un punto de partida que la dirección jurídica debe revisar.
- La extracción de documentos corporativos depende de la calidad del escaneo; cada dato debe
  validarse contra el original antes de usarse.
- PDF escaneado sin texto: se rechaza con un mensaje claro. No hay OCR.
- Word no tiene páginas fijas: el visor arma páginas de lectura de tamaño similar.
- La contrapropuesta es un .docx nuevo con estructura limpia; no conserva estilos, membretes ni
  tablas del Word original.
- Firma registrada manualmente; no hay firma electrónica.
- Un análisis por llamada: contratos muy extensos pueden exceder el límite de salida del modelo.
- Los avisos por correo están preparados pero sin proveedor conectado.

## Qué faltaría para producción

**Protección de datos personales (LFPDPPP).** La ley vigente es la Ley Federal de Protección de
Datos Personales en Posesión de los Particulares publicada en el DOF el 20 de marzo de 2025, que
abrogó la de 2010; según la Cámara de Diputados, su última reforma se publicó el 14 de noviembre de
2025. Los contratos de terceros contienen datos personales (representantes, domicilios, firmas). Para
producción faltaría, con revisión jurídica de cada punto contra el texto vigente:
- Definir el papel de cada parte: la empresa cliente como responsable del tratamiento, el despacho y
  los proveedores tecnológicos (Supabase, Vercel, Anthropic) como encargados, con los contratos de
  encargo correspondientes.
- Aviso de privacidad para los usuarios de la plataforma y revisión de cómo se informa a los
  titulares cuyos datos aparecen en los contratos.
- Evaluar las transferencias y remisiones internacionales (servidores fuera de México) y los
  términos de retención de datos de cada proveedor, incluida la API de Anthropic.
- Procedimiento para solicitudes de derechos ARCO y para vulneraciones de seguridad.
- Documentar las medidas de seguridad administrativas, técnicas y físicas.

**Multiempresa.** El modelo ya aísla por `org_id` con RLS. Falta: alta de organizaciones e
invitación de usuarios, administración de roles desde la app, SSO, límites de uso por
organización, pruebas automáticas de aislamiento en CI y, si se requiere, cifrado con llaves por
organización.

**Respaldos.** Activar respaldos con recuperación a un punto en el tiempo de Postgres, respaldo del
almacenamiento de archivos (que no está cubierto por el respaldo de la base) y un simulacro
periódico de restauración.

**Retención de documentos.** Política por tipo de contrato (por ejemplo, vigencia más un plazo
definido por la dirección legal), borrado seguro al vencer, bloqueo por litigio que suspenda el
borrado, bitácora inmutable y exportación completa de los documentos de un cliente al terminar el
servicio.

**Otros.** OCR para PDF escaneados, conservar el formato del Word original en la contrapropuesta,
firma electrónica, envío de correo, límites de frecuencia en las rutas de análisis, monitoreo de
errores sin datos del contrato, y una evaluación de calidad del análisis con contratos reales
anonimizados antes de usarlo con clientes.

## Guion de demo (5 minutos) para un director jurídico

Preparación: `npm run seed -- --analizar` (deja analizado el contrato de suministro), ingrese como
**Carlos Rivas (Abogado)** y tenga a mano un contrato real del prospecto en PDF o Word. Para cambiar
de perfil durante la demo, haga clic en el nombre en "Ver la demo como" de la barra lateral.

1. **Minuto 0 a 0:30. Inicio.** Muestre la lista de pendientes y el aviso al pie: la herramienta
   propone, el abogado decide.
2. **0:30 a 2:00. El análisis.** Abra *Contrato de suministro*. Muestre el resumen para el
   negocio y los contadores. Haga clic en las tarjetas de **Intereses moratorios**, **Renovación
   automática** y **Jurisdicción**: el documento salta a la cita exacta resaltada. Explique que si
   la IA no puede citar el texto exacto, el hallazgo no se muestra.
3. **2:00 a 3:00. La validación.** Acepte intereses moratorios, edite la jurisdicción y descarte un
   hallazgo menor; muestre usuario y hora. Intente pasar el estado a *Aprobado*: se bloquea mientras
   haya riesgo alto pendiente. Muestre la barra de Validación de Legal.
4. **3:00 a 3:45. La contrapropuesta.** *Descargar contrapropuesta* y ábrala en Word, en Revisar:
   control de cambios real a nombre de Carlos Rivas, listo para la contraparte. El contrato pasa
   solo a *En negociación*, y en Versiones la contrapropuesta queda marcada como descargada.
5. **3:45 a 4:15. Lo que no se olvida.** En *Vencimientos*, la fecha límite para el aviso de no
   renovación con el área de Compras responsable y sus avisos programados. Abra el calendario.
6. **4:15 a 5:00. Su contrato.** *Subir contrato* con el documento del prospecto y deje que la IA
   analice el contrato frente a él. Cierre con *Playbook* (cambiando a Laura
   Méndez si hay tiempo): el criterio es el de su dirección legal, no el de la herramienta.

Recorrido opcional del ciclo completo (3 minutos más):

7. **La plantilla.** Como Carlos, *Nuevo contrato*, *Desde plantilla*: prestación de servicios,
   contraparte *LOGÍSTICA DEMO*, descripción y monto. La vista previa ya trae proemio,
   declaraciones con escritura, poder, RFC y domicilio, y el monto con letra. *Generar contrato*:
   entra como "Recibido". Sofía Herrera (Negocio) no ve plantillas ni playbook: solicita subiendo
   el contrato de la contraparte.
8. **Los documentos.** En *Expedientes corporativos*, abra *PROVEEDOR XYZ*: cada dato muestra de qué
   documento sale y su cita. Regrese al contrato de suministro como Carlos y use *Volver a
   analizar*: la IA propone corregir la "escritura pública número 00000" y la notaría con los datos
   del acta constitutiva.

Si pregunta por confidencialidad: almacenamiento privado, enlaces firmados de 5 minutos, bitácora
de quién vio o descargó cada documento y ningún texto del contrato en logs.
