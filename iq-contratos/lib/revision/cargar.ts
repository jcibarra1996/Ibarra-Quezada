import "server-only";
import { notFound } from "next/navigation";
import { clienteSesion } from "@/lib/supabase/server";
import type { EstadoHallazgo, Riesgo } from "@/lib/tipos";

export interface Hallazgo {
  id: string;
  numero: number;
  tipo: "desviacion_playbook" | "ajena_al_objeto" | "dato_corporativo" | "omision";
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
// Las consultas van en dos tandas en paralelo para no encadenar viajes a la base.
export async function cargarRevision(contratoId: string) {
  const supabase = await clienteSesion();
  const [{ data: contrato }, { data: versiones }, { data: historial }, { data: perfiles }, { data: comentarios }, { data: contrapropuestas }, { data: firmas }] =
    await Promise.all([
      supabase.from("contracts").select("*, areas:area_responsable_id(id, nombre)").eq("id", contratoId).maybeSingle(),
      supabase
        .from("contract_versions")
        .select("id, numero, origen, nombre_archivo, mime, tamano_bytes, paginas, paginas_virtuales, creado_por, creado_en")
        .eq("contract_id", contratoId)
        .order("numero", { ascending: false }),
      supabase.from("audit_events").select("id, accion, detalle, actor_id, creado_en").eq("contract_id", contratoId).order("creado_en", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, nombre, rol"),
      supabase.from("comments").select("id, autor_id, audiencia, cuerpo, creado_en, finding_id").eq("contract_id", contratoId).order("creado_en", { ascending: false }),
      supabase.from("counterproposals").select("id, generado_por, creado_en, hallazgos_incluidos, descargada_en, descargada_por").eq("contract_id", contratoId).order("creado_en", { ascending: false }),
      supabase
        .from("signature_requests")
        .select("id, estado, entorno, firmantes, firmado_pdf_path, firmado_xml_path, error, enviado_por, creado_en, actualizado_en")
        .eq("contract_id", contratoId)
        .order("creado_en", { ascending: false }),
    ]);
  if (!contrato) notFound();

  const version = versiones?.find((v) => v.id === contrato.version_actual_id) ?? null;

  // Secciones y último análisis de la versión vigente, con sus hallazgos.
  const [{ data: secciones }, { data: analisisConHallazgos }] = version
    ? await Promise.all([
        supabase.from("contract_sections").select("id, tipo, etiqueta, titulo, texto, inicio, fin, pagina").eq("version_id", version.id).order("orden"),
        supabase
          .from("analyses")
          .select(
            "id, estado, modelo, resumen_negocio, tipo_detectado, objeto_detectado, hallazgos_descartados_sin_cita, error, creado_en, duracion_ms, findings(id, numero, tipo, clausula, tema, riesgo, cita, cita_inicio, cita_fin, section_id, explicacion, redaccion_propuesta, referencias_normativas, estado, texto_final, decidido_por, decidido_en)",
          )
          .eq("version_id", version.id)
          .order("creado_en", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];
  const { findings, ...analisis } = (analisisConHallazgos ?? { findings: [] }) as { findings: Hallazgo[] } & Record<string, unknown>;
  const hallazgos = [...(findings ?? [])].sort((a, b) => a.numero - b.numero);

  return {
    analisis: analisisConHallazgos ? (analisis as unknown as AnalisisCargado) : null,
    hallazgos,
    contrato,
    version,
    versiones: versiones ?? [],
    contrapropuestas: contrapropuestas ?? [],
    firmas: (firmas ?? []) as SolicitudFirma[],
    comentarios: comentarios ?? [],
    secciones: secciones ?? [],
    historial: historial ?? [],
    perfiles: Object.fromEntries((perfiles ?? []).map((p) => [p.id, p])) as Record<string, { id: string; nombre: string; rol: string }>,
  };
}

export interface AnalisisCargado {
  id: string;
  estado: string;
  modelo: string;
  resumen_negocio: string | null;
  tipo_detectado: string | null;
  objeto_detectado: string | null;
  hallazgos_descartados_sin_cita: number;
  error: string | null;
  creado_en: string;
  duracion_ms: number | null;
}

export interface SolicitudFirma {
  id: string;
  estado: "enviado" | "firmado" | "rechazado" | "cancelado" | "error";
  entorno: string;
  firmantes: { nombre: string; correo: string; rfc: string | null; firmado: boolean; widget_id: string | null }[];
  firmado_pdf_path: string | null;
  firmado_xml_path: string | null;
  error: string | null;
  enviado_por: string | null;
  creado_en: string;
  actualizado_en: string;
}
