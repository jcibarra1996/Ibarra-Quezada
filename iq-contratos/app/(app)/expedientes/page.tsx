import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { EtiquetaValidacion } from "@/components/expedientes/etiqueta-validacion";
import { NuevoExpediente } from "@/components/expedientes/nuevo-expediente";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { camposFaltantes, DOCUMENTOS_REQUERIDOS, type DatosExpediente, type TipoPersona } from "@/lib/corporativo/campos";
import { fecha } from "@/lib/formato";

export const metadata = { title: "Expedientes corporativos" };

export default async function PaginaExpedientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirUsuario();
  const { q } = await searchParams;
  const supabase = await clienteSesion();
  let consulta = supabase
    .from("companies")
    .select("id, denominacion, rfc, tipo_persona, es_propia, estado, datos, actualizado_en, corporate_documents(tipo)")
    .order("es_propia", { ascending: false })
    .order("denominacion");
  if (q) consulta = consulta.ilike("denominacion", `%${q.replace(/[%,()]/g, " ").trim()}%`);
  const { data: expedientes } = await consulta;

  return (
    <div>
      <EncabezadoPagina
        titulo="Expedientes corporativos"
        descripcion="Documentos y datos de cada parte: acta constitutiva, poderes, constancia de situación fiscal. La IA extrae los datos, Legal los valida y se usan para revisar declaraciones y llenar plantillas."
        acciones={<NuevoExpediente />}
      />
      <div className="px-8 py-5">
        <form className="mb-4" role="search">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por denominación"
            className="h-8 w-72 rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-mandarina"
          />
        </form>
        <div className="overflow-hidden rounded-lg border border-linea bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-linea bg-lienzo text-[12px] text-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Parte</th>
                <th className="px-4 py-2.5 font-medium">RFC</th>
                <th className="px-4 py-2.5 font-medium">Documentos</th>
                <th className="px-4 py-2.5 font-medium">Datos por completar</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {(expedientes ?? []).map((e) => {
                const tipo = e.tipo_persona as TipoPersona;
                const tiene = new Set((e.corporate_documents ?? []).map((d) => d.tipo));
                const requeridos = DOCUMENTOS_REQUERIDOS[tipo];
                const faltan = camposFaltantes({ tipo_persona: tipo, datos: e.datos as DatosExpediente, rfc: e.rfc }).length + (e.rfc ? 0 : 1);
                return (
                  <tr key={e.id} className="hover:bg-lienzo">
                    <td className="px-4 py-3">
                      <Link href={`/expedientes/${e.id}`} className="font-medium hover:text-mandarina-texto">
                        {e.denominacion}
                      </Link>
                      <span className="block text-[12px] text-secundario">
                        {tipo === "moral" ? "Persona moral" : "Persona física"}
                        {e.es_propia ? " · Empresa propia" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px]">{e.rfc ?? <span className="text-secundario">Sin RFC</span>}</td>
                    <td className="px-4 py-3">
                      {requeridos.filter((r) => tiene.has(r)).length} de {requeridos.length}
                    </td>
                    <td className="px-4 py-3">{faltan === 0 ? <span className="text-bajo">Completo</span> : faltan}</td>
                    <td className="px-4 py-3">
                      <EtiquetaValidacion estado={e.estado} />
                    </td>
                    <td className="px-4 py-3 text-secundario">{fecha(e.actualizado_en)}</td>
                  </tr>
                );
              })}
              {(expedientes ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-secundario">
                    Aún no hay expedientes. Cree uno y cargue los documentos corporativos de la parte.
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
