import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { EtiquetaEstado, EtiquetaRiesgo, EtiquetaVigencia } from "@/components/ui/etiquetas";
import { clienteSesion } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth/sesion";
import { dinero, dineroCorto, fecha } from "@/lib/formato";
import { diasEntre } from "@/lib/fechas/avisos";
import { calcularVigencia, valorAnual, type SituacionVigencia, type Vigencia } from "@/lib/vigencia";
import { permisos, RIESGOS, TIPOS_CONTRATO, type EstadoContrato, type Riesgo, type TipoContrato } from "@/lib/tipos";

export const metadata = { title: "Contratos" };

type Filtros = { vista?: string; q?: string; tipo?: string; area?: string; mios?: string; riesgo?: string };

// Vistas de la cartera: los contratos firmados según su vigencia y los que siguen en revisión.
const VISTAS = {
  cartera: { texto: "Cartera vigente", situaciones: ["vigente", "renovado", "por_vencer", "por_iniciar"] },
  proceso: { texto: "En proceso", situaciones: ["en_proceso"] },
  por_vencer: { texto: "Por vencer", situaciones: ["por_vencer"] },
  concluidos: { texto: "Vencidos y terminados", situaciones: ["vencido", "terminado"] },
  todos: { texto: "Todos", situaciones: null },
} satisfies Record<string, { texto: string; situaciones: SituacionVigencia[] | null }>;
type Vista = keyof typeof VISTAS;

const PERIODO: Record<string, string> = { mensual: "al mes", anual: "al año" };

