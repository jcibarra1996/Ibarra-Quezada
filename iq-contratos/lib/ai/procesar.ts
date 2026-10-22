// Convierte la salida del modelo en registros listos para guardar. Es una función pura:
// valida con zod, ubica cada cita en el texto, descarta lo que no se pueda ubicar
// y calcula fechas derivadas. Se prueba sin llamar a la API.

import { AnalisisSchema, type Analisis } from "./esquema";
import { localizarCita } from "./verificar-citas";
import { derivarFechas, type FechaClave } from "@/lib/fechas/calcular";
import type { Riesgo, TipoContrato } from "@/lib/tipos";

export interface SeccionRef {
  id: string;
  etiqueta: string;
  inicio: number;
  fin: number;
}

export interface HallazgoListo {
  numero: number;
  tipo: "desviacion_playbook" | "ajena_al_objeto" | "omision";
  clausula: string;
  tema: string;
  posicion_id: string | null;
  riesgo: Riesgo;
  section_id: string | null;
  cita: string | null;
  cita_inicio: number | null;
  cita_fin: number | null;
  explicacion: string;
  redaccion_propuesta: string;
  referencias_normativas: string[];
}

export interface AnalisisListo {
  tipo_contrato: TipoContrato;
  objeto: string;
  contraparte: string | null;
  resumen_negocio: string;
  hallazgos: HallazgoListo[];
  descartados_sin_cita: number;
  fechas: FechaClave[];
  riesgo_max: Riesgo | null;
}

export class ErrorSalidaModelo extends Error {}

const ORDEN_RIESGO: Record<Riesgo, number> = { alto: 3, medio: 2, bajo: 1 };

// El texto para personas no lleva rayas largas; las citas no se tocan porque deben
// coincidir con el contrato.
export function sinRayas(s: string): string {
  return s.replace(/\s*[—―]\s*/g, ", ").replace(/,\s*,/g, ",").trim();
}

function etiquetaComparable(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/^CLAUSULA\s+/, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validarSalida(crudo: unknown): Analisis {
  const r = AnalisisSchema.safeParse(crudo);
  if (!r.success) throw new ErrorSalidaModelo("La respuesta del modelo no cumple el esquema esperado.");
  return r.data;
}

export function procesarAnalisis(p: {
  salida: unknown;
  texto: string;
  secciones: SeccionRef[];
  posicionesValidas: Set<string>;
  hoy: string;
}): AnalisisListo {
  const a = validarSalida(p.salida);
  const posicion = (id: string | null) => (id && p.posicionesValidas.has(id) ? id : null);
  const seccionDe = (offset: number) => p.secciones.find((s) => s.inicio <= offset && offset < s.fin) ?? null;

  let descartados = 0;
  const ubicados: HallazgoListo[] = [];
  for (const h of a.hallazgos) {
    const etiqueta = etiquetaComparable(h.clausula);
    const seccion = p.secciones.find((s) => etiquetaComparable(s.etiqueta) === etiqueta);
    const lugar = localizarCita(p.texto, h.cita_textual, seccion ? { inicio: seccion.inicio, fin: seccion.fin } : undefined);
    if (!lugar) {
      descartados++;
      continue;
    }
    // Dos hallazgos sobre exactamente el mismo fragmento: se conserva el de mayor riesgo.
    const repetido = ubicados.find((u) => u.cita_inicio === lugar.inicio && u.cita_fin === lugar.fin);
    if (repetido) {
      if (ORDEN_RIESGO[h.nivel_riesgo] <= ORDEN_RIESGO[repetido.riesgo]) continue;
      ubicados.splice(ubicados.indexOf(repetido), 1);
    }
    const real = seccionDe(lugar.inicio);
    ubicados.push({
      numero: 0,
      tipo: h.tipo,
      clausula: real?.etiqueta ?? h.clausula,
      tema: sinRayas(h.tema),
      posicion_id: posicion(h.posicion_playbook_id),
      riesgo: h.nivel_riesgo,
      section_id: real?.id ?? null,
      cita: p.texto.slice(lugar.inicio, lugar.fin),
      cita_inicio: lugar.inicio,
      cita_fin: lugar.fin,
      explicacion: sinRayas(h.explicacion),
      redaccion_propuesta: h.redaccion_propuesta.trim(),
      referencias_normativas: h.referencias_normativas.map((r) => r.trim()).filter(Boolean),
    });
  }
  ubicados.sort((x, y) => (x.cita_inicio ?? 0) - (y.cita_inicio ?? 0));

  const omisiones: HallazgoListo[] = a.omisiones.map((o) => ({
    numero: 0,
    tipo: "omision",
    clausula: "Cláusula nueva",
    tema: sinRayas(o.tema),
    posicion_id: posicion(o.posicion_playbook_id),
    riesgo: o.nivel_riesgo,
    section_id: null,
    cita: null,
    cita_inicio: null,
    cita_fin: null,
    explicacion: sinRayas(o.explicacion),
    redaccion_propuesta: o.clausula_propuesta.trim(),
    referencias_normativas: [],
  }));

  const hallazgos = [...ubicados, ...omisiones].map((h, i) => ({ ...h, numero: i + 1 }));

  // Las fechas también deben salir del texto: si su cita no aparece, no se usan.
  const fechasVerificadas = a.fechas_clave.filter((f) => localizarCita(p.texto, f.cita_textual) !== null);

  const riesgo_max = hallazgos.reduce<Riesgo | null>(
    (max, h) => (!max || ORDEN_RIESGO[h.riesgo] > ORDEN_RIESGO[max] ? h.riesgo : max),
    null,
  );

  return {
    tipo_contrato: a.clasificacion.tipo_contrato,
    objeto: sinRayas(a.clasificacion.objeto),
    contraparte: a.clasificacion.contraparte?.trim() || null,
    resumen_negocio: sinRayas(a.resumen_negocio),
    hallazgos,
    descartados_sin_cita: descartados,
    fechas: derivarFechas(fechasVerificadas, p.hoy),
    riesgo_max,
  };
}
