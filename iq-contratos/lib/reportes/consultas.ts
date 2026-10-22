import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Hallazgos del análisis vigente (el más reciente completado de la versión actual) de cada contrato.
export async function hallazgosVigentes(supabase: SupabaseClient) {
  const [{ data: contratos }, { data: analisis }] = await Promise.all([
    supabase.from("contracts").select("id, version_actual_id"),
    supabase.from("analyses").select("id, version_id, creado_en").eq("estado", "completado").order("creado_en", { ascending: false }),
  ]);
  const versiones = new Set((contratos ?? []).map((c) => c.version_actual_id));
  const vigentes = new Map<string, string>();
  for (const a of analisis ?? []) if (versiones.has(a.version_id) && !vigentes.has(a.version_id)) vigentes.set(a.version_id, a.id);
  if (vigentes.size === 0) return [];
  const { data } = await supabase.from("findings").select("contract_id, tema, riesgo, estado").in("analysis_id", [...vigentes.values()]);
  return data ?? [];
}
