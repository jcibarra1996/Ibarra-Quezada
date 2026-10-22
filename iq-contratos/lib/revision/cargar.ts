import "server-only";
import { notFound } from "next/navigation";
import { clienteSesion } from "@/lib/supabase/server";
import type { EstadoHallazgo, Riesgo } from "@/lib/tipos";

export interface Hallazgo {
  id: string;
  numero: number;
  tipo: "desviacion_playbook" | "ajena_al_objeto" | "omision";
  clausula: string;
  tema: string;
  riesgo: Riesgo;
  cita: string | null;
  cita_inicio: number | null;
  cita_fin: number | null;
  section_id: string | null;
  explicacion: string;
  redaccion_propuesta: string;
  referencias_normativas: string[];
  estado: EstadoHallazgo;
  texto_final: string | null;
  decidido_por: string | null;
  decidido_en: string | null;
}

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
  const { data: comentarios } = await supabase
    .from("comments")
    .select("id, autor_id, audiencia, cuerpo, creado_en, finding_id")
    .eq("contract_id", contratoId)
    .order("creado_en", { ascending: false });
  const { data: contrapropuestas } = await supabase
    .from("counterproposals")
    .select("id, generado_por, creado_en, hallazgos_incluidos")
    .eq("contract_id", contratoId)
    .order("creado_en", { ascending: false });

  const version = versiones?.find((v) => v.id === contrato.version_actual_id) ?? null;

  // Último análisis de la versión vigente, con sus hallazgos.
  const { data: analisis } = version
    ? await supabase
        .from("analyses")
        .select("id, estado, modelo, resumen_negocio, tipo_detectado, objeto_detectado, hallazgos_descartados_sin_cita, error, creado_en, duracion_ms")
        .eq("version_id", version.id)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const { data: hallazgos } = analisis
    ? await supabase
        .from("findings")
        .select("id, numero, tipo, clausula, tema, riesgo, cita, cita_inicio, cita_fin, section_id, explicacion, redaccion_propuesta, referencias_normativas, estado, texto_final, decidido_por, decidido_en")
        .eq("analysis_id", analisis.id)
        .order("numero")
    : { data: [] };

  return {
    analisis: analisis ?? null,
    hallazgos: (hallazgos ?? []) as Hallazgo[],
    contrato,
    version,
    versiones: versiones ?? [],
    contrapropuestas: contrapropuestas ?? [],
    comentarios: comentarios ?? [],
    secciones: secciones ?? [],
    historial: historial ?? [],
    perfiles: Object.fromEntries((perfiles ?? []).map((p) => [p.id, p])) as Record<string, { id: string; nombre: string; rol: string }>,
  };
}
