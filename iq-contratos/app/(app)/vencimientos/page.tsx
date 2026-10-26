import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { AreaAlerta, EstadoAlerta } from "@/components/vencimientos/acciones-alerta";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { diasEntre, proximoAviso, semanasDelMes, urgencia, type Urgencia } from "@/lib/fechas/avisos";
import { fecha } from "@/lib/formato";
import { permisos } from "@/lib/tipos";
import { env } from "@/lib/env";

export const metadata = { title: "Vencimientos" };

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const COLOR: Record<Urgencia, string> = {
  vencida: "bg-gris-100 text-secundario",
  critica: "bg-riesgo text-white",
  proxima: "bg-mandarina-suave text-mandarina-texto",
  lejana: "bg-mandarina-suave text-tinta",
};

function mesVecino(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

type Busqueda = { vista?: string; mes?: string; area?: string; estado?: string };

export default async function Vencimientos({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const usuario = await exigirUsuario();
  const q = await searchParams;
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const vista = q.vista === "calendario" ? "calendario" : "lista";
  const mes = q.mes && /^\d{4}-\d{2}$/.test(q.mes) ? q.mes : hoy.slice(0, 7);
  const estado = q.estado === "atendida" ? "atendida" : q.estado === "todas" ? null : "activa";

  const supabase = await clienteSesion();
  let consulta = supabase
    .from("alerts")
    .select("id, titulo, fecha_limite, avisos_dias, estado, area_id, correo_activo, contract_id, contracts(titulo, contraparte), key_dates(descripcion, regla)")
    .order("fecha_limite");
  if (estado) consulta = consulta.eq("estado", estado);
  if (q.area) consulta = consulta.eq("area_id", q.area);
  const [{ data: alertas }, { data: areas }] = await Promise.all([consulta, supabase.from("areas").select("id, nombre").order("nombre")]);
  const lista = alertas ?? [];
  const editable = permisos.validar(usuario.rol);
  const enlace = (cambios: Partial<Busqueda>) => {
    const p = new URLSearchParams({ vista, mes, ...(q.area ? { area: q.area } : {}), ...(q.estado ? { estado: q.estado } : {}), ...cambios } as Record<string, string>);
    return `/vencimientos?${p.toString()}`;
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Vencimientos"
        descripcion="Renovaciones, plazos de aviso y vencimientos de todos los contratos, con el área responsable de cada uno."
        acciones={
          <div className="flex rounded-md border border-linea-fuerte bg-white p-0.5 text-[13px]">
            <Link href={enlace({ vista: "lista" })} className={`rounded px-3 py-1 ${vista === "lista" ? "bg-tinta text-white" : "text-secundario"}`}>
              Lista
            </Link>
            <Link href={enlace({ vista: "calendario" })} className={`rounded px-3 py-1 ${vista === "calendario" ? "bg-tinta text-white" : "text-secundario"}`}>
              Calendario
            </Link>
          </div>
        }
      />
      <div className="px-8 py-5">
        <form className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="mes" value={mes} />
          <select name="area" defaultValue={q.area ?? ""} className="h-8 rounded-md border border-linea-fuerte bg-white px-2" aria-label="Área">
            <option value="">Todas las áreas</option>
            {(areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
          <select name="estado" defaultValue={q.estado ?? "activa"} className="h-8 rounded-md border border-linea-fuerte bg-white px-2" aria-label="Estado">
            <option value="activa">Activas</option>
            <option value="atendida">Atendidas</option>
            <option value="todas">Todas</option>
          </select>
          <button className="h-8 rounded-md border border-linea-fuerte bg-white px-3 font-medium hover:bg-gris-50">Filtrar</button>
          <span className="ml-auto rounded-md border border-linea bg-white px-2.5 py-1 text-[12px] text-secundario">
            {env.correoAlertasActivo() ? "Avisos por correo activos" : "Avisos por correo preparados, desactivados en la demo: las alertas se muestran aquí"}
          </span>
        </form>

        {vista === "lista" ? (
          <div className="overflow-hidden rounded-lg border border-linea bg-white">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-linea bg-lienzo text-[12px] text-secundario">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Fecha límite</th>
                  <th className="px-4 py-2.5 font-medium">Alerta</th>
                  <th className="px-4 py-2.5 font-medium">Contrato</th>
                  <th className="px-4 py-2.5 font-medium">Área responsable</th>
                  <th className="px-4 py-2.5 font-medium">Próximo aviso</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {lista.map((a) => {
                  const dias = diasEntre(hoy, a.fecha_limite);
                  const prox = proximoAviso(a.fecha_limite, a.avisos_dias, hoy);
                  const c = a.contracts as unknown as { titulo: string; contraparte: string } | null;
                  const k = a.key_dates as unknown as { descripcion: string } | null;
                  return (
                    <tr key={a.id} className="border-b border-linea align-top last:border-0">
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[12px] font-semibold ${COLOR[urgencia(a.fecha_limite, hoy)]}`}>{fecha(a.fecha_limite)}</span>
                        <p className="mt-1 text-[12px] text-secundario">{dias < 0 ? `Venció hace ${-dias} días` : dias === 0 ? "Hoy" : `En ${dias} día${dias === 1 ? "" : "s"}`}</p>
                      </td>
                      <td className="max-w-[360px] px-4 py-3">
                        <p className="font-medium">{a.titulo}</p>
                        <p className="text-[12.5px] leading-snug text-secundario">{k?.descripcion}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/contratos/${a.contract_id}`} className="font-medium hover:text-mandarina-texto">{c?.titulo}</Link>
                        <p className="text-[12.5px] text-secundario">{c?.contraparte}</p>
                      </td>
                      <td className="px-4 py-3"><AreaAlerta alertaId={a.id} areaId={a.area_id} areas={areas ?? []} editable={editable} /></td>
                      <td className="px-4 py-3 text-[12.5px] text-secundario">
                        {prox ? `${fecha(prox.fecha)} (${prox.dias} día${prox.dias === 1 ? "" : "s"} antes)` : "Sin avisos pendientes"}
                        <p>Avisos: {[...a.avisos_dias].sort((x, y) => y - x).join(", ")} días antes</p>
                      </td>
                      <td className="px-4 py-3 text-right"><EstadoAlerta alertaId={a.id} estado={a.estado} editable={editable} /></td>
                    </tr>
                  );
                })}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-secundario">
                      No hay alertas con estos filtros. Las alertas se generan al analizar cada contrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <section className="overflow-hidden rounded-lg border border-linea bg-white">
            <div className="flex items-center justify-between border-b border-linea px-4 py-3">
              <Link href={enlace({ mes: mesVecino(mes, -1) })} className="text-[13px] text-secundario hover:text-tinta">Mes anterior</Link>
              <h2 className="titulo text-[18px]">{MESES[Number(mes.slice(5)) - 1]} {mes.slice(0, 4)}</h2>
              <Link href={enlace({ mes: mesVecino(mes, 1) })} className="text-[13px] text-secundario hover:text-tinta">Mes siguiente</Link>
            </div>
            <div className="grid grid-cols-7 border-b border-linea bg-lienzo text-center text-[11.5px] font-medium text-secundario">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            {semanasDelMes(mes).map((semana, i) => (
              <div key={i} className="grid grid-cols-7 border-b border-linea last:border-0">
                {semana.map((dia, j) => {
                  const delDia = dia ? lista.filter((a) => a.fecha_limite === dia) : [];
                  return (
                    <div key={j} className={`min-h-[104px] border-r border-linea p-1.5 last:border-0 ${dia === hoy ? "bg-mandarina-suave" : ""}`}>
                      {dia && <p className={`mb-1 text-right text-[12px] ${dia === hoy ? "font-semibold text-mandarina-texto" : "text-secundario"}`}>{Number(dia.slice(8))}</p>}
                      {delDia.map((a) => (
                        <Link
                          key={a.id}
                          href={`/contratos/${a.contract_id}`}
                          className={`mb-1 block truncate rounded px-1.5 py-0.5 text-[11.5px] font-medium ${COLOR[urgencia(a.fecha_limite, hoy)]}`}
                          title={`${a.titulo}: ${(a.contracts as unknown as { titulo: string } | null)?.titulo ?? ""}`}
                        >
                          {a.titulo} · {(a.contracts as unknown as { contraparte: string } | null)?.contraparte}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
