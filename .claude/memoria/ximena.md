# Memoria de Ximena

## Radar 2026-09-21 (primera corrida real)

Archivo: `despacho-web/radar-prospeccion/2026-09-21.md`. Empresas ya
usadas — no repetir en próximos radares salvo que surja una causa NUEVA
y distinta para ellas:
CM Logistics, PuntoPost, Logística y Administración LOAD, G&G
Facilitadores en Logística y Distribución, ZN Importaciones, Almacenadora
del Valle de México (ALVAMEX), Almacenadora México S.A. de C.V.,
Transportes y Logística SIVI, LNS Logística & Distribución.

Señales de M&A detectadas pero NO usadas como puerta de entrada (avisadas
a Gustavo en el radar, por si ameritan upsell vía Daniela): Grupo
MexAmerik / Transportes VIM (adquisición 51%, mayo 2026); Grupo Traxión /
Autotransportes El Bisonte.

## Limitación técnica de esta corrida — revisar la próxima vez

WebFetch estuvo bloqueado por la red para casi todos los dominios
(`dof.gob.mx`, `psm.economia.gob.mx`, ComprasMX, `occ.com.mx`,
`computrabajo.com`, y la mayoría de sitios de prensa/despachos). Solo
WebSearch funcionó. Por eso no pude cruzar ninguna empresa contra el PSM,
el padrón público de REPSE ni una vacante específica de bolsa de trabajo
— el radar salió de 9 empresas en vez de 15-20, apoyado en cobertura de
prensa y directorios públicos en vez de los registros interactivos. Si la
próxima corrida WebFetch vuelve a funcionar, retomar el cruce completo
(PSM de los últimos 30 días, padrón REPSE, vacantes lunes-a-sábado en
OCC/Computrabajo) para llegar al rango completo de 15-20 con triggers más
específicos por empresa.

## Radar 2026-09-23 (reintento con política de red ampliada)

Archivo: `despacho-web/radar-prospeccion/2026-09-23.md`. 13 empresas
NUEVAS (no reusar salvo causa nueva y distinta): Grupo S.I.C. Agentes
Aduanales, ZN Importaciones (reuso con causa nueva: reforma Ley Aduanera,
distinta a la causa de comercio exterior usada el 21-sep), Asesores AYV,
New Trade DG México, IMPOCARNES, Inter Médica Solutions DM, Esencial MX,
Comercializadora Gumont, AGR Outsourcing/Distribuidora AGR, Industrias
Man, ALCAMARE International Recycling Group, Logística Médica, RALCA.

Candidatos investigados y DESCARTADOS por tamaño probablemente fuera del
ICP (no reinvestigar salvo nueva evidencia de tamaño): Grupo Arcosa /
Frigoríficos Arcosa (grupo de 5 plantas multiestado), Centauros del
Sureste (16 sucursales, fundada 1957), Corporativo Enciso (agencia
aduanal más grande de México, multi-sede), SIRLA (sede real en Nuevo
León, no CDMX).

Nueva señal de M&A (no entrada, aviso a Gustavo/Daniela si amerita
upsell): Radiant Logistics adquirió el 80% de WePort, S.A. de C.V.
(freight forwarder CDMX, ~70 empleados, fundada 2016).

### Resultado del reintento de acceso a registros interactivos (23-sep-2026)

La política de red ampliada SÍ liberó `dof.gob.mx` (sin `www`) — pude leer
decretos completos del DOF directamente por primera vez (confirmé la
reforma de jornada de 46h con sus artículos exactos y descubrí y verifiqué
un detonante nuevo: la reforma a la Ley Aduanera del 19-nov-2025, arts.
159, 167-D y 53 fracc. II, sobre consejo de administración y
responsabilidad solidaria de agencias aduanales). `www.dof.gob.mx` (con
`www`) da error de certificado SSL — usar siempre la versión sin `www`.

