// Ficha del contrato que extrae la IA: esquema de la salida del modelo, validación contra
// el texto del contrato y reglas para aplicarla sin pisar lo que capturó Legal.
import { z } from "zod";
import { esFechaValida } from "@/lib/fechas/calcular";
import { localizarCita } from "./verificar-citas";

const cita = z.string().nullable().describe("Copia exacta, carácter por carácter, del fragmento del contrato del que sale el dato. Null si el contrato no lo dice.");

export const FichaSchema = z.object({
  tipo: z.object({
    tipo: z.enum(["suministro", "prestacion_servicios", "obra", "arrendamiento", "confidencialidad", "compraventa", "otro"]).nullable().describe("Tipo del contrato según su denominación y su objeto."),
    cita,
  }),
  monto: z.object({
    monto: z.number().nullable().describe("Importe de la contraprestación principal, sin IVA si el contrato lo separa. Solo número, sin símbolos."),
    moneda: z.enum(["MXN", "USD", "EUR"]).nullable(),
    periodo: z.enum(["total", "mensual", "anual"]).nullable().describe("total: precio de todo el contrato; mensual o anual: pago recurrente."),
    cita,
  }),
  vigencia: z.object({
    inicio: z.string().nullable().describe("AAAA-MM-DD solo si el contrato fija expresamente la fecha de inicio."),
    fin: z.string().nullable().describe("AAAA-MM-DD solo si el contrato fija expresamente la fecha de término."),
    duracion_meses: z.number().int().nullable().describe("Duración en meses si el contrato la expresa como plazo (por ejemplo, 12 meses a partir de la firma)."),
    cita,
  }),
  renovacion: z.object({
    automatica: z.boolean().nullable().describe("true si se renueva sin necesidad de un nuevo acuerdo; false si el contrato dice que no se renueva o que requiere acuerdo por escrito."),
    meses: z.number().int().nullable().describe("Meses de cada periodo de renovación, si el contrato lo dice."),
    cita,
  }),
  aviso: z.object({
    dias: z.number().int().nullable().describe("Días de anticipación para avisar que no se renovará o para darlo por terminado."),
    habiles: z.boolean().nullable().describe("true si son días hábiles; false si son naturales o el contrato no lo distingue."),
    cita,
  }),
  ley_aplicable: z.object({ texto: z.string().nullable().describe("Leyes que rigen el contrato, en pocas palabras."), cita }),
  jurisdiccion: z.object({ texto: z.string().nullable().describe("Tribunales a los que se someten las partes, en pocas palabras."), cita }),
});

export type FichaModelo = z.infer<typeof FichaSchema>;

export const CAMPOS_FICHA = [
  "tipo_contrato",
  "monto",
  "moneda",
  "monto_periodo",
  "inicio_vigencia",
  "fin_vigencia",
  "duracion_meses",
  "renovacion_automatica",
  "renovacion_meses",
  "aviso_dias",
  "aviso_habiles",
  "ley_aplicable",
  "jurisdiccion",
] as const;
export type CampoFicha = (typeof CAMPOS_FICHA)[number];
export type ValoresFicha = Partial<Record<CampoFicha, string | number | boolean | null>>;
export interface FuenteFicha {
  origen: "ia" | "manual";
  cita?: string;
  por?: string;
  en?: string;
}
export type FuentesFicha = Partial<Record<CampoFicha, FuenteFicha>>;

const sinRayas = (s: string) => s.replace(/\s*—\s*/g, ", ").trim();
const entero = (n: number | null, max: number) => (n != null && Number.isInteger(n) && n > 0 && n <= max ? n : null);

// Solo se aceptan datos cuya cita aparece textual en el contrato; lo demás se descarta.
export function procesarFicha(salida: unknown, textoContrato: string): { valores: ValoresFicha; fuentes: FuentesFicha } {
  const f = FichaSchema.parse(salida);
  const valores: ValoresFicha = {};
  const fuentes: FuentesFicha = {};
  const poner = (grupo: { cita: string | null }, campos: ValoresFicha) => {
    const definidos = Object.entries(campos).filter(([, v]) => v != null);
    if (!definidos.length || !grupo.cita || !localizarCita(textoContrato, grupo.cita)) return;
    for (const [k, v] of definidos) {
      valores[k as CampoFicha] = v;
      fuentes[k as CampoFicha] = { origen: "ia", cita: grupo.cita.slice(0, 600) };
    }
  };
  if (f.tipo.tipo) poner(f.tipo, { tipo_contrato: f.tipo.tipo });
  const m = f.monto;
  if (m.monto != null && m.monto > 0) poner(m, { monto: Math.round(m.monto * 100) / 100, moneda: m.moneda ?? "MXN", monto_periodo: m.periodo ?? "total" });
  const v = f.vigencia;
  const inicio = esFechaValida(v.inicio) ? v.inicio : null;
  const fin = esFechaValida(v.fin) ? v.fin : null;
  poner(v, { inicio_vigencia: inicio, fin_vigencia: fin && (!inicio || fin >= inicio) ? fin : null, duracion_meses: entero(v.duracion_meses, 600) });
  poner(f.renovacion, { renovacion_automatica: f.renovacion.automatica, renovacion_meses: entero(f.renovacion.meses, 600) });
  if (f.aviso.dias != null) poner(f.aviso, { aviso_dias: entero(f.aviso.dias, 3650), aviso_habiles: f.aviso.habiles ?? false });
  if (f.ley_aplicable.texto) poner(f.ley_aplicable, { ley_aplicable: sinRayas(f.ley_aplicable.texto).slice(0, 300) });
  if (f.jurisdiccion.texto) poner(f.jurisdiccion, { jurisdiccion: sinRayas(f.jurisdiccion.texto).slice(0, 300) });
  return { valores, fuentes };
}

// Aplica lo extraído sobre la ficha actual: nunca cambia un dato que capturó Legal a mano
// ni borra uno existente. Si cambia algún dato de una ficha confirmada, la confirmación se
// retira para que Legal la revise de nuevo.
export function aplicarFicha(
  actual: ValoresFicha & { ficha_fuentes: FuentesFicha | null; ficha_confirmada_en: string | null },
  extraida: { valores: ValoresFicha; fuentes: FuentesFicha },
): { cambios: ValoresFicha; fuentes: FuentesFicha; desconfirmar: boolean } {
  const fuentes: FuentesFicha = { ...(actual.ficha_fuentes ?? {}) };
  const cambios: ValoresFicha = {};
  for (const campo of CAMPOS_FICHA) {
    const nuevo = extraida.valores[campo];
    if (nuevo == null || fuentes[campo]?.origen === "manual") continue;
    const previo = actual[campo];
    const igual = previo != null && (typeof nuevo === "number" ? Number(previo) === nuevo : previo === nuevo);
    if (!igual) cambios[campo] = nuevo;
    fuentes[campo] = extraida.fuentes[campo];
  }
  return { cambios, fuentes, desconfirmar: Object.keys(cambios).length > 0 && actual.ficha_confirmada_en != null };
}
