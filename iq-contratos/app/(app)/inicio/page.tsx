import Link from "next/link";
import { EtiquetaEstado } from "@/components/ui/etiquetas";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fecha, fechaCorta, fechaLargaHoy } from "@/lib/formato";
import { diasEntre, duracion, lineaTiempo, PROCESO, type EstadoPaso, type LineaTiempo } from "@/lib/linea-tiempo";
import { COLUMNAS, DIAS_VENCIMIENTOS, hoyMx, pendientes, sumarDiasIso, type ContratoResumen } from "@/lib/inicio/pendientes";
import { ESTADOS, ORDEN_ESTADOS, type EstadoContrato } from "@/lib/tipos";

export const metadata = { title: "Inicio" };

// Firmados que la directora ve en el inicio, además de todos los contratos en curso.
const FIRMADOS_EN_INICIO = 10;

const saludo = () => {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Mexico_City" }));
  return h < 12 ? "Buen día" : h < 19 ? "Buenas tardes" : "Buenas noches";
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const MENSAJE: Record<EstadoContrato, string> = {
  recibido: "Legal recibió su solicitud",
  en_revision: "Legal está revisando el contrato",
  en_negociacion: "Legal negocia cambios con la contraparte",
  aprobado: "Aprobado; sigue la firma",
  firmado: "Firmado y en seguimiento",
};

// Fecha en que cada contrato entró a su etapa actual, a partir de la bitácora.
async function lineasDe(contratos: ContratoResumen[]) {
  const ids = contratos.map((c) => c.id);
  const supabase = await clienteSesion();
  const { data: cambios } = ids.length
    ? await supabase.from("audit_events").select("contract_id, detalle, creado_en").eq("accion", "estado_cambiado").in("contract_id", ids)
    : { data: [] };
  return new Map(
    contratos.map((c) => [
      c.id,
      lineaTiempo({
        estado: c.estado,
        recibido_en: c.recibido_en,
        aprobado_en: c.aprobado_en,
        firmado_en: c.firmado_en,
        cambios: (cambios ?? []).filter((e) => e.contract_id === c.id).map((e) => ({ a: String((e.detalle as { a?: string })?.a ?? ""), creado_en: e.creado_en })),
      }),
    ]),
  );
}

function Encabezado({ nombre, resumen }: { nombre: string; resumen: string }) {
  return (
    <header>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mandarina-texto">{fechaLargaHoy()}</p>
      <h1 className="titulo mt-1 text-[30px] leading-tight">
        {saludo()}, {nombre}
      </h1>
      <p className="mt-1 text-[14px] text-secundario">{resumen}</p>
    </header>
  );
}

// ---------- Negocio ----------

function LineaSolicitud({ linea }: { linea: LineaTiempo }) {
  const barra: Record<EstadoPaso, string> = { hecho: "bg-bajo", actual: "bg-mandarina", omitido: "bg-bajo/35", pendiente: "bg-gris-100" };
  return (
    <ol className="grid grid-cols-5 gap-1.5">
      {linea.pasos.map((p) => (
        <li key={p.estado} aria-current={p.situacion === "actual" ? "step" : undefined}>
          <span className={`block h-1.5 rounded-full ${barra[p.situacion]}`} />
          <span className={`mt-1.5 block truncate text-[11.5px] leading-tight ${p.situacion === "actual" ? "font-semibold text-tinta" : p.situacion === "pendiente" ? "text-secundario/80" : "text-tinta"}`}>
            {PROCESO[p.estado].corto}
          </span>
          <span className="block text-[11px] leading-tight text-secundario">
            {p.situacion === "pendiente" ? "Pendiente" : p.situacion === "omitido" ? (p.estado === "en_negociacion" ? "No fue necesaria" : "Sin fecha") : p.desde ? fechaCorta(p.desde) : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

// El proceso completo solo se explica a quien todavía no ha pedido nada.
function ProcesoCompleto() {
  return (
    <ol className="mt-5 grid grid-cols-5 gap-3">
      {ORDEN_ESTADOS.map((e, i) => (
        <li key={e} className="rounded-lg border border-linea bg-white p-3.5">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mandarina-suave font-titulo text-[12px] font-semibold text-mandarina-texto">{i + 1}</span>
            <span className="text-[13px] font-semibold leading-tight">{PROCESO[e].titulo}</span>
          </span>
          <span className="mt-2 block text-[12px] leading-relaxed text-secundario">{PROCESO[e].que}</span>
        </li>
      ))}
    </ol>
  );
}

async function InicioNegocio({ nombre, usuarioId, enCurso }: { nombre: string; usuarioId: string; enCurso: ContratoResumen[] }) {
  const supabase = await clienteSesion();
  const { data: firmadas } = await supabase
    .from("contracts")
    .select("id, titulo, contraparte, firmado_en")
    .eq("estado", "firmado")
    .or(`solicitado_por.eq.${usuarioId},creado_por.eq.${usuarioId}`)
    .order("firmado_en", { ascending: false })
    .limit(5);
  const lineas = await lineasDe(enCurso);
  const orden = [...enCurso].sort((a, b) => b.recibido_en.localeCompare(a.recibido_en));
  const nada = orden.length === 0 && (firmadas ?? []).length === 0;

  return (
    <div className="mx-auto max-w-[1100px] px-8 py-8">
      <Encabezado
        nombre={nombre}
        resumen={orden.length ? `Tiene ${plural(orden.length, "solicitud en curso", "solicitudes en curso")} con Legal.` : "No tiene solicitudes en curso."}
      />

      {nada && (
        <section className="mt-7 rounded-xl border border-linea bg-white p-7">
          <h2 className="titulo text-[20px]">Pida su primer contrato</h2>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-secundario">
            Suba el contrato que le envió la contraparte y los documentos corporativos. Legal lo revisa y aquí verá en qué etapa va, sin escribir correos.
          </p>
          <Link href="/solicitar" className="mt-4 inline-flex h-10 items-center rounded-md bg-mandarina px-5 text-[14px] font-medium text-tinta hover:bg-mandarina-oscuro">
            Solicitar nuevo contrato
          </Link>
          <ProcesoCompleto />
        </section>
      )}

      {orden.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 titulo text-[18px]">En curso</h2>
          <ul className="grid grid-cols-2 gap-3">
            {orden.map((c) => {
              const l = lineas.get(c.id)!;
              return (
                <li key={c.id}>
                  <Link href={`/contratos/${c.id}`} className="block rounded-lg border border-linea bg-white p-4 shadow-[var(--shadow-tarjeta)] transition-colors hover:border-mandarina/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold">{c.titulo}</p>
                        <p className="truncate text-[12.5px] text-secundario">{c.contraparte || "Contraparte por identificar"}</p>
                      </div>
                      <EtiquetaEstado estado={c.estado} />
                    </div>
                    <div className="mt-4">
                      <LineaSolicitud linea={l} />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-linea pt-3 text-[12.5px]">
                      <span>{MENSAJE[c.estado]}</span>
                      <span className="shrink-0 text-[12px] text-secundario">{duracion(diasEntre(l.enEtapaDesde))} en esta etapa</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(firmadas ?? []).length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="titulo text-[18px]">Firmadas recientemente</h2>
            <Link href="/contratos?mios=1" className="text-[13px] font-medium text-mandarina-texto hover:underline">
              Ver todas
            </Link>
          </div>
          <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea bg-white">
            {firmadas!.map((c) => (
              <li key={c.id}>
                <Link href={`/contratos/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-lienzo">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{c.titulo}</span>
                    <span className="block truncate text-[12.5px] text-secundario">{c.contraparte || "Contraparte sin identificar"}</span>
                  </span>
                  <span className="shrink-0 text-[12.5px] text-secundario">Firmado el {fecha(c.firmado_en)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------- Legal ----------

const ICONOS = {
  revisar: "M6 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 6 17zM12 2.5V7h4",
  persona: "M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5",
  expediente: "M3 6.5h5l1.5 1.5H17v8.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5z",
  firma: "M3 15c2-1 3-5 5-5s0 5 2 5 2-3 3.5-3 1 2 2.5 2M3 17.5h14",
  calendario: "M4 5h12v12H4zM4 8.5h12M7.5 3v3M12.5 3v3",
};

function Tarea({ n, texto, href, accion, icono, urgente }: { n: number; texto: string; href: string; accion: string; icono: keyof typeof ICONOS; urgente?: boolean }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-lienzo">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${urgente ? "bg-riesgo-suave text-riesgo" : "bg-mandarina-suave text-mandarina-texto"}`}>
          <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={ICONOS[icono]} />
          </svg>
        </span>
        <span className="flex-1 text-[14px]">
          <span className="font-semibold tabular-nums">{n}</span> {texto}
        </span>
        <span className="text-[13px] font-medium text-mandarina-texto group-hover:underline">{accion}</span>
      </Link>
    </li>
  );
}

function Vence({ dias }: { dias: number }) {
  if (dias < 0) return <span className="font-semibold text-riesgo">Venció hace {duracion(-dias)}</span>;
  if (dias === 0) return <span className="font-semibold text-riesgo">Vence hoy</span>;
  return <span className={dias <= 7 ? "font-semibold text-riesgo" : "text-secundario"}>En {duracion(dias)}</span>;
}

async function InicioLegal({ nombre, usuarioId, director, p }: { nombre: string; usuarioId: string; director: boolean; p: Awaited<ReturnType<typeof pendientes>> }) {
  const supabase = await clienteSesion();
  const hoy = hoyMx();
  const [{ data: proximos }, { data: perfiles }, { count: firmadosMes }, { data: firmados }] = await Promise.all([
    supabase
      .from("alerts")
      .select("id, titulo, fecha_limite, contract_id, contracts(titulo)")
      .eq("estado", "activa")
      .lte("fecha_limite", sumarDiasIso(hoy, DIAS_VENCIMIENTOS))
      .order("fecha_limite")
      .limit(5),
    supabase.from("profiles").select("id, nombre"),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("estado", "firmado").gte("firmado_en", `${hoy.slice(0, 7)}-01`),
    // La directora ve también los firmados más recientes, con su línea de tiempo completa.
    director
      ? supabase.from("contracts").select(COLUMNAS).eq("estado", "firmado").order("firmado_en", { ascending: false }).limit(FIRMADOS_EN_INICIO)
      : Promise.resolve({ data: [] as ContratoResumen[] }),
  ]);
  const nombreDe = (id: string | null) => (id ? (perfiles?.find((x) => x.id === id)?.nombre ?? "") : "");

  const tareas = [
    { n: p.porRevisar, texto: p.porRevisar === 1 ? "contrato espera revisión" : "contratos esperan revisión", href: "/contratos?vista=proceso", accion: "Revisar", icono: "revisar" as const },
    { n: p.sinResponsable, texto: p.sinResponsable === 1 ? "contrato en curso sin abogado responsable" : "contratos en curso sin abogado responsable", href: "/contratos?vista=proceso", accion: "Asignar", icono: "persona" as const },
    { n: p.paraFirma, texto: p.paraFirma === 1 ? "contrato aprobado listo para firma" : "contratos aprobados listos para firma", href: "/firmas", accion: "Enviar a firma", icono: "firma" as const },
    { n: p.vencimientos, texto: p.vencimientos === 1 ? `plazo vencido o por vencer en ${DIAS_VENCIMIENTOS} días` : `plazos vencidos o por vencer en ${DIAS_VENCIMIENTOS} días`, href: "/vencimientos", accion: "Atender", icono: "calendario" as const, urgente: true },
    { n: p.expedientes, texto: p.expedientes === 1 ? "expediente corporativo por validar" : "expedientes corporativos por validar", href: "/expedientes", accion: "Validar", icono: "expediente" as const },
  ].filter((t) => t.n > 0);

  // Contratos en curso, los que llevan más tiempo en su etapa primero. El abogado ve los
  // primeros seis; la directora, todos.
  const firmadosRecientes = (firmados ?? []) as ContratoResumen[];
  const lineas = await lineasDe([...p.enCurso, ...firmadosRecientes]);
  const ordenados = p.enCurso.map((c) => ({ ...c, dias: diasEntre(lineas.get(c.id)!.enEtapaDesde) })).sort((a, b) => b.dias - a.dias);
  const enCurso = director ? ordenados : ordenados.slice(0, 6);
  const porEstado = (e: EstadoContrato) => p.enCurso.filter((c) => c.estado === e).length;

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <Encabezado
        nombre={nombre}
        resumen={tareas.length ? `Lo más urgente: ${tareas[0].n} ${tareas[0].texto}.` : "Todo al día. No hay pendientes de Legal."}
      />

      {director && (
        <section className="mt-6 grid grid-cols-5 gap-3" aria-label="Contratos en curso por etapa">
          {ORDEN_ESTADOS.filter((e) => e !== "firmado").map((e) => (
            <div key={e} className="rounded-lg border border-linea bg-white px-4 py-3">
              <p className="font-titulo text-[24px] font-semibold leading-none tabular-nums">{porEstado(e)}</p>
              <p className="mt-1.5 text-[12.5px] text-secundario">{ESTADOS[e]}</p>
            </div>
          ))}
          <div className="rounded-lg border border-linea bg-white px-4 py-3">
            <p className="font-titulo text-[24px] font-semibold leading-none tabular-nums">{firmadosMes ?? 0}</p>
            <p className="mt-1.5 text-[12.5px] text-secundario">Firmados este mes</p>
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6">
        <div className="space-y-6">
          {tareas.length === 0 && director && (
            <p className="rounded-xl border border-linea bg-white px-5 py-8 text-center text-[13.5px] text-secundario">Sin pendientes para hoy.</p>
          )}
          {tareas.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-linea bg-white">
              <h2 className="border-b border-linea px-5 py-3 titulo text-[18px]">Para hoy</h2>
              <ul className="divide-y divide-linea">
                {tareas.map((t) => (
                  <Tarea key={t.texto} {...t} />
                ))}
              </ul>
            </section>
          )}

          {!director && (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="titulo text-[18px]">A su cargo y sin asignar</h2>
                <Link href="/contratos?vista=proceso&mios=1" className="text-[13px] font-medium text-mandarina-texto hover:underline">
                  Ver todos
                </Link>
              </div>
              {enCurso.length === 0 ? (
                <p className="rounded-xl border border-dashed border-linea-fuerte bg-white px-5 py-10 text-center text-[13.5px] text-secundario">
                  No hay contratos en curso a su cargo ni sin asignar.
                </p>
              ) : (
                <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea bg-white">
                  {enCurso.map((c) => (
                    <li key={c.id}>
                      <Link href={`/contratos/${c.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-lienzo">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{c.titulo}</span>
                          <span className="block truncate text-[12.5px] text-secundario">
                            {c.contraparte || "Contraparte sin identificar"} · {c.responsable_id === usuarioId ? "A su cargo" : "Sin responsable"}
                          </span>
                        </span>
                        <span className="shrink-0 text-[12.5px] tabular-nums text-secundario">{duracion(c.dias)} en la etapa</span>
                        <EtiquetaEstado estado={c.estado} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <section className="rounded-xl border border-linea bg-white">
          <div className="flex items-baseline justify-between border-b border-linea px-5 py-3">
            <h2 className="titulo text-[18px]">Vencimientos</h2>
            <Link href="/vencimientos" className="text-[13px] font-medium text-mandarina-texto hover:underline">
              Calendario
            </Link>
          </div>
          {(proximos ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-secundario">Nada vence en los próximos {DIAS_VENCIMIENTOS} días.</p>
          ) : (
            <ol className="divide-y divide-linea">
              {proximos!.map((a) => (
                <li key={a.id}>
                  <Link href={`/contratos/${a.contract_id}`} className="block px-5 py-3 hover:bg-lienzo">
                    <span className="block text-[13.5px] font-medium leading-snug">{a.titulo}</span>
                    <span className="mt-0.5 flex justify-between gap-3 text-[12px]">
                      <span className="truncate text-secundario">{(a.contracts as unknown as { titulo: string } | null)?.titulo}</span>
                      <span className="shrink-0">
                        <Vence dias={Math.round((Date.parse(`${a.fecha_limite}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 864e5)} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {director && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="titulo text-[18px]">Todos los contratos</h2>
            <Link href="/contratos?vista=todos" className="text-[13px] font-medium text-mandarina-texto hover:underline">
              Ver registro completo
            </Link>
          </div>
          <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea bg-white">
            {[...enCurso, ...firmadosRecientes].map((c) => {
              const l = lineas.get(c.id)!;
              return (
                <li key={c.id}>
                  <Link href={`/contratos/${c.id}`} className="grid grid-cols-[minmax(0,280px)_minmax(0,1fr)_150px] items-center gap-6 px-5 py-4 hover:bg-lienzo">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{c.titulo}</span>
                      <span className="block truncate text-[12.5px] text-secundario">{c.contraparte || "Contraparte sin identificar"}</span>
                      <span className="block truncate text-[12px] text-secundario">{c.responsable_id ? nombreDe(c.responsable_id) : "Sin abogado responsable"}</span>
                    </span>
                    <LineaSolicitud linea={l} />
                    <span className="flex flex-col items-end gap-1 text-right">
                      <EtiquetaEstado estado={c.estado} />
                      <span className="text-[12px] tabular-nums text-secundario">
                        {c.estado === "firmado" ? `En ${duracion(l.diasTotales)}` : `${duracion(diasEntre(l.enEtapaDesde))} en la etapa`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {enCurso.length + firmadosRecientes.length === 0 && <li className="px-5 py-10 text-center text-[13.5px] text-secundario">Aún no hay contratos.</li>}
          </ul>
          {firmadosRecientes.length === FIRMADOS_EN_INICIO && (
            <p className="mt-2 text-[12px] text-secundario">Se muestran todos los contratos en curso y los {FIRMADOS_EN_INICIO} firmados más recientes.</p>
          )}
        </section>
      )}
    </div>
  );
}

export default async function Inicio() {
  const usuario = await exigirUsuario();
  const p = await pendientes(usuario);
  const nombre = usuario.nombre.split(" ")[0];
  if (!p.legal) return <InicioNegocio nombre={nombre} usuarioId={usuario.id} enCurso={p.enCurso} />;
  return <InicioLegal nombre={nombre} usuarioId={usuario.id} director={usuario.rol === "director_juridico"} p={p} />;
}
