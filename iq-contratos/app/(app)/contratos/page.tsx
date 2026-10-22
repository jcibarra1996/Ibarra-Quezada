import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { EtiquetaEstado, EtiquetaRiesgo } from "@/components/ui/etiquetas";
import { clienteSesion } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth/sesion";
import { fecha } from "@/lib/formato";
import { ESTADOS, RIESGOS, TIPOS_CONTRATO, type EstadoContrato, type Riesgo, type TipoContrato } from "@/lib/tipos";

export const metadata = { title: "Contratos" };

type Filtros = { q?: string; tipo?: string; estado?: string; riesgo?: string; desde?: string; hasta?: string };

export default async function PaginaContratos({ searchParams }: { searchParams: Promise<Filtros> }) {
  await exigirUsuario();
  const f = await searchParams;
  const supabase = await clienteSesion();

  let consulta = supabase
    .from("contracts")
    .select("id, titulo, contraparte, tipo_contrato, estado, riesgo_max, recibido_en, areas:area_responsable_id(nombre)")
    .order("recibido_en", { ascending: false });
  if (f.q) {
    const q = f.q.replace(/[%,()]/g, " ").trim();
    consulta = consulta.or(`contraparte.ilike.%${q}%,titulo.ilike.%${q}%`);
  }
  if (f.tipo && f.tipo in TIPOS_CONTRATO) consulta = consulta.eq("tipo_contrato", f.tipo);
  if (f.estado && f.estado in ESTADOS) consulta = consulta.eq("estado", f.estado);
  if (f.riesgo && f.riesgo in RIESGOS) consulta = consulta.eq("riesgo_max", f.riesgo);
  if (f.desde && /^\d{4}-\d{2}-\d{2}$/.test(f.desde)) consulta = consulta.gte("recibido_en", f.desde);
  if (f.hasta && /^\d{4}-\d{2}-\d{2}$/.test(f.hasta)) consulta = consulta.lte("recibido_en", `${f.hasta}T23:59:59`);
  const { data: contratos } = await consulta;

  const campo = "h-8 rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-terracota";
  return (
    <div>
      <EncabezadoPagina titulo="Contratos" descripcion="Repositorio de la dirección legal: versiones, comentarios e historial de cada contrato." />
      <div className="px-8 py-5">
        <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
          <input name="q" defaultValue={f.q} placeholder="Buscar por contraparte o título" className={`${campo} w-72`} />
          <select name="tipo" defaultValue={f.tipo ?? ""} className={campo} aria-label="Tipo">
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_CONTRATO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select name="estado" defaultValue={f.estado ?? ""} className={campo} aria-label="Estado">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select name="riesgo" defaultValue={f.riesgo ?? ""} className={campo} aria-label="Riesgo">
            <option value="">Cualquier riesgo</option>
            {Object.entries(RIESGOS).map(([k, v]) => (
              <option key={k} value={k}>Riesgo {v.toLowerCase()}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-secundario">
            Recibido del
            <input type="date" name="desde" defaultValue={f.desde} className={campo} />
            al
            <input type="date" name="hasta" defaultValue={f.hasta} className={campo} />
          </label>
          <button className="h-8 rounded-md border border-linea-fuerte bg-white px-3 text-[13px] font-medium hover:bg-gris-50">Filtrar</button>
          {Object.values(f).some(Boolean) && (
            <Link href="/contratos" className="text-[13px] text-secundario hover:text-tinta">Limpiar</Link>
          )}
        </form>

        <div className="overflow-hidden rounded-lg border border-linea bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b border-linea bg-lienzo text-[12px] text-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Contrato</th>
                <th className="px-4 py-2.5 font-medium">Contraparte</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Riesgo</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Área</th>
                <th className="px-4 py-2.5 font-medium">Recibido</th>
              </tr>
            </thead>
            <tbody>
              {(contratos ?? []).map((c) => (
                <tr key={c.id} className="border-b border-linea last:border-0 hover:bg-lienzo">
                  <td className="px-4 py-3">
                    <Link href={`/contratos/${c.id}`} className="font-medium hover:text-terracota">{c.titulo}</Link>
                  </td>
                  <td className="px-4 py-3 text-secundario">{c.contraparte || "Sin identificar"}</td>
                  <td className="px-4 py-3 text-secundario">{c.tipo_contrato ? TIPOS_CONTRATO[c.tipo_contrato as TipoContrato] : "Por analizar"}</td>
                  <td className="px-4 py-3">{c.riesgo_max ? <EtiquetaRiesgo riesgo={c.riesgo_max as Riesgo} /> : <span className="text-secundario">-</span>}</td>
                  <td className="px-4 py-3"><EtiquetaEstado estado={c.estado as EstadoContrato} /></td>
                  <td className="px-4 py-3 text-secundario">{(c.areas as unknown as { nombre: string } | null)?.nombre ?? "Sin asignar"}</td>
                  <td className="px-4 py-3 text-secundario">{fecha(c.recibido_en)}</td>
                </tr>
              ))}
              {(contratos ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-secundario">
                    No hay contratos que coincidan con la búsqueda.
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