export default async function PaginaContratos({ searchParams }: { searchParams: Promise<Filtros> }) {
  const usuario = await exigirUsuario();
  // El riesgo lo determina el análisis de la IA, que solo ve Legal.
  const legal = permisos.validar(usuario.rol);
  const f = await searchParams;
  const vista: Vista = f.vista && f.vista in VISTAS ? (f.vista as Vista) : "cartera";
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const supabase = await clienteSesion();

  const [{ data: filas }, { data: perfiles }, { data: areas }] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, titulo, contraparte, tipo_contrato, estado, riesgo_max, recibido_en, firmado_en, area_responsable_id, responsable_id, solicitado_por, creado_por, monto, moneda, monto_periodo, inicio_vigencia, fin_vigencia, duracion_meses, renovacion_automatica, renovacion_meses, aviso_dias, aviso_habiles, terminado_en, areas:area_responsable_id(nombre)",
      )
      .order("recibido_en", { ascending: false }),
    supabase.from("profiles").select("id, nombre"),
    supabase.from("areas").select("id, nombre").order("nombre"),
  ]);
  const todos = (filas ?? []).map((c) => {
    const v = calcularVigencia(c, hoy);
    return { ...c, monto: c.monto == null ? null : Number(c.monto), v, anual: valorAnual({ monto: c.monto == null ? null : Number(c.monto), monto_periodo: c.monto_periodo }, v) };
  });
  type Fila = (typeof todos)[number];
  const nombre = (id: string | null) => (id ? (perfiles?.find((p) => p.id === id)?.nombre ?? "") : "");

  // Resumen de la cartera (sin filtros).
  const enCartera = (c: Fila) => (VISTAS.cartera.situaciones as SituacionVigencia[]).includes(c.v.situacion);
  const vigentes = todos.filter(enCartera);
  const valores = new Map<string, number>();
  for (const c of vigentes) if (c.anual != null) valores.set(c.moneda ?? "MXN", (valores.get(c.moneda ?? "MXN") ?? 0) + c.anual);
  const sinMonto = vigentes.filter((c) => c.anual == null).length;
  const porVencer = todos.filter((c) => c.v.situacion === "por_vencer").length;
  const sinResponsable = todos.filter((c) => (enCartera(c) || c.v.situacion === "en_proceso") && !c.responsable_id).length;
  const conteo = (k: Vista) => (VISTAS[k].situaciones ? todos.filter((c) => (VISTAS[k].situaciones as SituacionVigencia[]).includes(c.v.situacion)).length : todos.length);

  // Filtros de la vista.
  const q = (f.q ?? "").trim().toLowerCase();
  let lista = todos.filter((c) => !VISTAS[vista].situaciones || (VISTAS[vista].situaciones as SituacionVigencia[]).includes(c.v.situacion));
  if (q) lista = lista.filter((c) => `${c.titulo} ${c.contraparte}`.toLowerCase().includes(q));
  if (f.tipo && f.tipo in TIPOS_CONTRATO) lista = lista.filter((c) => c.tipo_contrato === f.tipo);
  if (f.area) lista = lista.filter((c) => c.area_responsable_id === f.area);
  if (f.mios) lista = lista.filter((c) => (legal ? c.responsable_id === usuario.id : c.solicitado_por === usuario.id || c.creado_por === usuario.id));
  if (legal && f.riesgo && f.riesgo in RIESGOS) lista = lista.filter((c) => c.riesgo_max === f.riesgo);
  const fin = (c: Fila) => c.v.fin ?? "9999-12-31";
  if (vista === "cartera" || vista === "por_vencer") lista.sort((a, b) => fin(a).localeCompare(fin(b)));
  if (vista === "concluidos") lista.sort((a, b) => fin(b).localeCompare(fin(a)));
  const enProceso = vista === "proceso";

  const campo = "h-8 rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-mandarina";
  const enlaceVista = (k: Vista) => {
    const p = new URLSearchParams(Object.entries({ ...f, vista: k }).filter(([, v]) => v) as [string, string][]);
    if (k === "cartera") p.delete("vista");
    const s = p.toString();
    return s ? `/contratos?${s}` : "/contratos";
  };
  const filtrosActivos = Boolean(f.q || f.tipo || f.area || f.mios || f.riesgo);

  return (
    <div>
      <EncabezadoPagina titulo="Contratos" descripcion="Registro de los contratos de la empresa: los que están en revisión y los vigentes, con su monto, vigencia y responsable." />
      <div className="space-y-5 px-8 py-5">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de la cartera">
          <Tarjeta titulo="Contratos vigentes" valor={String(vigentes.length)} nota={`${conteo("proceso")} más en proceso de revisión`} />
          <Tarjeta
            titulo="Valor anual estimado"
            valor={valores.size ? [...valores].map(([m, n]) => dineroCorto(n, m)).join(" · ") : "Sin datos"}
            nota={sinMonto ? `${sinMonto} ${sinMonto === 1 ? "contrato vigente" : "contratos vigentes"} sin monto en su ficha` : "De los contratos vigentes"}
          />
          <Tarjeta titulo="Por vencer" valor={String(porVencer)} nota="En 90 días o con el aviso de no renovación cerca" alerta={porVencer > 0} href={enlaceVista("por_vencer")} />
          {legal ? (
            <Tarjeta titulo="Sin abogado responsable" valor={String(sinResponsable)} nota="Entre los vigentes y en proceso" alerta={sinResponsable > 0} />
          ) : (
            <Tarjeta titulo="Vencidos y terminados" valor={String(conteo("concluidos"))} nota="Ya no están en vigor" href={enlaceVista("concluidos")} />
          )}
        </section>

        <nav className="flex flex-wrap gap-1 border-b border-linea" aria-label="Vistas">
          {(Object.keys(VISTAS) as Vista[]).map((k) => (
            <Link
              key={k}
              href={enlaceVista(k)}
              aria-current={vista === k ? "page" : undefined}
              className={`-mb-px flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13.5px] ${vista === k ? "border-mandarina font-medium" : "border-transparent text-secundario hover:text-tinta"}`}
            >
              {VISTAS[k].texto}
              <span className="rounded bg-gris-100 px-1.5 text-[11px] font-medium text-secundario">{conteo(k)}</span>
            </Link>
          ))}
        </nav>

        <form className="flex flex-wrap items-center gap-2" role="search">
          {vista !== "cartera" && <input type="hidden" name="vista" value={vista} />}
          <input name="q" defaultValue={f.q} placeholder="Buscar por contraparte o título" className={`${campo} w-72`} />
          <select name="tipo" defaultValue={f.tipo ?? ""} className={campo} aria-label="Tipo">
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_CONTRATO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="area" defaultValue={f.area ?? ""} className={campo} aria-label="Área">
            <option value="">Todas las áreas</option>
            {(areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          {legal && enProceso && (
            <select name="riesgo" defaultValue={f.riesgo ?? ""} className={campo} aria-label="Riesgo">
              <option value="">Cualquier riesgo</option>
              {Object.entries(RIESGOS).map(([k, v]) => (
                <option key={k} value={k}>
                  Riesgo {v.toLowerCase()}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-[13px] text-secundario">
            <input type="checkbox" name="mios" value="1" defaultChecked={Boolean(f.mios)} />
            {legal ? "Solo los míos" : "Solo mis solicitudes"}
          </label>
          <button className="h-8 rounded-md border border-linea-fuerte bg-white px-3 text-[13px] font-medium hover:bg-gris-50">Filtrar</button>
          {filtrosActivos && (
            <Link href={enlaceVista(vista)} className="text-[13px] text-secundario hover:text-tinta">
              Limpiar
            </Link>
          )}
        </form>

        <div className="overflow-x-auto rounded-lg border border-linea bg-white">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead className="border-b border-linea bg-lienzo text-[12px] text-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Contrato</th>
                {enProceso ? (
                  <>
                    <th className="px-4 py-2.5 font-medium">Tipo</th>
                    {legal && <th className="px-4 py-2.5 font-medium">Riesgo</th>}
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2.5 font-medium">Monto</th>
                    <th className="px-4 py-2.5 font-medium">Término</th>
                    <th className="px-4 py-2.5 font-medium">Situación</th>
                  </>
                )}
                <th className="px-4 py-2.5 font-medium">Responsable</th>
                <th className="px-4 py-2.5 font-medium">Área</th>
                {enProceso && <th className="px-4 py-2.5 font-medium">Recibido</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b border-linea last:border-0 hover:bg-lienzo">
                  <td className="px-4 py-3">
                    <Link href={`/contratos/${c.id}`} className="font-medium hover:text-mandarina-texto">
                      {c.titulo}
                    </Link>
                    <span className="block text-[12.5px] text-secundario">{c.contraparte || "Contraparte sin identificar"}</span>
                  </td>
                  {enProceso ? (
                    <>
                      <td className="whitespace-nowrap px-4 py-3 text-secundario">{c.tipo_contrato ? TIPOS_CONTRATO[c.tipo_contrato as TipoContrato] : "Por analizar"}</td>
                      {legal && <td className="px-4 py-3">{c.riesgo_max ? <EtiquetaRiesgo riesgo={c.riesgo_max as Riesgo} /> : <span className="text-secundario">-</span>}</td>}
                      <td className="px-4 py-3">
                        <EtiquetaEstado estado={c.estado as EstadoContrato} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="whitespace-nowrap px-4 py-3">
                        {c.monto == null ? (
                          <span className="text-secundario">Sin dato</span>
                        ) : (
                          <>
                            {dinero(c.monto, c.moneda)}
                            {c.monto_periodo && PERIODO[c.monto_periodo] && <span className="text-secundario"> {PERIODO[c.monto_periodo]}</span>}
                          </>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Termino v={c.v} hoy={hoy} />
                      </td>
                      <td className="px-4 py-3">{c.v.situacion === "en_proceso" ? <EtiquetaEstado estado={c.estado as EstadoContrato} /> : <EtiquetaVigencia situacion={c.v.situacion} />}</td>
                    </>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-secundario">{nombre(c.responsable_id) || "Sin asignar"}</td>
                  <td className="px-4 py-3 text-secundario">{(c.areas as unknown as { nombre: string } | null)?.nombre ?? "Sin área"}</td>
                  {enProceso && <td className="whitespace-nowrap px-4 py-3 text-secundario">{fecha(c.recibido_en)}</td>}
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-secundario">
                    {filtrosActivos ? "No hay contratos que coincidan con la búsqueda." : "No hay contratos en esta vista."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor, nota, alerta = false, href }: { titulo: string; valor: string; nota: string; alerta?: boolean; href?: string }) {
  const contenido = (
    <>
      <p className="text-[12px] font-medium text-secundario">{titulo}</p>
      <p className={`titulo mt-1 text-[26px] leading-tight ${alerta ? "text-medio" : ""}`}>{valor}</p>
      <p className="mt-1 text-[12px] text-secundario">{nota}</p>
    </>
  );
  const clase = "block rounded-xl border border-linea bg-white p-4";
  return href ? (
    <Link href={href} className={`${clase} transition-colors hover:border-mandarina/40`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

function Termino({ v, hoy }: { v: Vigencia; hoy: string }) {
  if (v.situacion === "en_proceso") return <span className="text-secundario">Al firmarse</span>;
  if (!v.fin) return <span className="text-secundario">Indefinido</span>;
  const n = diasEntre(hoy, v.fin);
  return (
    <>
      {fecha(v.fin)}
      {v.situacion !== "terminado" && (
        <span className={`block text-[12px] ${n < 0 ? "text-riesgo" : n <= 90 ? "text-medio" : "text-secundario"}`}>
          {n === 0 ? "vence hoy" : n > 0 ? `en ${n} ${n === 1 ? "día" : "días"}` : `hace ${-n} ${n === -1 ? "día" : "días"}`}
        </span>
      )}
    </>
  );
}
