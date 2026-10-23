import { esFechaValida, restarDiasHabiles, sumarDias, sumarMeses } from "@/lib/fechas/calcular";
import { diasEntre } from "@/lib/fechas/avisos";

// Situación de un contrato firmado frente a su vigencia, calculada con los datos de la
// ficha y la fecha de hoy. Antes de la firma, el contrato sigue en su proceso de revisión.

export type SituacionVigencia = "en_proceso" | "por_iniciar" | "vigente" | "renovado" | "por_vencer" | "vencido" | "terminado";

export const SITUACIONES: Record<SituacionVigencia, string> = {
  en_proceso: "En proceso",
  por_iniciar: "Por iniciar",
  vigente: "Vigente",
  renovado: "Renovado",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  terminado: "Terminado",
};

// Un contrato está por vencer cuando su término está a 90 días o menos, o cuando faltan 30
// días o menos para el último día de aviso de no renovación.
export const DIAS_POR_VENCER = 90;
export const DIAS_ANTES_DEL_AVISO = 30;

export interface DatosVigencia {
  estado: string;
  firmado_en: string | null;
  inicio_vigencia: string | null;
  fin_vigencia: string | null;
  duracion_meses: number | null;
  renovacion_automatica: boolean | null;
  renovacion_meses: number | null;
  aviso_dias: number | null;
  aviso_habiles: boolean;
  terminado_en: string | null;
}

export interface Vigencia {
  situacion: SituacionVigencia;
  inicio: string | null;
  // Término del periodo en curso: el original o, con renovación automática, el renovado.
  fin: string | null;
  finOriginal: string | null;
  renovaciones: number;
  // Meses de cada renovación; si el contrato no los dice, la duración del periodo original.
  periodoRenovacion: number | null;
  periodoSupuesto: boolean;
  // Último día para dar aviso de no renovación del periodo en curso.
  limiteAviso: string | null;
  diasRestantes: number | null;
}

const fecha = (s: string | null) => (s ? s.slice(0, 10) : null);

function mesesEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  // Un periodo que termina el día anterior al aniversario cuenta como meses completos.
  return Math.max(1, Math.round((a2 - a1) * 12 + (m2 - m1) + (d2 - d1 + 1) / 30));
}

export function calcularVigencia(c: DatosVigencia, hoy: string): Vigencia {
  const base: Vigencia = { situacion: "en_proceso", inicio: null, fin: null, finOriginal: null, renovaciones: 0, periodoRenovacion: null, periodoSupuesto: false, limiteAviso: null, diasRestantes: null };
  if (c.estado !== "firmado") return base;
  const inicio = esFechaValida(c.inicio_vigencia) ? c.inicio_vigencia : fecha(c.firmado_en);
  let fin = esFechaValida(c.fin_vigencia) ? c.fin_vigencia : null;
  if (!fin && inicio && c.duracion_meses) fin = sumarDias(sumarMeses(inicio, c.duracion_meses), -1);
  const v: Vigencia = { ...base, situacion: "vigente", inicio, fin, finOriginal: fin };
  if (c.terminado_en) return { ...v, situacion: "terminado", fin: fecha(c.terminado_en) };
  if (inicio && inicio > hoy) return { ...v, situacion: "por_iniciar", diasRestantes: fin ? diasEntre(hoy, fin) : null };
  if (!fin) return v;

  if (c.renovacion_automatica) {
    const periodo = c.renovacion_meses ?? (inicio ? mesesEntre(inicio, fin) : c.duracion_meses);
    if (periodo) {
      v.periodoRenovacion = periodo;
      v.periodoSupuesto = !c.renovacion_meses;
      // Cada renovación corre desde el día siguiente al término anterior.
      while (fin < hoy && v.renovaciones < 600) {
        fin = sumarDias(sumarMeses(sumarDias(fin, 1), periodo), -1);
        v.renovaciones++;
      }
      v.fin = fin;
    }
  }
  v.diasRestantes = diasEntre(hoy, fin);
  if (c.aviso_dias != null && (c.renovacion_automatica || c.renovacion_automatica == null)) {
    v.limiteAviso = c.aviso_habiles ? restarDiasHabiles(fin, c.aviso_dias) : sumarDias(fin, -c.aviso_dias);
  }
  if (fin < hoy) return { ...v, situacion: "vencido" };
  const avisoCerca = v.limiteAviso != null && v.limiteAviso >= hoy && diasEntre(hoy, v.limiteAviso) <= DIAS_ANTES_DEL_AVISO;
  if (v.diasRestantes <= DIAS_POR_VENCER || avisoCerca) return { ...v, situacion: "por_vencer" };
  return { ...v, situacion: v.renovaciones > 0 ? "renovado" : "vigente" };
}

// Valor anual estimado, para sumar la cartera: un monto mensual por doce, uno anual tal
// cual y uno total repartido entre los años del plazo original (completo si dura un año o
// menos). Sin monto, o con monto total sin plazo conocido, no se estima.
export function valorAnual(c: { monto: number | null; monto_periodo: string | null }, v: Pick<Vigencia, "inicio" | "finOriginal">): number | null {
  if (c.monto == null) return null;
  if (c.monto_periodo === "mensual") return c.monto * 12;
  if (c.monto_periodo === "anual") return c.monto;
  if (!v.inicio || !v.finOriginal) return null;
  return c.monto * Math.min(1, 12 / mesesEntre(v.inicio, v.finOriginal));
}
