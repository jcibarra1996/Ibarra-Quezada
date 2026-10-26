import { fechaHora } from "@/lib/formato";
import { DescargarContrapropuesta } from "./descargar-contrapropuesta";

type Version = {
  id: string;
  numero: number;
  origen: string;
  nombre_archivo: string;
  mime: string;
  tamano_bytes: number;
  paginas: number;
  creado_por: string | null;
  creado_en: string;
};

type Contrapropuesta = {
  id: string;
  generado_por: string | null;
  creado_en: string;
  hallazgos_incluidos: string[];
  descargada_en: string | null;
  descargada_por: string | null;
};

export function ListaVersiones({
  versiones,
  actual,
  perfiles,
  contrapropuestas,
  estado,
}: {
  versiones: Version[];
  actual: string | null;
  perfiles: Record<string, { nombre: string }>;
  contrapropuestas: Contrapropuesta[];
  estado: string;
}) {
  // La negociación vigente corresponde a la contrapropuesta descargada más reciente.
  const vigente = estado === "en_negociacion" ? contrapropuestas.find((c) => c.descargada_en)?.id : undefined;
  return (
    <div className="space-y-6">
      {contrapropuestas.length > 0 && (
        <section>
          <h2 className="mb-2 text-[14px] font-semibold">Contrapropuestas generadas</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-lg border border-linea bg-white">
            {contrapropuestas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-[13.5px]">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Contrapropuesta en Word</span>
                    {c.id === vigente && (
                      <span className="rounded-full bg-mandarina-suave px-2 py-px text-[11.5px] font-medium text-mandarina-texto">En negociación</span>
                    )}
                  </span>
                  <span className="block text-[12.5px] text-secundario">
                    {c.hallazgos_incluidos.length} cambio{c.hallazgos_incluidos.length === 1 ? "" : "s"} · generada por{" "}
                    {c.generado_por ? perfiles[c.generado_por]?.nombre : "Legal"} el {fechaHora(c.creado_en)} ·{" "}
                    {c.descargada_en
                      ? `descargada${c.descargada_por ? ` por ${perfiles[c.descargada_por]?.nombre ?? "Legal"}` : ""} el ${fechaHora(c.descargada_en)}`
                      : "sin descargar"}
                  </span>
                </span>
                <DescargarContrapropuesta id={c.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-[14px] font-semibold">Versiones recibidas</h2>
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
                    v{v.numero}{" "}
                    {v.id === actual && (
                      <span className="ml-1 rounded bg-mandarina-suave px-1.5 py-px text-[11px] text-mandarina-texto">vigente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{v.nombre_archivo}</td>
                  <td className="px-4 py-3 text-secundario">{v.origen === "contrapropuesta" ? "Contrapropuesta" : "Documento recibido"}</td>
                  <td className="px-4 py-3 text-secundario">{v.creado_por ? perfiles[v.creado_por]?.nombre : "Sistema"}</td>
                  <td className="px-4 py-3 text-secundario">{fechaHora(v.creado_en)}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/api/documentos/${v.id}`} className="text-[13px] font-medium text-mandarina-texto hover:underline">
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
      </section>
    </div>
  );
}
