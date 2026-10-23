import Link from "next/link";
import { EtiquetaEstado } from "@/components/ui/etiquetas";
import { describir, type Evento } from "@/components/revision/historial";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fecha, fechaCorta, fechaLargaHoy, haceCuanto } from "@/lib/formato";
import { diasEntre, duracion, lineaTiempo, PROCESO, type EstadoPaso, type LineaTiempo } from "@/lib/linea-tiempo";
import { hallazgosVigentes } from "@/lib/reportes/consultas";
import { ESTADOS, ORDEN_ESTADOS, permisos, type EstadoContrato } from "@/lib/tipos";

export const metadata = { title: "Inicio" };

const saludo = () => {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Mexico_City" }));
  return h < 12 ? "Buen día" : h < 19 ? "Buenas tardes" : "Buenas noches";
};

const MENSAJE: Record<EstadoContrato, string> = {
  recibido: "Legal recibió su solicitud",
  en_revision: "Legal está revisando el contrato",
  en_negociacion: "Legal negocia cambios con la contraparte",
  aprobado: "Aprobado; sigue la firma",
  firmado: "Firmado y en seguimiento",
};

// Línea de tiempo de una solicitud: nombre de cada etapa, fecha en que entró y tiempo en la actual.
function LineaSolicitud({ linea }: { linea: LineaTiempo }) {
  const barra: Record<EstadoPaso, string> = { hecho: "bg-bajo", actual: "bg-terracota", omitido: "bg-bajo/35", pendiente: "bg-gris-100" };
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

function ProcesoCompleto() {
  return (
    <section className="mt-8" aria-labelledby="titulo-proceso">
      <h2 id="titulo-proceso" className="titulo text-[18px]">
        Así avanza su solicitud
      </h2>
      <p className="mt-1 text-[13px] text-secundario">El proceso completo, de la solicitud a la firma. En cada solicitud verá la fecha en que entró a cada etapa y cuánto lleva en la actual.</p>
      <ol className="mt-3 grid grid-cols-5 gap-3">
        {ORDEN_ESTADOS.map((e, i) => (
          <li key={e} className="rounded-lg border border-linea bg-white p-3.5">
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crema font-serif text-[12px] font-semibold text-terracota-oscuro">{i + 1}</span>
              <span className="text-[13px] font-semibold leading-tight">{PROCESO[e].titulo}</span>
            </span>
            <span className="mt-2 block text-[12px] leading-relaxed text-secundario">{PROCESO[e].que}</span>
            <span className="mt-2 block text-[11px] font-medium uppercase tracking-wide text-secundario">{PROCESO[e].quien}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const ICONOS = {
  revisar: "M6 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 6 17zM12 2.5V7h4",
  alerta: "M10 3.5 17.5 16.5h-15zM10 8.5v3.5M10 14.5v.01",
  expediente: "M3 6.5h5l1.5 1.5H17v8.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5z",
  firma: "M3 15c2-1 3-5 5-5s0 5 2 5 2-3 3.5-3 1 2 2.5 2M3 17.5h14",
  calendario: "M4 5h12v12H4zM4 8.5h12M7.5 3v3M12.5 3v3",
};

function Tarea({ n, texto, href, accion, icono, urgente }: { n: number; texto: string; href: string; accion: string; icono: keyof typeof ICONOS; urgente?: boolean }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-lienzo">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${urgente ? "bg-burgundy-suave text-burgundy" : "bg-crema text-terracota-oscuro"}`}>
          <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={ICONOS[icono]} />
          </svg>
        </span>
        <span className="flex-1 text-[14px]">
          <span className="font-semibold tabular-nums">{n}</span> {texto}
        </span>
        <span className="text-[13px] font-medium text-terracota group-hover:underline">{accion}</span>
      </Link>
    </li>
  );
}

export default async function Inicio() {
  const usuario = await exigirUsuario();
  const legal = permisos.validar(usuario.rol);
  const supabase = await clienteSesion();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const en30 = new Date(Date.parse(`${hoy}T12:00:00Z`) + 30 * 864e5).toISOString().slice(0, 10);
  const nombre = usuario.nombre.split(" ")[0];

  if (!legal) {
    const { data: mias } = await supabase
      .from("contracts")
      .select("id, titulo, contraparte, estado, recibido_en, aprobado_en, firmado_en")
      .or(`solicitado_por.eq.${usuario.id},creado_por.eq.${usuario.id}`)
      .order("recibido_en", { ascending: false })
      .limit(12);
    const ids = (mias ?? []).map((c) => c.id);
    const { data: cambios } = ids.length
      ? await supabase.from("audit_events").select("contract_id, detalle, creado_en").eq("accion", "estado_cambiado").in("contract_id", ids)
      : { data: [] };
    const lineas = new Map(
      (mias ?? []).map((c) => [
        c.id,
        lineaTiempo({
          estado: c.estado as EstadoContrato,
          recibido_en: c.recibido_en,
          aprobado_en: c.aprobado_en,
          firmado_en: c.firmado_en,
          cambios: (cambios ?? []).filter((e) => e.contract_id === c.id).map((e) => ({ a: String((e.detalle as { a?: string })?.a ?? ""), creado_en: e.creado_en })),
        }),
      ]),
    );
    const enCurso = (mias ?? []).filter((c) => c.estado !== "firmado").length;
    return (
      <div className="mx-auto max-w-[1100px] px-8 py-8">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-terracota-oscuro">{fechaLargaHoy()}</p>
        <h1 className="titulo mt-1 text-[32px] leading-tight">
          {saludo()}, {nombre}
        </h1>
        <p className="mt-1 text-[14px] text-secundario">
          {enCurso === 0 ? "No tiene solicitudes en curso." : `Tiene ${enCurso} ${enCurso === 1 ? "solicitud en curso" : "solicitudes en curso"} con Legal.`}
        </p>

        <section className="mt-7 flex items-center justify-between gap-6 rounded-xl bg-tinta p-7 text-sobre-tinta">
          <div>
            <h2 className="titulo text-[22px] text-white">¿Necesita un contrato?</h2>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-sobre-tinta-tenue">
              Use una plantilla de la empresa o suba el contrato que le envió la contraparte. Legal lo revisa y aquí verá en qué va.
            </p>
          </div>
          <Link href="/solicitar" className="inline-flex h-10 shrink-0 items-center rounded-md bg-terracota px-5 text-[14px] font-medium text-white hover:bg-terracota-oscuro">
            Solicitar nuevo contrato
          </Link>
        </section>

        <ProcesoCompleto />

        <h2 className="mb-3 mt-8 titulo text-[18px]">Mis solicitudes</h2>
        {(mias ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-linea-fuerte bg-white px-5 py-10 text-center text-[13.5px] text-secundario">
            Aún no tiene solicitudes. Cuando pida un contrato, aquí verá cada paso.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {mias!.map((c) => (
              <li key={c.id}>
                <Link href={`/contratos/${c.id}`} className="block rounded-lg border border-linea bg-white p-4 shadow-[var(--shadow-tarjeta)] transition-colors hover:border-terracota/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{c.titulo}</p>
                      <p className="truncate text-[12.5px] text-secundario">{c.contraparte || "Contraparte por identificar"}</p>
                    </div>
                    <EtiquetaEstado estado={c.estado as EstadoContrato} />
                  </div>
                  <div className="mt-4">
                    <LineaSolicitud linea={lineas.get(c.id)!} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-linea pt-3 text-[12.5px]">
                    <span>{MENSAJE[c.estado as EstadoContrato]}</span>
                    <span className="shrink-0 text-[12px] text-secundario">
                      {c.estado === "firmado"
                        ? `Firmado en ${duracion(lineas.get(c.id)!.diasTotales)}`
                        : `${duracion(diasEntre(lineas.get(c.id)!.enEtapaDesde))} en esta etapa · ${duracion(lineas.get(c.id)!.diasTotales)} en total`}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const [hallazgos, { count: vencimientos }, { data: estados }, { count: expedientes }, { data: recientes }, { data: actividad }, { data: perfiles }] = await Promise.all([
    hallazgosVigentes(supabase),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("estado", "activa").gte("fecha_limite", hoy).lte("fecha_limite", en30),
    supabase.from("contracts").select("estado"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("estado", "por_validar"),
    supabase.from("contracts").select("id, titulo, contraparte, estado, recibido_en").order("recibido_en", { ascending: false }).limit(6),
    supabase.from("audit_events").select("id, accion, detalle, actor_id, creado_en, contract_id, contracts(titulo)").not("contract_id", "is", null).order("creado_en", { ascending: false }).limit(8),
    supabase.from("profiles").select("id, nombre"),
  ]);
  const porEstado = (e: EstadoContrato) => (estados ?? []).filter((c) => c.estado === e).length;
  const altos = hallazgos.filter((h) => h.estado === "pendiente" && h.riesgo === "alto").length;
  const porRevisar = porEstado("recibido") + porEstado("en_revision");
  const tareas = [
    { n: porRevisar, texto: porRevisar === 1 ? "contrato espera revisión de Legal" : "contratos esperan revisión de Legal", href: "/contratos?estado=en_revision", accion: "Revisar", icono: "revisar" as const },
    { n: altos, texto: altos === 1 ? "hallazgo de riesgo alto sin validar" : "hallazgos de riesgo alto sin validar", href: "/contratos?riesgo=alto", accion: "Validar", icono: "alerta" as const, urgente: true },
    { n: expedientes ?? 0, texto: expedientes === 1 ? "expediente corporativo por validar" : "expedientes corporativos por validar", href: "/expedientes", accion: "Validar", icono: "expediente" as const },
    { n: porEstado("aprobado"), texto: porEstado("aprobado") === 1 ? "contrato aprobado listo para firma" : "contratos aprobados listos para firma", href: "/firmas", accion: "Firmar", icono: "firma" as const },
    { n: vencimientos ?? 0, texto: vencimientos === 1 ? "plazo vence en los próximos 30 días" : "plazos vencen en los próximos 30 días", href: "/vencimientos", accion: "Ver", icono: "calendario" as const, urgente: true },
  ].filter((t) => t.n > 0);
  const nombreDe = (id: string | null) => (id ? (perfiles?.find((p) => p.id === id)?.nombre ?? "Usuario") : "Sistema");

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-terracota-oscuro">{fechaLargaHoy()}</p>
      <h1 className="titulo mt-1 text-[32px] leading-tight">
        {saludo()}, {nombre}
      </h1>
      <p className="mt-1 text-[14px] text-secundario">La IA hace la primera lectura. Su equipo decide.</p>

      <section className="mt-6 overflow-hidden rounded-xl border border-linea bg-white">
        <h2 className="border-b border-linea px-5 py-3 titulo text-[18px]">Para hoy</h2>
        {tareas.length ? (
          <ul className="divide-y divide-linea">
            {tareas.map((t) => (
              <Tarea key={t.href + t.texto} {...t} />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-[13.5px] text-secundario">Todo al día. No hay pendientes de Legal.</p>
        )}
      </section>

      <section className="mt-6" aria-label="Ciclo de vida de los contratos">
        <h2 className="mb-3 titulo text-[18px]">Ciclo de vida</h2>
        <ol className="flex items-stretch gap-2">
          {ORDEN_ESTADOS.map((e, i) => (
            <li key={e} className="flex flex-1 items-center gap-2">
              <Link href={`/contratos?estado=${e}`} className="flex-1 rounded-lg border border-linea bg-white px-4 py-3.5 shadow-[var(--shadow-tarjeta)] transition-colors hover:border-terracota/40">
                <p className="font-serif text-[28px] font-semibold leading-none tabular-nums">{porEstado(e)}</p>
                <p className="mt-1.5 text-[12.5px] text-secundario">{ESTADOS[e]}</p>
              </Link>
              {i < ORDEN_ESTADOS.length - 1 && (
                <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-linea-fuerte" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                  <path d="M4 2l4 4-4 4" />
                </svg>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_380px] gap-6">
        <section>
          <h2 className="mb-3 titulo text-[18px]">Contratos recientes</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea bg-white">
            {(recientes ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/contratos/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-lienzo">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{c.titulo}</span>
                    <span className="block truncate text-[12.5px] text-secundario">
                      {c.contraparte || "Contraparte sin identificar"} · {fecha(c.recibido_en)}
                    </span>
                  </span>
                  <EtiquetaEstado estado={c.estado as EstadoContrato} />
                </Link>
              </li>
            ))}
            {(recientes ?? []).length === 0 && <li className="px-5 py-10 text-center text-[13.5px] text-secundario">Aún no hay contratos.</li>}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 titulo text-[18px]">Actividad reciente</h2>
          <ol className="space-y-3 rounded-xl border border-linea bg-white p-5">
            {(actividad ?? []).map((e) => {
              const texto = describir(e as unknown as Evento);
              return (
                <li key={e.id} className="text-[13px] leading-snug">
                  <Link href={`/contratos/${e.contract_id}?pestana=historial`} className="hover:text-terracota">
                    <span className="font-medium">{nombreDe(e.actor_id)}</span> <span className="text-secundario">{texto.charAt(0).toLowerCase() + texto.slice(1)}</span>
                  </Link>
                  <span className="block text-[11.5px] text-secundario">
                    {(e.contracts as unknown as { titulo: string } | null)?.titulo} · {haceCuanto(e.creado_en)}
                  </span>
                </li>
              );
            })}
            {(actividad ?? []).length === 0 && <li className="text-[13px] text-secundario">Sin movimientos todavía.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}
