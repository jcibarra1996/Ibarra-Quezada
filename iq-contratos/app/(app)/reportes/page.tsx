import Link from "next/link";
import { redirect } from "next/navigation";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { Barras } from "@/components/reportes/barras";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { avanceValidacion, conteoPorEstado, hallazgosPorRiesgo, hallazgosPorTema, tiempoPromedioRevision, type ContratoReporte, type HallazgoReporte } from "@/lib/reportes/calcular";
import { diasEntre } from "@/lib/fechas/avisos";
import { hallazgosVigentes } from "@/lib/reportes/consultas";
import { fecha } from "@/lib/formato";
import { permisos } from "@/lib/tipos";

export const metadata = { title: "Reportes" };

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-lg border border-linea bg-white px-5 py-4">
      <p className="text-[12.5px] text-secundario">{titulo}</p>
      <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{valor}</p>
      {nota && <p className="mt-2 text-[12px] text-secundario">{nota}</p>}
    </div>
  );
}

export default async function Reportes() {
  const usuario = await exigirUsuario();
  if (!permisos.verReportes(usuario.rol)) redirect("/inicio");
  const supabase = await clienteSesion();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const limite = new Date(Date.parse(`${hoy}T12:00:00Z`) + 90 * 864e5).toISOString().slice(0, 10);

  const [{ data: contratos }, hallazgos, { data: alertas }] = await Promise.all([
    supabase.from("contracts").select("id, estado, recibido_en, aprobado_en"),
    hallazgosVigentes(supabase),
    supabase
      .from("alerts")
      .select("id, titulo, fecha_limite, contract_id, contracts(titulo, contraparte), areas(nombre)")
      .eq("estado", "activa")
      .gte("fecha_limite", hoy)
      .lte("fecha_limite", limite)
      .order("fecha_limite")
      .limit(10),
  ]);

  const cs = (contratos ?? []) as ContratoReporte[];
  const hs = hallazgos as HallazgoReporte[];
  const estados = conteoPorEstado(cs);
  const tiempo = tiempoPromedioRevision(cs);
  const riesgos = hallazgosPorRiesgo(hs);
  const temas = hallazgosPorTema(hs);
  const avance = avanceValidacion(hs);

  return (
    <div>
      <EncabezadoPagina titulo="Reportes" descripcion={`Tablero para la dirección general. Calculado con los datos registrados en Qlaro al ${fecha(hoy)}.`} />
      <div className="space-y-6 px-8 py-6">
        <section className="grid grid-cols-4 gap-4">
          <Indicador titulo="Contratos en revisión" valor={String(estados.recibido + estados.en_revision)} nota={`${estados.recibido} recibidos sin revisar`} />
          <Indicador titulo="En negociación" valor={String(estados.en_negociacion)} nota="Con contrapropuesta o en espera de respuesta" />
          <Indicador
            titulo="Tiempo promedio de revisión"
            valor={tiempo ? `${tiempo.dias} días` : "Sin datos"}
            nota={tiempo ? `De la recepción a la aprobación. Base: ${tiempo.muestra} contrato${tiempo.muestra === 1 ? "" : "s"} aprobado${tiempo.muestra === 1 ? "" : "s"}.` : "Aún no hay contratos aprobados."}
          />
          <Indicador titulo="Aprobados y firmados" valor={String(estados.aprobado + estados.firmado)} nota={`${estados.aprobado} pendientes de firma`} />
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-linea bg-white p-5">
            <h2 className="mb-1 text-[14px] font-semibold">Hallazgos por nivel de riesgo</h2>
            <p className="mb-4 text-[12px] text-secundario">
              Análisis vigente de cada contrato. Validados por Legal: {avance.validados} de {avance.total}.
            </p>
            <Barras
              vacio="Aún no hay contratos analizados."
              filas={[
                { etiqueta: "Riesgo alto", valor: riesgos.alto, color: "bg-riesgo" },
                { etiqueta: "Riesgo medio", valor: riesgos.medio, color: "bg-medio" },
                { etiqueta: "Riesgo bajo", valor: riesgos.bajo, color: "bg-bajo" },
              ]}
            />
          </div>
          <div className="rounded-lg border border-linea bg-white p-5">
            <h2 className="mb-1 text-[14px] font-semibold">Hallazgos por tema</h2>
            <p className="mb-4 text-[12px] text-secundario">Temas más frecuentes; debajo del total, cuántos son de riesgo alto.</p>
            <Barras vacio="Aún no hay hallazgos." filas={temas.map((t) => ({ etiqueta: t.tema, valor: t.total, detalle: t.altos ? `${t.altos} alto${t.altos === 1 ? "" : "s"}` : undefined }))} />
          </div>
        </section>

        <section className="rounded-lg border border-linea bg-white">
          <h2 className="border-b border-linea px-5 py-3 text-[14px] font-semibold">Próximos vencimientos (90 días)</h2>
          {(alertas ?? []).length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-secundario">No hay vencimientos activos en los próximos 90 días.</p>
          ) : (
            <table className="w-full text-left text-[13.5px]">
              <tbody>
                {(alertas ?? []).map((a) => {
                  const c = a.contracts as unknown as { titulo: string; contraparte: string } | null;
                  return (
                    <tr key={a.id} className="border-b border-linea last:border-0">
                      <td className="px-5 py-3 tabular-nums">{fecha(a.fecha_limite)}</td>
                      <td className="px-5 py-3 text-secundario">En {diasEntre(hoy, a.fecha_limite)} días</td>
                      <td className="px-5 py-3 font-medium">{a.titulo}</td>
                      <td className="px-5 py-3">
                        <Link href={`/contratos/${a.contract_id}`} className="hover:text-mandarina-texto">{c?.titulo}</Link>
                        <span className="text-secundario"> · {c?.contraparte}</span>
                      </td>
                      <td className="px-5 py-3 text-secundario">{(a.areas as unknown as { nombre: string } | null)?.nombre ?? "Sin área"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
