import { ORDEN_ESTADOS, type EstadoContrato } from "./tipos";

// Línea de tiempo de una solicitud para el área de negocio: cuándo entró a cada etapa,
// cuánto lleva en la actual y cuánto ha tomado en total. Se calcula con la fecha de
// recepción y los cambios de estado de la bitácora (accion "estado_cambiado").

export interface CambioEstado {
  a: string;
  creado_en: string;
}

export type EstadoPaso = "hecho" | "actual" | "omitido" | "pendiente";

export interface Paso {
  estado: EstadoContrato;
  situacion: EstadoPaso;
  // Última vez que el contrato entró a esta etapa; null si no hay registro.
  desde: string | null;
}

export interface LineaTiempo {
  pasos: Paso[];
  // Desde cuándo está en la etapa actual.
  enEtapaDesde: string;
  // Días completos desde la solicitud hasta hoy, o hasta la firma si ya se firmó.
  diasTotales: number;
}

const DIA = 864e5;

export function diasEntre(desde: string, hasta: Date | string = new Date()): number {
  return Math.max(0, Math.floor((new Date(hasta).getTime() - new Date(desde).getTime()) / DIA));
}

export function duracion(dias: number): string {
  if (dias < 1) return "menos de un día";
  return dias === 1 ? "1 día" : `${dias} días`;
}

export function lineaTiempo(p: {
  estado: EstadoContrato;
  recibido_en: string;
  cambios: CambioEstado[];
  // Fechas oficiales del contrato; prevalecen sobre la bitácora.
  aprobado_en?: string | null;
  firmado_en?: string | null;
  ahora?: Date;
}): LineaTiempo {
  const actual = ORDEN_ESTADOS.indexOf(p.estado);
  const entradas = new Map<string, string>([["recibido", p.recibido_en]]);
  for (const c of [...p.cambios].sort((x, y) => x.creado_en.localeCompare(y.creado_en))) entradas.set(c.a, c.creado_en);
  entradas.set("recibido", p.recibido_en);
  if (p.aprobado_en) entradas.set("aprobado", p.aprobado_en);
  if (p.firmado_en) entradas.set("firmado", p.firmado_en);
  // Una etapa anterior no puede tener fecha posterior a la siguiente (p. ej. contratos
  // cargados con su historia ya avanzada): esa fecha no se muestra.
  let limite = entradas.get(ORDEN_ESTADOS[actual]) ?? null;
  for (let i = actual - 1; i > 0; i--) {
    const d = entradas.get(ORDEN_ESTADOS[i]);
    if (!d) continue;
    if (limite && d > limite) entradas.delete(ORDEN_ESTADOS[i]);
    else limite = d;
  }

  const pasos = ORDEN_ESTADOS.map((estado, i): Paso => {
    if (i > actual) return { estado, situacion: "pendiente", desde: null };
    const desde = entradas.get(estado) ?? null;
    if (i === actual) return { estado, situacion: "actual", desde };
    return { estado, situacion: desde ? "hecho" : "omitido", desde };
  });
  const enEtapaDesde = pasos[actual].desde ?? p.recibido_en;
  const fin = p.estado === "firmado" ? enEtapaDesde : (p.ahora ?? new Date());
  return { pasos, enEtapaDesde, diasTotales: diasEntre(p.recibido_en, fin) };
}

// El proceso completo, tal como lo ve quien solicita el contrato.
export const PROCESO: Record<EstadoContrato, { titulo: string; corto: string; quien: string; que: string }> = {
  recibido: { titulo: "Solicitud recibida", corto: "Solicitud", quien: "Legal", que: "Legal recibe su solicitud con el contrato o la plantilla y los documentos corporativos." },
  en_revision: { titulo: "Revisión legal", corto: "Revisión", quien: "Legal", que: "Un abogado revisa cada cláusula y verifica los datos de las partes contra sus expedientes." },
  en_negociacion: { titulo: "Negociación", corto: "Negociación", quien: "Legal y la contraparte", que: "Solo si hay cambios por acordar: Legal envía la contrapropuesta y negocia con la contraparte." },
  aprobado: { titulo: "Aprobación", corto: "Aprobación", quien: "Legal", que: "Legal autoriza la versión final. A partir de aquí ya puede firmarse." },
  firmado: { titulo: "Firma", corto: "Firma", quien: "Representantes de las partes", que: "Se firma con e.firma por Mifiel o de forma autógrafa. Legal da seguimiento a plazos y vencimientos." },
};
