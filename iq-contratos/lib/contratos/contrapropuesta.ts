import "server-only";
import { randomUUID } from "node:crypto";
import { clienteSistema } from "@/lib/supabase/admin";
import { clienteSesion } from "@/lib/supabase/server";
import { generarContrapropuesta } from "@/lib/docx/contrapropuesta";
import { fechaLarga } from "@/lib/fechas/calcular";
import { registrarError } from "@/lib/log";
import { abreNegociacion, permisos, type Usuario } from "@/lib/tipos";
import { BUCKET } from "./registrar";
import { registrarAcceso } from "./bitacora";

export class ErrorContrapropuesta extends Error {}

// Arma la contrapropuesta con los hallazgos aceptados o editados del análisis vigente.
export async function crearContrapropuesta(usuario: Usuario, contratoId: string) {
  const db = clienteSistema();
  const { data: contrato } = await db
    .from("contracts")
    .select("id, org_id, estado, version_actual_id, organizations(nombre)")
    .eq("id", contratoId)
    .eq("org_id", usuario.org_id)
    .single();
  if (!contrato?.version_actual_id) throw new ErrorContrapropuesta("El contrato no tiene documento.");

  const { data: analisis } = await db
    .from("analyses")
    .select("id")
    .eq("version_id", contrato.version_actual_id)
    .eq("estado", "completado")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!analisis) throw new ErrorContrapropuesta("El contrato todavía no tiene análisis.");

  const [{ data: secciones }, { data: hallazgos }, { data: perfiles }] = await Promise.all([
    db.from("contract_sections").select("tipo, etiqueta, titulo, texto, inicio, fin").eq("version_id", contrato.version_actual_id).order("orden"),
    db
      .from("findings")
      .select("id, tipo, cita_inicio, cita_fin, texto_final, estado, decidido_por, decidido_en")
      .eq("analysis_id", analisis.id)
      .in("estado", ["aceptado", "editado"])
      .order("numero"),
    db.from("profiles").select("id, nombre").eq("org_id", usuario.org_id),
  ]);
  const validados = hallazgos ?? [];
  if (validados.length === 0) throw new ErrorContrapropuesta("No hay cambios aceptados o editados para incluir.");

  const autor = (id: string | null) => perfiles?.find((p) => p.id === id)?.nombre ?? "Dirección legal";
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const organizacion = (contrato.organizations as unknown as { nombre: string } | null)?.nombre ?? "";

  const buffer = await generarContrapropuesta({
    secciones: secciones ?? [],
    cambios: validados
      .filter((h) => h.tipo !== "omision" && h.cita_inicio !== null && h.cita_fin !== null)
      .map((h) => ({ inicio: h.cita_inicio!, fin: h.cita_fin!, nuevo: h.texto_final ?? "", autor: autor(h.decidido_por), fecha: h.decidido_en ?? new Date().toISOString() })),
    clausulasNuevas: validados
      .filter((h) => h.tipo === "omision" && h.texto_final)
      .map((h) => ({ texto: h.texto_final!, autor: autor(h.decidido_por), fecha: h.decidido_en ?? new Date().toISOString() })),
    organizacion,
    fecha: fechaLarga(hoy),
  });

  const id = randomUUID();
  const ruta = `${usuario.org_id}/${contrato.id}/contrapropuesta-${id}.docx`;
  const subida = await db.storage
    .from(BUCKET)
    .upload(ruta, buffer, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  if (subida.error) throw new ErrorContrapropuesta("No se pudo guardar la contrapropuesta.");

  await db.from("counterproposals").insert({
    id,
    org_id: usuario.org_id,
    contract_id: contrato.id,
    version_id: contrato.version_actual_id,
    storage_path: ruta,
    hallazgos_incluidos: validados.map((h) => h.id),
    generado_por: usuario.id,
  });
  await db.from("audit_events").insert({
    org_id: usuario.org_id,
    contract_id: contrato.id,
    actor_id: usuario.id,
    accion: "contrapropuesta_generada",
    detalle: { cambios: validados.length },
  });
  return { id, cambios: validados.length };
}

// Descarga de una contrapropuesta: enlace firmado de 5 minutos y registro en bitácora.
// Cuando la descarga Legal, queda marcada como descargada y el contrato pasa a En
// negociación; ese cambio se hace con la sesión del usuario para que el historial
// registre quién lo movió.
export async function descargarContrapropuesta(usuario: Usuario, id: string) {
  const supabase = await clienteSesion();
  const { data: cp } = await supabase
    .from("counterproposals")
    .select("id, contract_id, storage_path, creado_en, descargada_en, contracts(titulo, estado)")
    .eq("id", id)
    .maybeSingle();
  if (!cp) throw new ErrorContrapropuesta("Documento no encontrado.");

  const contrato = cp.contracts as unknown as { titulo: string; estado: string } | null;
  const nombre = `Contrapropuesta - ${contrato?.titulo ?? "Contrato"} - ${cp.creado_en.slice(0, 10)}.docx`.replace(/[\\/:*?"<>|]/g, "");
  const db = clienteSistema();
  const { data: firmado, error } = await db.storage.from(BUCKET).createSignedUrl(cp.storage_path, 300, { download: nombre });
  if (error || !firmado) throw new Error("No fue posible generar el enlace de la contrapropuesta.");
  await registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "descargar", contrapropuestaId: cp.id });

  let estado = contrato?.estado ?? null;
  if (permisos.validar(usuario.rol)) {
    if (!cp.descargada_en) {
      await db.from("counterproposals").update({ descargada_en: new Date().toISOString(), descargada_por: usuario.id }).eq("id", cp.id);
    }
    if (estado && abreNegociacion(estado)) {
      const { error: e } = await supabase.from("contracts").update({ estado: "en_negociacion" }).eq("id", cp.contract_id);
      if (e) registrarError("negociacion_no_marcada", e, { contrato: cp.contract_id });
      else estado = "en_negociacion";
    }
  }
  return { url: firmado.signedUrl, estado };
}
