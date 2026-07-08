import type { Context } from "./types";

/**
 * Auto-etiquetado inteligente: regex simple sobre el texto capturado
 * para asignar etiquetas invisibles (no se muestran en la UI binaria
 * Trabajo/Casa, pero agrupan tareas por lotes de ejecución — ej. hacer
 * todas las de "Legal" juntas, o todas las de "Perro" juntas).
 *
 * Se corre en el backend (API route) antes de insertar la tarea.
 */
const RULES: { tag: string; context?: Context; pattern: RegExp }[] = [
  // Trabajo
  { tag: "Legal", context: "trabajo", pattern: /\b(legal|contrato|demanda|juicio|abogad[oa]|notari[oa]|clausula|cl[aá]usula)\b/i },
  { tag: "Crédito", context: "trabajo", pattern: /\b(cr[eé]dito|banco|pago|factura|invoice|cobra[nr]?|deuda|interes(es)?|tarjeta)\b/i },
  { tag: "Cliente", context: "trabajo", pattern: /\b(cliente|reuni[oó]n|llamada|call|propuesta|cotizaci[oó]n)\b/i },
  { tag: "Documentos", context: "trabajo", pattern: /\b(firmar|firma|documento|pdf|expediente|acta)\b/i },

  // Casa
  { tag: "Depa", context: "casa", pattern: /\b(depa(rtamento)?|renta|casero|mantenimiento|administraci[oó]n|luz|agua|gas|internet|wifi)\b/i },
  { tag: "Perro", context: "casa", pattern: /\b(perr[oa]|mascota|veterinari[oa]|vacuna|correa|croquetas|paseo)\b/i },
  { tag: "Pareja", context: "casa", pattern: /\b(pareja|novi[oa]|esposa|esposo|aniversario|cita|cena)\b/i },
  { tag: "Coche", context: "casa", pattern: /\b(coche|carro|auto|verificaci[oó]n|tenencia|gasolina|taller|servicio del auto)\b/i },
  { tag: "Compras", context: "casa", pattern: /\b(comprar|super|mandado|tienda|amazon|mercado libre)\b/i },

  // Genéricos (aplican a ambos contextos)
  { tag: "Urgente", pattern: /\b(urgente|asap|ya|hoy mismo|ahora)\b/i },
  { tag: "Llamada", pattern: /\b(llamar|call|telefono|tel[eé]fono)\b/i },
];

export function assignSmartTags(text: string, context: Context): string[] {
  const tags = new Set<string>();

  for (const rule of RULES) {
    if (rule.context && rule.context !== context) continue;
    if (rule.pattern.test(text)) tags.add(rule.tag);
  }

  return Array.from(tags);
}

/**
 * Heurística mínima para /api/quick-add (Atajo de Siri): si el texto no
 * trae un contexto explícito, intenta inferirlo por palabras clave;
 * si no encuentra nada, cae a "casa" por default (menos crítico que
 * dejar una tarea de trabajo perdida).
 */
export function inferContext(text: string): Context {
  const trabajoHit = RULES.some((r) => r.context === "trabajo" && r.pattern.test(text));
  if (trabajoHit) return "trabajo";
  return "casa";
}
