import "server-only";
import { randomUUID } from "node:crypto";
import { clienteSistema } from "@/lib/supabase/admin";
import { generarContrapropuesta } from "@/lib/docx/contrapropuesta";
import { fechaLarga } from "@/lib/fechas/calcular";
import { BUCKET } from "./registrar";
import type { Usuario } from "@/lib/tipos";

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
  return { id, cambios: validados.length, estadoPrevio: contrato.estado as string };
}
