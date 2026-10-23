import { esFechaValida } from "@/lib/fechas/calcular";
import { CAMPOS_FICHA, type CampoFicha, type ValoresFicha } from "@/lib/ai/ficha-esquema";

// Convierte lo capturado en el formulario al tipo de cada campo. Devuelve un error legible
// si algún dato no tiene el formato esperado.
export function leerCamposFicha(entrada: Record<string, string>): { valores: ValoresFicha } | { error: string } {
  const valores: ValoresFicha = {};
  const t = (k: CampoFicha) => (entrada[k] ?? "").trim();
  for (const campo of CAMPOS_FICHA) {
    if (!(campo in entrada)) continue;
    const v = t(campo);
    switch (campo) {
      case "monto": {
        if (!v) valores.monto = null;
        else {
          const n = Number(v.replace(/[$,\s]/g, ""));
          if (!Number.isFinite(n) || n < 0) return { error: "El monto debe ser un número." };
          valores.monto = Math.round(n * 100) / 100;
        }
        break;
      }
      case "moneda":
        if (v && !["MXN", "USD", "EUR"].includes(v)) return { error: "Moneda no válida." };
        valores.moneda = v || null;
        break;
      case "monto_periodo":
        if (v && !["total", "mensual", "anual"].includes(v)) return { error: "Periodicidad no válida." };
        valores.monto_periodo = v || null;
        break;
      case "inicio_vigencia":
      case "fin_vigencia":
        if (v && !esFechaValida(v)) return { error: "Revise las fechas de la vigencia." };
        valores[campo] = v || null;
        break;
      case "duracion_meses":
      case "renovacion_meses":
      case "aviso_dias": {
        if (!v) valores[campo] = null;
        else {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0 || n > 3650) return { error: "Los plazos deben ser números enteros." };
          valores[campo] = campo === "aviso_dias" ? n : n || null;
        }
        break;
      }
      case "renovacion_automatica":
        valores.renovacion_automatica = v === "si" ? true : v === "no" ? false : null;
        break;
      case "aviso_habiles":
        valores.aviso_habiles = v === "habiles";
        break;
      case "ley_aplicable":
      case "jurisdiccion":
        valores[campo] = v.replace(/\s*—\s*/g, ", ").slice(0, 300) || null;
        break;
    }
  }
  if (valores.monto != null && !valores.moneda) valores.moneda = "MXN";
  return { valores };
}
