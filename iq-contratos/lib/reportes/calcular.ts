// Indicadores del tablero de la dirección general. Todo se calcula a partir de los
// registros de la aplicación; si no hay datos suficientes, se dice así en vez de estimar.
import type { EstadoContrato, Riesgo } from "@/lib/tipos";

export interface ContratoReporte {
  id: string;
  estado: EstadoContrato;
  recibido_en: string;
  aprobado_en: string | null;
}

export interface HallazgoReporte {
  tema: string;
  riesgo: Riesgo;
  estado: string;
}

export function conteoPorEstado(contratos: ContratoReporte[]) {
  const base: Record<EstadoContrato, number> = { recibido: 0, en_revision: 0, en_negociacion: 0, aprobado: 0, firmado: 0 };
  for (const c of contratos) base[c.estado]++;
  return base;
}

// Días naturales promedio entre la recepción y la aprobación, solo de contratos aprobados.
export function tiempoPromedioRevision(contratos: ContratoReporte[]): { dias: number; muestra: number } | null {
  const tiempos = contratos
    .filter((c) => c.aprobado_en && (c.estado === "aprobado" || c.estado === "firmado"))
    .map((c) => (Date.parse(c.aprobado_en!) - Date.parse(c.recibido_en)) / 864e5)
    .filter((d) => d >= 0);
  if (tiempos.length === 0) return null;
  return { dias: Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10, muestra: tiempos.length };
}

export function hallazgosPorRiesgo(hallazgos: HallazgoReporte[]) {
  const r: Record<Riesgo, number> = { alto: 0, medio: 0, bajo: 0 };
  for (const h of hallazgos) r[h.riesgo]++;
  return r;
}

// Temas más frecuentes; el resto se agrupa en "Otros temas" para no inventar categorías.
export function hallazgosPorTema(hallazgos: HallazgoReporte[], maximo = 8) {
  const mapa = new Map<string, { total: number; altos: number }>();
  for (const h of hallazgos) {
    const t = mapa.get(h.tema) ?? { total: 0, altos: 0 };
    t.total++;
    if (h.riesgo === "alto") t.altos++;
    mapa.set(h.tema, t);
  }
  const ordenados = [...mapa.entries()].map(([tema, v]) => ({ tema, ...v })).sort((a, b) => b.total - a.total || a.tema.localeCompare(b.tema));
  if (ordenados.length <= maximo) return ordenados;
  const resto = ordenados.slice(maximo - 1);
  return [
    ...ordenados.slice(0, maximo - 1),
    { tema: "Otros temas", total: resto.reduce((n, x) => n + x.total, 0), altos: resto.reduce((n, x) => n + x.altos, 0) },
  ];
}

export function avanceValidacion(hallazgos: HallazgoReporte[]) {
  const validados = hallazgos.filter((h) => h.estado !== "pendiente").length;
  return { validados, total: hallazgos.length };
}
