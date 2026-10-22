import { ESTADOS, RIESGOS, type EstadoContrato, type Riesgo } from "@/lib/tipos";

const colorRiesgo: Record<Riesgo, string> = {
  alto: "bg-burgundy text-white",
  medio: "bg-medio-suave text-medio",
  bajo: "bg-bajo-suave text-bajo",
};

export function EtiquetaRiesgo({ riesgo }: { riesgo: Riesgo }) {
  return (
    <span className={`inline-flex h-5 items-center rounded px-1.5 text-[11px] font-semibold uppercase tracking-wide ${colorRiesgo[riesgo]}`}>
      {RIESGOS[riesgo]}
    </span>
  );
}

const colorEstado: Record<EstadoContrato, string> = {
  recibido: "bg-gris-100 text-secundario",
  en_revision: "bg-terracota-suave text-terracota-oscuro",
  en_negociacion: "bg-medio-suave text-medio",
  aprobado: "bg-bajo-suave text-bajo",
  firmado: "bg-tinta text-white",
};

export function EtiquetaEstado({ estado }: { estado: EstadoContrato }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium ${colorEstado[estado]}`}>
      {ESTADOS[estado]}
    </span>
  );
}
