import Link from "next/link";
import { EtiquetaRiesgo } from "@/components/ui/etiquetas";
import { fechaHora } from "@/lib/formato";
import { ESTADOS_HALLAZGO } from "@/lib/tipos";
import type { Hallazgo } from "@/lib/revision/cargar";

export function ListaHallazgos({ contratoId, hallazgos, perfiles }: { contratoId: string; hallazgos: Hallazgo[]; perfiles: Record<string, { nombre: string }> }) {
  if (hallazgos.length === 0) return <p className="text-[13.5px] text-secundario">No hay hallazgos para la versión vigente.</p>;
  return (
    <div className="overflow-hidden rounded-lg border border-linea bg-white">
      <table className="w-full text-left text-[13.5px]">
        <thead className="border-b border-linea bg-lienzo text-[12px] text-secundario">
          <tr>
            <th className="px-4 py-2.5 font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Cláusula</th>
            <th className="px-4 py-2.5 font-medium">Tema</th>
            <th className="px-4 py-2.5 font-medium">Riesgo</th>
            <th className="px-4 py-2.5 font-medium">Estado</th>
            <th className="px-4 py-2.5 font-medium">Validó</th>
          </tr>
        </thead>
        <tbody>
          {hallazgos.map((h) => (
            <tr key={h.id} className="border-b border-linea last:border-0 hover:bg-lienzo">
              <td className="px-4 py-3 text-secundario">{h.numero}</td>
              <td className="px-4 py-3">{h.tipo === "omision" ? "Cláusula nueva" : h.clausula}</td>
              <td className="px-4 py-3">
                <Link href={`/contratos/${contratoId}?h=${h.id}`} className="font-medium hover:text-mandarina-texto">
                  {h.tema}
                </Link>
              </td>
              <td className="px-4 py-3"><EtiquetaRiesgo riesgo={h.riesgo} /></td>
              <td className="px-4 py-3">{ESTADOS_HALLAZGO[h.estado]}</td>
              <td className="px-4 py-3 text-secundario">
                {h.decidido_por ? `${perfiles[h.decidido_por]?.nombre ?? ""} · ${fechaHora(h.decidido_en)}` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
