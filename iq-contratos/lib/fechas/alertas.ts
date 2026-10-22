import type { SupabaseClient } from "@supabase/supabase-js";

interface FechaGuardada {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string | null;
  derivada: boolean;
}

// Avisos programados (días antes de la fecha límite) según el tipo de fecha.
export const AVISOS_POR_TIPO: Record<string, number[]> = {
  plazo_aviso: [30, 15, 7, 1],
  fin_vigencia: [90, 60, 30],
  vencimiento: [90, 60, 30],
};

const TITULOS: Record<string, string> = {
  plazo_aviso: "Fecha límite de aviso",
  fin_vigencia: "Fin de vigencia",
  vencimiento: "Vencimiento",
};

// Una alerta por cada fecha futura que exige una acción. Se asigna al área responsable del contrato.
export function alertasDeFechas(fechas: FechaGuardada[], hoy: string) {
  return fechas
    .filter((f) => f.fecha && f.fecha >= hoy && f.tipo in AVISOS_POR_TIPO)
    .map((f) => ({ key_date_id: f.id, titulo: TITULOS[f.tipo], fecha_limite: f.fecha!, avisos_dias: AVISOS_POR_TIPO[f.tipo] }));
}

export async function generarAlertas(
  db: SupabaseClient,
  p: { orgId: string; contratoId: string; areaId: string | null; fechas: FechaGuardada[] },
) {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const filas = alertasDeFechas(p.fechas, hoy).map((a) => ({
    ...a,
    org_id: p.orgId,
    contract_id: p.contratoId,
    area_id: p.areaId,
    correo_activo: false,
  }));
  if (filas.length) await db.from("alerts").insert(filas);
}
