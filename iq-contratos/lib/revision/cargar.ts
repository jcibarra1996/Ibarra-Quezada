import "server-only";
import { notFound } from "next/navigation";
import { clienteSesion } from "@/lib/supabase/server";

// Todo lo que necesita la vista de revisión, leído con la sesión del usuario (RLS).
export async function cargarRevision(contratoId: string) {
  const supabase = await clienteSesion();
  const { data: contrato } = await supabase
    .from("contracts")
    .select("*, areas:area_responsable_id(id, nombre)")
    .eq("id", contratoId)
    .maybeSingle();
  if (!contrato) notFound();

  const [{ data: versiones }, { data: secciones }, { data: historial }, { data: perfiles }] = await Promise.all([
    supabase
      .from("contract_versions")
      .select("id, numero, origen, nombre_archivo, mime, tamano_bytes, paginas, paginas_virtuales, creado_por, creado_en")
      .eq("contract_id", contratoId)
      .order("numero", { ascending: false }),
    contrato.version_actual_id
      ? supabase
          .from("contract_sections")
          .select("id, tipo, etiqueta, titulo, texto, inicio, fin, pagina")
          .eq("version_id", contrato.version_actual_id)
          .order("orden")
      : Promise.resolve({ data: [] }),
    supabase.from("audit_events").select("id, accion, detalle, actor_id, creado_en").eq("contract_id", contratoId).order("creado_en", { ascending: false }).limit(200),
    supabase.from("profiles").select("id, nombre, rol"),
  ]);

  const version = versiones?.find((v) => v.id === contrato.version_actual_id) ?? null;
  return {
    contrato,
    version,
    versiones: versiones ?? [],
    secciones: secciones ?? [],
    historial: historial ?? [],
    perfiles: Object.fromEntries((perfiles ?? []).map((p) => [p.id, p])) as Record<string, { id: string; nombre: string; rol: string }>,
  };
}