PSM y REPSE: el dominio ya no está bloqueado por política, pero AMBOS son
aplicaciones de una sola página (JSF/PrimeFaces con sesión el PSM; bundles
Vite en JS el REPSE) que no puedo navegar ni consultar con las
herramientas de solo-lectura de HTML que tengo — esto es una limitación
técnica de la herramienta, no de la política de red. ComprasMX
(`comprasmx.buengobierno.gob.mx`) responde pero es el mismo tipo de SPA,
mismo resultado.

OCC (`occ.com.mx`): sigue dando 403 propio del sitio (antibot), confirmado
también con `curl` directo sin pasar por mi herramienta — no es bloqueo de
política, es del sitio mismo.

Computrabajo: `computrabajo.com.mx` responde pero solo redirige (301) al
dominio real de contenido `mx.computrabajo.com`, y ESE dominio sigue
bloqueado por la política de red del proxy (`CONNECT tunnel failed`) — a
diferencia de lo que se había verificado fuera de mi contexto. Si se
vuelve a intentar, probar directamente contra `mx.computrabajo.com`, no
contra `computrabajo.com.mx`.

Alternativa que SÍ funcionó bien para vacantes con horario específico:
las herramientas de búsqueda de empleo de Indeed disponibles en esta
sesión (no son OCC/Computrabajo, pero sirven el mismo propósito
metodológico y dieron vacantes reales con horario textual y fecha de
publicación).

## Radar 2026-09-23-v2 (mismo día, ICP ampliado + LinkedIn de solo lectura)

Archivo: `despacho-web/radar-prospeccion/2026-09-23-v2.md` (no pisa el
`2026-09-23.md` de la corrida anterior del mismo día). Cambio de criterio
importante desde esta orden, vale para todas las corridas futuras:
**el ICP ya NO está limitado a logística/transporte/almacenaje**
(`CLAUDE.md` dice ahora "cualquier sector"), y **LinkedIn ahora está
autorizado para lectura** (perfil de empresa, nombre/cargo del decisor,
tamaño de plantilla) — nunca para conectar ni mensajear, eso lo sigue
haciendo JC a mano.

16 empresas NUEVAS, ninguna de logística/transporte/almacenaje (no
repetir salvo causa nueva y distinta): DIMA Diseño y Manufactura, OZKEN
(maquinados), De Aguiar Dental Studio, Bucio Casco y Asociados S.C.,
Lafayette Repostería, Bespoke Advertising, Comercializadora Delibanez,
Contadores Mismo Lenguaje, Dental Network (clínica CDMX), Distribuidora
Moldemania, Método Escala Negocios, Ideas y Soluciones S.A. de C.V.,
Diseño y Construcción OSCARQ, JAYOL S.A. de C.V., Grupo Sickse S.A. de
C.V., Súper Soya.

Decisor + LinkedIn confirmado con certeza en solo 2 de 16: Dr. Eduardo de
Aguiar (De Aguiar Dental Studio, fundador) y Manuel Bucio Montañez (Bucio
Casco y Asociados). En las otras 14 no encontré con certeza quién es el
dueño/director general — PyMEs y negocios familiares chicos casi nunca
tienen a su dueño indexado en LinkedIn de forma que un buscador lo
encuentre. Para la próxima corrida: si hace falta subir esa tasa, probar
fetch directo a la página de LinkedIn de cada empresa (`/company/...`) en
vez de solo WebSearch — funcionó razonablemente bien para leer tamaño de
plantilla, pero casi nunca lista al dueño ahí; el nombre del dueño se
encuentra más por prensa/nota individual que por la ficha de la empresa.

Candidatos investigados y DESCARTADOS: Hobi (startup, pero su sede real
es Monterrey, no CDMX — el ICP es estrictamente CDMX); Super Mayoreo
Naturista (sede real en Naucalpan, Estado de México, no CDMX, aunque
tiene vacante publicada en CDMX); Grupo Mako Construcciones (dato de
ZoomInfo ubica la sede en San Mateo Atenco, Edomex, aunque ejecuta obra
en CDMX — no usar hasta confirmar sede real); Ingenierías y
Construcciones ELDEPCI (sede real en Toluca, Edomex); PROBELL
Profesionales de la Belleza (más de 100 sucursales en México, más de 30
en CDMX — tamaño de cadena nacional, fuera de rango de PyME 10-150
empleados); Waldo's y Kaiten Tokyo (cadenas/negocios sin datos
suficientes para confirmar tamaño o sede única).

