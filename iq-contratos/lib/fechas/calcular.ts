// Cálculo determinista de fechas derivadas. El modelo solo extrae lo que el contrato
// dice; aquí se calculan el periodo vigente y el último día para dar avisos.

import type { FechaModelo } from "@/lib/ai/esquema";

export interface FechaClave {
  tipo: FechaModelo["tipo"];
  descripcion: string;
  fecha: string | null;
  regla: string | null;
  dias_aviso: number | null;
  clausula: string | null;
  cita: string | null;
  derivada: boolean;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaValida(s: string | null | undefined): s is string {
  if (!s || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Resta días hábiles contando solo lunes a viernes. No considera días festivos.
export function restarDiasHabiles(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  let restantes = dias;
  while (restantes > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    const dia = d.getUTCDay();
    if (dia !== 0 && dia !== 6) restantes--;
  }
  return d.toISOString().slice(0, 10);
}

export function sumarMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const objetivo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(d, ultimoDia));
  return objetivo.toISOString().slice(0, 10);
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

// Completa las fechas extraídas con las que se derivan de ellas, a la fecha de hoy.
export function derivarFechas(extraidas: FechaModelo[], hoy: string): FechaClave[] {
  const salida: FechaClave[] = extraidas.map((f) => ({
    tipo: f.tipo,
    descripcion: f.descripcion,
    fecha: esFechaValida(f.fecha) ? f.fecha : null,
    regla: f.regla,
    dias_aviso: f.dias_aviso,
    clausula: f.clausula,
    cita: f.cita_textual,
    derivada: false,
  }));

  const fin = extraidas.find((f) => (f.tipo === "fin_vigencia" || f.tipo === "vencimiento") && esFechaValida(f.fecha));
  if (!fin?.fecha) return salida;

  const renovacion = extraidas.find((f) => f.tipo === "renovacion_automatica");
  const aviso =
    extraidas.find((f) => f.tipo === "plazo_aviso" && f.dias_aviso) ?? (renovacion?.dias_aviso ? renovacion : undefined);

  // Si hay renovación automática y el plazo original ya venció, el periodo vigente es otro.
  let finPeriodo = fin.fecha;
  const meses = renovacion?.periodo_renovacion_meses;
  if (renovacion && meses && meses > 0) {
    let vueltas = 0;
    while (finPeriodo < hoy && vueltas < 50) {
      finPeriodo = sumarMeses(finPeriodo, meses);
      vueltas++;
    }
    if (finPeriodo !== fin.fecha) {
      salida.push({
        tipo: "vencimiento",
        descripcion: `Fin del periodo vigente por renovación automática (${fechaLarga(finPeriodo)}).`,
        fecha: finPeriodo,
        regla: renovacion.regla,
        dias_aviso: null,
        clausula: renovacion.clausula,
        cita: null,
        derivada: true,
      });
    }
  }

  if (aviso?.dias_aviso && aviso.dias_aviso > 0) {
    const habiles = aviso.dias_aviso_tipo === "habiles";
    const limite = habiles ? restarDiasHabiles(finPeriodo, aviso.dias_aviso) : sumarDias(finPeriodo, -aviso.dias_aviso);
    const que = renovacion ? "aviso de no renovación" : "aviso previo al vencimiento";
    salida.push({
      tipo: "plazo_aviso",
      descripcion:
        `Fecha límite para enviar el ${que}: ${aviso.dias_aviso} días ${habiles ? "hábiles" : "naturales"} antes del ${fechaLarga(finPeriodo)}.` +
        (habiles ? " Calculado de lunes a viernes, sin considerar días inhábiles oficiales." : "") +
        " Conviene enviarlo antes: el cómputo exacto depende de si se cuenta el día del aviso.",
      fecha: limite,
      regla: aviso.regla,
      dias_aviso: aviso.dias_aviso,
      clausula: aviso.clausula,
      cita: null,
      derivada: true,
    });
  }
  return salida;
}
