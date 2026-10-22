// Cálculo de avisos programados para cada alerta. Funciones puras para poder probarlas.
import { sumarDias } from "./calcular";

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 864e5);
}

// Fechas en que se debe avisar al área responsable, de la más próxima a la más lejana.
export function fechasDeAviso(fechaLimite: string, avisosDias: number[]): { dias: number; fecha: string }[] {
  return [...new Set(avisosDias)]
    .filter((d) => d > 0)
    .sort((a, b) => b - a)
    .map((dias) => ({ dias, fecha: sumarDias(fechaLimite, -dias) }));
}

export function proximoAviso(fechaLimite: string, avisosDias: number[], hoy: string) {
  return fechasDeAviso(fechaLimite, avisosDias).find((a) => a.fecha >= hoy) ?? null;
}

// Alertas cuyo aviso cae exactamente hoy (lo que enviaría el correo programado).
export function avisosDeHoy<T extends { fecha_limite: string; avisos_dias: number[]; estado: string }>(alertas: T[], hoy: string) {
  return alertas.flatMap((a) =>
    a.estado !== "activa"
      ? []
      : fechasDeAviso(a.fecha_limite, a.avisos_dias)
          .filter((f) => f.fecha === hoy)
          .map((f) => ({ alerta: a, dias: f.dias })),
  );
}

export type Urgencia = "vencida" | "critica" | "proxima" | "lejana";
export function urgencia(fechaLimite: string, hoy: string): Urgencia {
  const d = diasEntre(hoy, fechaLimite);
  if (d < 0) return "vencida";
  if (d <= 15) return "critica";
  if (d <= 60) return "proxima";
  return "lejana";
}

// Matriz de semanas (lunes a domingo) para el calendario de un mes "AAAA-MM".
export function semanasDelMes(mes: string): (string | null)[][] {
  const [a, m] = mes.split("-").map(Number);
  const primero = new Date(Date.UTC(a, m - 1, 1));
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const desfase = (primero.getUTCDay() + 6) % 7; // lunes = 0
  const celdas: (string | null)[] = Array(desfase).fill(null);
  for (let d = 1; d <= dias; d++) celdas.push(`${mes}-${String(d).padStart(2, "0")}`);
  while (celdas.length % 7) celdas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}
