import type { TipoContrato } from "@/lib/tipos";

// El tipo de contrato según su título ("CONTRATO DE PRESTACIÓN DE SERVICIOS DE ...").
// Solo cuando el título lo dice expresamente; si no, lo identifica la IA o Legal.
const REGLAS: [RegExp, TipoContrato][] = [
  [/confidencialidad|no divulgaci[oó]n/i, "confidencialidad"],
  [/arrendamiento/i, "arrendamiento"],
  [/suministro/i, "suministro"],
  [/compra\s*-?\s*venta/i, "compraventa"],
  [/prestaci[oó]n de servicios|servicios profesionales/i, "prestacion_servicios"],
  [/contrato de obra|obra a precio/i, "obra"],
];

export function tipoPorTitulo(titulo: string | null | undefined): TipoContrato | null {
  if (!titulo) return null;
  // Solo la denominación del contrato, no lo que viene después ("que celebran...").
  const nombre = titulo.split(/\bque celebran\b/i)[0];
  return REGLAS.find(([re]) => re.test(nombre))?.[1] ?? null;
}
