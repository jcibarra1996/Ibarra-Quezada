// Ficha del contrato que extrae la IA: esquema de la salida del modelo, validación contra
// el texto del contrato y reglas para aplicarla sin pisar lo que capturó Legal.
import { z } from "zod";
import { esFechaValida, sumarDias, sumarMeses } from "@/lib/fechas/calcular";
import { localizarCita } from "./verificar-citas";

const cita = z.string().nullable().describe("Copia exacta, carácter por carácter, del fragmento del contrato del que sale el dato o su análisis. Null si el contrato no trata el tema.");
const analisis = z
  .string()
  .nullable()
  .describe("Una oración: cómo se lee el dato en el contrato, si se calculó y cómo, o por qué no hay un valor fijo (remite a un anexo, es variable, el contrato no lo regula).");

export const FichaSchema = z.object({
  tipo: z.object({
    tipo: z
      .enum(["suministro", "prestacion_servicios", "obra", "arrendamiento", "confidencialidad", "compraventa", "otro"])
      .nullable()
      .describe("Tipo del contrato según su objeto (la obligación principal de las partes), no según su título."),
    objeto: z.string().nullable().describe("El objeto del contrato en una oración."),
    razon: z.string().nullable().describe("En una oración: qué obligación principal del objeto determina el tipo; si el título dice otra cosa, señálelo."),
    cita: z.string().nullable().describe("Copia exacta, carácter por carácter, de la cláusula u oración del objeto del contrato."),
  }),
  monto: z.object({
    monto: z.number().nullable().describe("Importe de la contraprestación principal, sin IVA si el contrato lo separa. Solo número, sin símbolos. Null si no hay un importe fijo."),
    moneda: z.enum(["MXN", "USD", "EUR"]).nullable(),
    periodo: z.enum(["total", "mensual", "anual"]).nullable().describe("total: precio de todo el contrato; mensual o anual: pago recurrente."),
    analisis,
    cita,
  }),
  vigencia: z.object({
    inicio: z.string().nullable().describe("AAAA-MM-DD del inicio de la vigencia, si resulta del contrato."),
    fin: z.string().nullable().describe("AAAA-MM-DD del término, si el contrato lo fija o resulta de su inicio y su plazo."),
    duracion_meses: z.number().int().nullable().describe("Duración en meses, si el contrato la expresa como plazo."),
    analisis,
    cita,
  }),
  renovacion: z.object({
    automatica: z.boolean().nullable().describe("true si se renueva sin necesidad de un nuevo acuerdo; false si requiere acuerdo o el contrato concluye a su término."),
    meses: z.number().int().nullable().describe("Meses de cada periodo de renovación automática."),
    analisis,
    cita,
  }),
  aviso: z.object({
    dias: z.number().int().nullable().describe("Días de anticipación para avisar que no se renovará o para darlo por terminado."),
    habiles: z.boolean().nullable().describe("true si son días hábiles; false si son naturales o el contrato no lo distingue."),
    analisis,
    cita,
  }),
  ley_aplicable: z.object({ texto: z.string().nullable().describe("Leyes que rigen el contrato, en pocas palabras, solo si el contrato las pacta."), analisis, cita }),
  jurisdiccion: z.object({ texto: z.string().nullable().describe("Tribunales a los que se someten las partes, en pocas palabras."), analisis, cita }),
});

export type FichaModelo = z.infer<typeof FichaSchema>;

export const CAMPOS_FICHA = [
  "tipo_contrato",
  "objeto",
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
  // "titulo": provisional, tomado de la denominación al registrar; la IA lo revisa contra el objeto.
  origen: "ia" | "manual" | "titulo";
  cita?: string;
  // Por qué la IA eligió el valor (para el tipo: la obligación principal del objeto).
  nota?: string;
  por?: string;
  en?: string;
}
export type FuentesFicha = Partial<Record<CampoFicha, FuenteFicha>>;

const sinRayas = (s: string) => s.replace(/\s*—\s*/g, ", ").trim();
const entero = (n: number | null, max: number) => (n != null && Number.isInteger(n) && n > 0 && n <= max ? n : null);

