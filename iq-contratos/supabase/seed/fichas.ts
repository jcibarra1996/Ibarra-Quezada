// Ficha de los contratos de la demostración, como la dejaría la IA: cada grupo de datos
// trae la cita textual del contrato de donde sale. Unas quedan confirmadas por Legal y
// otras pendientes, para mostrar ambos casos.
import type { CampoFicha, FuentesFicha, ValoresFicha } from "../../lib/ai/ficha-esquema";

type Grupo = { valores: ValoresFicha; cita: string };
export interface FichaDemo {
  tipo: string;
  grupos: Grupo[];
  responsable: "directora" | "abogado" | null;
  confirmada: "directora" | "abogado" | null;
}

const JURISDICCION_CDMX = {
  valores: { jurisdiccion: "Tribunales competentes de la Ciudad de México" },
  cita: "se someten a la jurisdicción de los tribunales competentes de la Ciudad de México",
};

export const FICHAS: Record<string, FichaDemo> = {
  "01-suministro-proveedor-xyz.txt": {
    tipo: "suministro",
    responsable: "abogado",
    confirmada: null,
    grupos: [
      { valores: { inicio_vigencia: "2026-02-01", fin_vigencia: "2027-01-31", duracion_meses: 12 }, cita: "tendrá una vigencia de un año contado a partir del 1 de febrero de 2026 y concluirá el 31 de enero de 2027" },
      { valores: { renovacion_automatica: true, renovacion_meses: 12 }, cita: "el contrato se renovará automáticamente por periodos sucesivos de un año" },
      { valores: { aviso_dias: 90, aviso_habiles: false }, cita: "con al menos noventa días naturales de anticipación a la fecha de vencimiento del periodo que corresponda" },
      { valores: { jurisdiccion: "Tribunales competentes de Monterrey, Nuevo León" }, cita: "a la jurisdicción de los tribunales competentes de la ciudad de Monterrey, Nuevo León" },
    ],
  },
  "02-servicios-mantenimiento.txt": {
    tipo: "prestacion_servicios",
    responsable: null,
    confirmada: null,
    grupos: [
      { valores: { monto: 85000, moneda: "MXN", monto_periodo: "mensual" }, cita: "una contraprestación mensual de $85,000.00 (ochenta y cinco mil pesos 00/100 M.N.)" },
      { valores: { inicio_vigencia: "2026-04-01", fin_vigencia: "2027-03-31" }, cita: "tendrá una vigencia del 1 de abril de 2026 al 31 de marzo de 2027" },
      { valores: { aviso_dias: 60, aviso_habiles: false }, cita: "mediante aviso por escrito con sesenta días naturales de anticipación" },
      JURISDICCION_CDMX,
    ],
  },
  "03-arrendamiento-oficinas.txt": {
    tipo: "arrendamiento",
    responsable: "abogado",
    confirmada: "abogado",
    grupos: [
      { valores: { monto: 180000, moneda: "MXN", monto_periodo: "mensual" }, cita: "pagará una renta mensual de $180,000.00 (ciento ochenta mil pesos 00/100 M.N.)" },
      { valores: { inicio_vigencia: "2027-01-01", fin_vigencia: "2029-12-31", duracion_meses: 36 }, cita: "de tres años, contados a partir del 1 de enero de 2027 y hasta el 31 de diciembre de 2029" },
      { valores: { renovacion_automatica: false }, cita: "La renovación estará sujeta a la aceptación de LA ARRENDADORA" },
      { valores: { aviso_dias: 60, aviso_habiles: false }, cita: "con al menos sesenta días naturales de anticipación al vencimiento" },
      JURISDICCION_CDMX,
    ],
  },
  "04-confidencialidad-tecnologia.txt": {
    tipo: "confidencialidad",
    responsable: "directora",
    confirmada: "directora",
    grupos: [
      { valores: { inicio_vigencia: "2026-05-15", duracion_meses: 24 }, cita: "tendrá una vigencia de dos años contados a partir del 15 de mayo de 2026" },
      { valores: { jurisdiccion: "Tribunales competentes de la Ciudad de México" }, cita: "LAS PARTES se someten a la jurisdicción de los tribunales competentes de la Ciudad de México" },
    ],
  },
  "05-servicios-logistica.txt": {
    tipo: "prestacion_servicios",
    responsable: "abogado",
    confirmada: "abogado",
    grupos: [
      { valores: { inicio_vigencia: "2026-01-01", fin_vigencia: "2026-12-31" }, cita: "tendrá una vigencia del 1 de enero de 2026 al 31 de diciembre de 2026" },
      { valores: { renovacion_automatica: false }, cita: "podrá renovarse por un año adicional mediante convenio por escrito firmado por ambas partes" },
      { valores: { aviso_dias: 30, aviso_habiles: false }, cita: "con al menos treinta días naturales de anticipación al vencimiento" },
      JURISDICCION_CDMX,
    ],
  },
  "06-servicios-limpieza.txt": {
    tipo: "prestacion_servicios",
    responsable: "abogado",
    confirmada: "abogado",
    grupos: [
      { valores: { monto: 42000, moneda: "MXN", monto_periodo: "mensual" }, cita: "una contraprestación mensual de $42,000.00 (cuarenta y dos mil pesos 00/100 M.N.)" },
      { valores: { inicio_vigencia: "2025-03-01", fin_vigencia: "2026-02-28" }, cita: "tendrá una vigencia del 1 de marzo de 2025 al 28 de febrero de 2026" },
      { valores: { renovacion_automatica: false }, cita: "sin que opere la renovación automática" },
      { valores: { aviso_dias: 30, aviso_habiles: false }, cita: "mediante aviso por escrito con treinta días naturales de anticipación" },
      JURISDICCION_CDMX,
    ],
  },
  "07-licencia-software.txt": {
    tipo: "otro",
    responsable: "directora",
    confirmada: null,
    grupos: [
      { valores: { monto: 360000, moneda: "MXN", monto_periodo: "anual" }, cita: "una cuota anual de $360,000.00 (trescientos sesenta mil pesos 00/100 M.N.)" },
      { valores: { inicio_vigencia: "2024-06-01", fin_vigencia: "2025-05-31" }, cita: "tendrá una vigencia del 1 de junio de 2024 al 31 de mayo de 2025" },
      { valores: { renovacion_automatica: true, renovacion_meses: 12 }, cita: "se renovará automáticamente por periodos sucesivos de doce meses" },
      { valores: { aviso_dias: 60, aviso_habiles: false }, cita: "con al menos sesenta días naturales de anticipación al vencimiento del periodo en curso" },
      { valores: { ley_aplicable: "Leyes federales de los Estados Unidos Mexicanos" }, cita: "las partes se someten a las leyes federales de los Estados Unidos Mexicanos" },
      { valores: { jurisdiccion: "Tribunales competentes de la Ciudad de México" }, cita: "a la jurisdicción de los tribunales competentes de la Ciudad de México" },
    ],
  },
};

// Convierte la ficha de la demo en columnas del contrato y sus fuentes. Falla si alguna
// cita no aparece en el texto del contrato.
export function fichaDemo(f: FichaDemo, texto: string): { valores: ValoresFicha; fuentes: FuentesFicha } {
  const plano = texto.replace(/\s+/g, " ");
  const valores: ValoresFicha = {};
  const fuentes: FuentesFicha = {};
  for (const g of f.grupos) {
    if (!plano.includes(g.cita)) throw new Error(`La cita de la ficha no aparece en el contrato: ${g.cita}`);
    for (const [k, v] of Object.entries(g.valores)) {
      valores[k as CampoFicha] = v;
      fuentes[k as CampoFicha] = { origen: "ia", cita: g.cita };
    }
  }
  return { valores, fuentes };
}
