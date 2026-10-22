import { fechaHora } from "@/lib/formato";

type Version = { id: string; numero: number; origen: string; nombre_archivo: string; mime: string; tamano_bytes: number; paginas: number; creado_por: string | null; creado_en: string };

export function ListaVersiones({ versiones, actual, perfiles }: { versiones: Version[]; actual: string | null; perfiles: Record<string, { nombre: string }> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-linea bg-white">
      <table className="w-full text-left text-[13.5px]">
        <thead className="border-b border-linea bg-lienzo text-[12px] text-secundario">
          <tr>
            <th className="px-4 py-2.5 font-medium">Versión</th>
            <th className="px-4 py-2.5 font-medium">Archivo</th>
            <th className="px-4 py-2.5 font-medium">Origen</th>
            <th className="px-4 py-2.5 font-medium">Cargada por</th>
            <th className="px-4 py-2.5 font-medium">Fecha</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {versiones.map((v) => (
            <tr key={v.id} className="border-b border-linea last:border-0">
              <td className="px-4 py-3 font-medium">
                v{v.numero} {v.id === actual && <span className="ml-1 rounded bg-crema px-1.5 py-px text-[11px] text-terracota-oscuro">vigente</span>}
              </td>
              <td className="px-4 py-3">{v.nombre_archivo}</td>
              <td className="px-4 py-3 text-secundario">{v.origen === "contrapropuesta" ? "Contrapropuesta" : "Documento recibido"}</td>
              <td className="px-4 py-3 text-secundario">{v.creado_por ? perfiles[v.creado_por]?.nombre : "Sistema"}</td>
              <td className="px-4 py-3 text-secundario">{fechaHora(v.creado_en)}</td>
              <td className="px-4 py-3 text-right">
                <a href={`/api/documentos/${v.id}`} className="text-[13px] font-medium text-terracota hover:underline">
                  Descargar original
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-linea bg-lienzo px-4 py-2 text-[12px] text-secundario">
        Cada descarga genera un enlace firmado que caduca en 5 minutos y queda registrada en la bitácora.
      </p>
    </div>
  );
}
