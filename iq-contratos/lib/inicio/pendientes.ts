import "server-only";
import { cache } from "react";
import { clienteSesion } from "@/lib/supabase/server";
import { hallazgosVigentes } from "@/lib/reportes/consultas";
import { permisos, type EstadoContrato, type Usuario } from "@/lib/tipos";

// Pendientes de cada perfil. Los usan el inicio y el menú lateral, así que se calculan
// una sola vez por solicitud y los dos muestran siempre las mismas cifras.

// Ventana de vencimientos que se considera "pendiente": vencidos y los próximos 30 días.
export const DIAS_VENCIMIENTOS = 30;

export const hoyMx = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
export const sumarDiasIso = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 864e5).toISOString().slice(0, 10);

export interface ContratoResumen {
  id: string;
  titulo: string;
  contraparte: string | null;
  estado: EstadoContrato;
  recibido_en: string;
  aprobado_en: string | null;
  firmado_en: string | null;
  responsable_id: string | null;
  solicitado_por: string | null;
  creado_por: string | null;
}

export interface Pendientes {
  legal: boolean;
  // Legal. El abogado ve lo suyo y lo que no tiene responsable; el director, todo.
  porRevisar: number;
  sinResponsable: number;
  altos: number;
  altosPorContrato: Map<string, number>;
  paraFirma: number;
  expedientes: number;
  vencimientos: number;
  // Contratos en curso dentro del alcance de quien consulta (para Negocio: los que pidió).
  enCurso: ContratoResumen[];
}

const COLUMNAS = "id, titulo, contraparte, estado, recibido_en, aprobado_en, firmado_en, responsable_id, solicitado_por, creado_por";

export const pendientes = cache(async (u: Usuario): Promise<Pendientes> => {
  const supabase = await clienteSesion();
  const legal = permisos.validar(u.rol);
  const { data } = await supabase.from("contracts").select(COLUMNAS).neq("estado", "firmado");
  const todos = (data ?? []) as ContratoResumen[];

  if (!legal) {
    const mios = todos.filter((c) => c.solicitado_por === u.id || c.creado_por === u.id);
    return { legal, porRevisar: 0, sinResponsable: 0, altos: 0, altosPorContrato: new Map(), paraFirma: 0, expedientes: 0, vencimientos: 0, enCurso: mios };
  }

  const director = u.rol === "director_juridico";
  const alcance = director ? todos : todos.filter((c) => c.responsable_id === u.id || !c.responsable_id);
  const ids = new Set(alcance.map((c) => c.id));
  const hoy = hoyMx();

  const [hallazgos, { count: expedientes }, { count: vencimientos }] = await Promise.all([
    hallazgosVigentes(supabase),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("estado", "por_validar"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("estado", "activa").lte("fecha_limite", sumarDiasIso(hoy, DIAS_VENCIMIENTOS)),
  ]);
  const altosPorContrato = new Map<string, number>();
  for (const h of hallazgos) {
    if (h.estado !== "pendiente" || h.riesgo !== "alto" || !ids.has(h.contract_id)) continue;
    altosPorContrato.set(h.contract_id, (altosPorContrato.get(h.contract_id) ?? 0) + 1);
  }

  return {
    legal,
    porRevisar: alcance.filter((c) => c.estado === "recibido" || c.estado === "en_revision").length,
    sinResponsable: todos.filter((c) => !c.responsable_id).length,
    altos: [...altosPorContrato.values()].reduce((a, b) => a + b, 0),
    altosPorContrato,
    paraFirma: alcance.filter((c) => c.estado === "aprobado").length,
    expedientes: expedientes ?? 0,
    vencimientos: vencimientos ?? 0,
    enCurso: alcance,
  };
});