### Hallazgo técnico nuevo: PSM sí es legible por documento individual

`psm.economia.gob.mx/PSM/ServletMain?id_pub=<n>` SÍ devuelve el PDF
completo y legible de una publicación societaria cuando se conoce el
`id_pub` exacto (confirmado leyendo varias actas reales completas). El
problema sigue siendo **descubrir** los `id_pub` de movimientos
RECIENTES: los únicos indexados por buscador que encontré son de
2015-2019 (viejos, ya no sirven como causa "de los últimos 30 días"). La
página de búsqueda pública (`psm.economia.gob.mx/PSM/busqueda.jsf`) sigue
siendo un formulario interactivo con sesión que WebFetch no puede operar.
Si en una próxima corrida aparece una herramienta con soporte de
formularios/JS (navegador real), retomar el cruce completo del PSM de
los últimos 30 días — sería el upgrade más valioso posible para la línea
de constitución, que esta corrida tuvo que apoyarse en la obligación
genérica del art. 181 LGSM en vez de movimientos específicos detectados.

Indeed: el buscador de empleo funcionó bien para encontrar vacantes reales
con empresa, fecha y ubicación, pero los links de resultado
(`to.indeed.com/...`) están bloqueados por la política de red al hacer
WebFetch — no pude leer el texto completo de ninguna vacante (horario
exacto, detalle de "lunes a sábado"). Usé el título/empresa/fecha del
listado de búsqueda como señal, sin poder citar el horario textual exacto
de cada vacante.

## Detonantes verificados (reusar como base, revalidar fecha si pasa mucho tiempo)

- Jornada 46h: reforma LFT, DOF 1-may-2026 (leído directo del DOF el
  23-sep-2026: reforma arts. 59, 61, 66, 68, 69, 71-segundo párrafo;
  adiciona párrafo 2 al art. 58, fracción XXXIV al art. 132 (registro
  electrónico de entrada/salida) y fracción IV Bis al art. 994; deroga
  segundo párrafo del art. 67). Vigente desde el 1-may-2026; jornada baja
  a 46h el 1-ene-2027 (escalonado hasta 40h en 2030), sin reducción de
  salario/prestaciones. Fuente: dof.gob.mx/nota_detalle.php?codigo=5786537
  (usar dof.gob.mx SIN "www" — con "www" da error de certificado).
- Reforma a la Ley Aduanera (detonante NUEVO, verificado 23-sep-2026):
  DOF 19-nov-2025 (dof.gob.mx/nota_detalle.php?codigo=5773357), vigencia
  general 1-ene-2026 (esto último vía fuentes secundarias, no confirmé el
  artículo transitorio exacto directo del DOF). Art. 159: patente de
  agente aduanal ahora dura 20 años prorrogables. Art. 167-D: autorización
  de agencia aduanal dura igual que la patente de mayor vigencia de sus
  socios, prorrogable hasta 20 años más, y exige que los agentes
  aduanales socios estén en el consejo de administración de la agencia.
  Art. 53 fracc. II: los agentes aduanales socios son responsables
  solidarios por contribuciones de comercio exterior. Línea de entrada:
  constitución (Isabel), aplica a cualquier agencia aduanal — buen
  detonante para PyMEs de comercio exterior/agencias aduanales en CDMX.
- Art. 181 LGSM: asamblea ordinaria anual dentro de los 4 meses
  siguientes al cierre de ejercicio (si cierra 31-dic, vence 30-abr) —
  prospectar desde noviembre, no antes.
- Art. 15 LFT (REPSE): vigencia 3 años, renovación se tramita en los 3
  meses previos al vencimiento. No tengo acceso al padrón público para
  cruzar empresas específicas.
- PSM (psm.economia.gob.mx/PSM/): consulta pública de movimientos
  societarios, pero requiere navegación interactiva — no indexado por
  buscador, necesito WebFetch/acceso directo para usarlo.
