import { EtiquetaEstado } from "@/components/ui/etiquetas";
import { fecha } from "@/lib/formato";
import { TIPOS_CONTRATO, type EstadoContrato, type TipoContrato } from "@/lib/tipos";
import { BotonCompartir } from "./boton-compartir";

export function EncabezadoContrato({
  contrato,
  acciones,
}: {
  contrato: { id: string; titulo: string; contraparte: string; estado: string; recibido_en: string; tipo_contrato: string | null; areas: unknown };
  acciones?: React.ReactNode;
}) {
  const area = (contrato.areas as { nombre: string } | null)?.nombre;
  return (
    <header className="border-b border-linea bg-white px-8 pb-4 pt-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="mb-1 text-[12px] font-medium uppercase tracking-wider text-secundario">
            {contrato.tipo_contrato ? TIPOS_CONTRATO[contrato.tipo_contrato as TipoContrato] : "Tipo por identificar"}
          </p>
          <h1 className="truncate text-[21px] font-semibold tracking-tight">{contrato.titulo}</h1>
          <dl className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-secundario">
            <div className="flex gap-1.5">
              <dt>Contraparte:</dt>
              <dd className="font-medium text-tinta">{contrato.contraparte || "Sin identificar"}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Recibido:</dt>
              <dd className="text-tinta">{fecha(contrato.recibido_en)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Área responsable:</dt>
              <dd className="text-tinta">{area ?? "Sin asignar"}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Estado</dt>
              <dd>
                <EtiquetaEstado estado={contrato.estado as EstadoContrato} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <BotonCompartir />
          {acciones}
        </div>
      </div>
    </header>
  );
}
