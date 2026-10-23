import { ESTADOS, RIESGOS, type EstadoContrato, type Riesgo } from "@/lib/tipos";
import { SITUACIONES, type SituacionVigencia } from "@/lib/vigencia";

const colorRiesgo: Record<Riesgo, string> = {
  alto: "bg-burgundy text-white",
  medio: "bg-medio-suave text-medio",
  bajo: "bg-bajo-suave text-bajo",
};

export function EtiquetaRiesgo({ riesgo }: { riesgo: Riesgo }) {
  return (
    <span className={`inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-semibold uppercase tracking-wide ${colorRiesgo[riesgo]}`}>
      {RIESGOS[riesgo]}
    </span>
  );
}

const colorEstado: Record<EstadoContrato, { fondo: string; punto: string }> = {
  recibido: { fondo: "bg-gris-100 text-tinta", punto: "bg-secundario" },
  en_revision: { fondo: "bg-terracota-suave text-terracota-oscuro", punto: "bg-terracota" },
  en_negociacion: { fondo: "bg-medio-suave text-medio", punto: "bg-medio" },
  aprobado: { fondo: "bg-bajo-suave text-bajo", punto: "bg-bajo" },
  firmado: { fondo: "bg-tinta text-white", punto: "bg-white" },
};

export function EtiquetaEstado({ estado }: { estado: EstadoContrato }) {
  const c = colorEstado[estado];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${c.fondo}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.punto}`} aria-hidden />
      {ESTADOS[estado]}
    </span>
  );
}

const colorVigencia: Record<SituacionVigencia, { fondo: string; punto: string }> = {
  en_proceso: { fondo: "bg-gris-100 text-secundario", punto: "bg-secundario" },
  por_iniciar: { fondo: "bg-gris-100 text-tinta", punto: "bg-secundario" },
  vigente: { fondo: "bg-bajo-suave text-bajo", punto: "bg-bajo" },
  renovado: { fondo: "bg-bajo-suave text-bajo", punto: "bg-bajo" },
  por_vencer: { fondo: "bg-medio-suave text-medio", punto: "bg-medio" },
  vencido: { fondo: "bg-burgundy-suave text-burgundy", punto: "bg-burgundy" },
  terminado: { fondo: "bg-gris-100 text-secundario", punto: "bg-secundario" },
};

export function EtiquetaVigencia({ situacion }: { situacion: SituacionVigencia }) {
  const c = colorVigencia[situacion];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${c.fondo}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.punto}`} aria-hidden />
      {SITUACIONES[situacion]}
    </span>
  );
}