// Solo se aceptan datos cuya cita aparece textual en el contrato; lo demás se descarta.
// Cada grupo guarda el análisis de la IA como nota. Si no hay valor pero sí análisis (por
// ejemplo, "el precio está en el Anexo B" o "no se pacta ley aplicable"), se guarda solo la
// nota en el primer campo del grupo, para mostrarla en lugar de "Sin dato".
export function procesarFicha(salida: unknown, textoContrato: string): { valores: ValoresFicha; fuentes: FuentesFicha } {
  const f = FichaSchema.parse(salida);
  const valores: ValoresFicha = {};
  const fuentes: FuentesFicha = {};
  const nota = (s: string | null | undefined) => (s && s.trim() ? sinRayas(s).slice(0, 400) : undefined);
  const poner = (grupo: { cita: string | null }, principal: CampoFicha, campos: ValoresFicha, analisis?: string | null) => {
    const citaValida = grupo.cita && localizarCita(textoContrato, grupo.cita) ? grupo.cita.slice(0, 600) : undefined;
    const n = nota(analisis);
    const definidos = Object.entries(campos).filter(([, v]) => v != null);
    if (definidos.length && citaValida) {
      for (const [k, v] of definidos) {
        valores[k as CampoFicha] = v;
        // El objeto ya es el análisis del tipo: no repite la razón.
        fuentes[k as CampoFicha] = { origen: "ia", cita: citaValida, ...(n && k !== "objeto" ? { nota: n } : {}) };
      }
    } else if (!definidos.length && n && (citaValida || grupo.cita == null)) {
      // Sin valor: solo el análisis, con su cita si la hay (no se acepta una cita inventada).
      fuentes[principal] = { origen: "ia", nota: n, ...(citaValida ? { cita: citaValida } : {}) };
    }
  };
  if (f.tipo.tipo) poner(f.tipo, "tipo_contrato", { tipo_contrato: f.tipo.tipo, objeto: f.tipo.objeto ? sinRayas(f.tipo.objeto).slice(0, 600) : null }, f.tipo.razon);
  const m = f.monto;
  poner(m, "monto", m.monto != null && m.monto > 0 ? { monto: Math.round(m.monto * 100) / 100, moneda: m.moneda ?? "MXN", monto_periodo: m.periodo ?? "total" } : {}, m.analisis);
  const v = f.vigencia;
  const inicio = esFechaValida(v.inicio) ? v.inicio : null;
  const duracion = entero(v.duracion_meses, 600);
  // Con inicio y plazo, el término se calcula aquí (un día antes del aniversario), no lo
  // decide el modelo.
  const fin = inicio && duracion ? sumarDias(sumarMeses(inicio, duracion), -1) : esFechaValida(v.fin) && (!inicio || v.fin >= inicio) ? v.fin : null;
  poner(v, "inicio_vigencia", { inicio_vigencia: inicio, fin_vigencia: fin, duracion_meses: duracion }, v.analisis);
  poner(f.renovacion, "renovacion_automatica", { renovacion_automatica: f.renovacion.automatica, renovacion_meses: f.renovacion.automatica ? entero(f.renovacion.meses, 600) : null }, f.renovacion.analisis);
  poner(f.aviso, "aviso_dias", f.aviso.dias != null ? { aviso_dias: entero(f.aviso.dias, 3650), aviso_habiles: f.aviso.habiles ?? false } : {}, f.aviso.analisis);
  poner(f.ley_aplicable, "ley_aplicable", { ley_aplicable: f.ley_aplicable.texto ? sinRayas(f.ley_aplicable.texto).slice(0, 300) : null }, f.ley_aplicable.analisis);
  poner(f.jurisdiccion, "jurisdiccion", { jurisdiccion: f.jurisdiccion.texto ? sinRayas(f.jurisdiccion.texto).slice(0, 300) : null }, f.jurisdiccion.analisis);
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
    if (fuentes[campo]?.origen === "manual") continue;
    if (nuevo == null) {
      // Solo análisis, sin valor: se guarda la nota si el campo está vacío; no se borra un dato.
      if (extraida.fuentes[campo] && actual[campo] == null) fuentes[campo] = extraida.fuentes[campo];
      continue;
    }
    const previo = actual[campo];
    const igual = previo != null && (typeof nuevo === "number" ? Number(previo) === nuevo : previo === nuevo);
    if (!igual) cambios[campo] = nuevo;
    fuentes[campo] = extraida.fuentes[campo];
  }
  return { cambios, fuentes, desconfirmar: Object.keys(cambios).length > 0 && actual.ficha_confirmada_en != null };
}
