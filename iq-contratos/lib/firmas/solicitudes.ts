import "server-only";
import { clienteSistema } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/contratos/registrar";
import { recogerSubida, descartarSubida } from "@/lib/subidas";
import { registrar } from "@/lib/log";
import { consultarEstado, crearDocumento, descargarFirmado, ErrorMifiel, exigirCredenciales, type Firmante } from "./mifiel";
import type { Usuario } from "@/lib/tipos";

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export function validarFirmantes(lista: Firmante[]): Firmante[] {
  const limpios = lista
    .map((f) => ({ nombre: f.nombre.trim().slice(0, 200), correo: f.correo.trim().toLowerCase().slice(0, 200), rfc: f.rfc?.trim().toUpperCase() || null }))
    .filter((f) => f.nombre || f.correo);
  if (limpios.length === 0) throw new ErrorMifiel("Agregue al menos un firmante.");
  if (limpios.length > 10) throw new ErrorMifiel("Máximo diez firmantes por documento.");
  for (const f of limpios) {
    if (!f.nombre) throw new ErrorMifiel("Cada firmante necesita su nombre completo.");
    if (!RE_CORREO.test(f.correo)) throw new ErrorMifiel(`El correo de ${f.nombre} no es válido.`);
    if (f.rfc && !RE_RFC.test(f.rfc)) throw new ErrorMifiel(`El RFC de ${f.nombre} no tiene el formato esperado.`);
  }
  if (new Set(limpios.map((f) => f.correo)).size !== limpios.length) throw new ErrorMifiel("Hay correos repetidos entre los firmantes.");
  return limpios;
}

// Envía a Mifiel el PDF final de un contrato aprobado. Mifiel manda las invitaciones.
// El llamador ya verificó que el usuario es de Legal.
export async function enviarAFirma(p: { usuario: Usuario; contratoId: string; rutaTemporal: string | null; nombreArchivo: string | null; firmantes: Firmante[] }) {
  const firmantes = validarFirmantes(p.firmantes);
  const db = clienteSistema();
  const org = p.usuario.org_id;
  const cred = await exigirCredenciales(org);
  const { data: contrato } = await db
    .from("contracts")
    .select("id, titulo, estado, version_actual_id, contract_versions!contract_versions_contract_id_fkey(id, mime, storage_path, nombre_archivo)")
    .eq("id", p.contratoId)
    .eq("org_id", org)
    .maybeSingle();
  if (!contrato) throw new ErrorMifiel("Contrato no encontrado.");
  if (contrato.estado !== "aprobado") throw new ErrorMifiel("Solo un contrato aprobado por Legal se envía a firma.");
  const { data: abiertas } = await db.from("signature_requests").select("id").eq("contract_id", contrato.id).eq("estado", "enviado").limit(1);
  if (abiertas?.length) throw new ErrorMifiel("Este contrato ya está en firma. Actualice su estado o espere a que concluya.");

  let pdf: Buffer;
  let nombre: string;
  if (p.rutaTemporal) {
    pdf = await recogerSubida(p.usuario, p.rutaTemporal);
    nombre = p.nombreArchivo ?? `${contrato.titulo}.pdf`;
  } else {
    const versiones = (contrato.contract_versions ?? []) as { id: string; mime: string; storage_path: string; nombre_archivo: string }[];
    const vigente = versiones.find((v) => v.id === contrato.version_actual_id);
    if (!vigente || vigente.mime !== "application/pdf") throw new ErrorMifiel("Mifiel firma archivos PDF. Cargue el PDF final del contrato.");
    const { data } = await db.storage.from(BUCKET).download(vigente.storage_path);
    if (!data) throw new ErrorMifiel("No se encontró el archivo del contrato.");
    pdf = Buffer.from(await data.arrayBuffer());
    nombre = vigente.nombre_archivo;
  }
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new ErrorMifiel("Mifiel firma archivos PDF. El archivo cargado no es un PDF.");
  if (!/\.pdf$/i.test(nombre)) nombre = `${nombre.replace(/\.[a-z0-9]+$/i, "")}.pdf`;

  const solicitudId = crypto.randomUUID();
  const ruta = `${org}/${contrato.id}/firma/${solicitudId}.pdf`;
  const subida = await db.storage.from(BUCKET).upload(ruta, pdf, { contentType: "application/pdf", upsert: false });
  if (subida.error) throw new Error("No se pudo guardar el PDF para firma.");
  if (p.rutaTemporal) await descartarSubida(p.rutaTemporal);

  const doc = await crearDocumento(cred, {
    pdf,
    nombreArchivo: nombre,
    firmantes,
    externalId: solicitudId,
    diasParaVencer: 30,
    mensaje: `${contrato.titulo}. Documento enviado a firma por la dirección legal.`,
  });
  const { error } = await db.from("signature_requests").insert({
    id: solicitudId,
    org_id: org,
    contract_id: contrato.id,
    entorno: cred.entorno,
    externo_id: doc.id,
    firmantes: firmantes.map((f) => {
      const s = doc.firmantes.find((x) => x.correo.toLowerCase() === f.correo);
      return { ...f, widget_id: s?.widget_id ?? null, firmado: false };
    }),
    archivo_path: ruta,
    enviado_por: p.usuario.id,
  });
  if (error) throw new Error("Mifiel recibió el documento, pero no se pudo registrar la solicitud.");
  await db.from("audit_events").insert({
    org_id: org,
    contract_id: contrato.id,
    actor_id: p.usuario.id,
    accion: "firma_enviada",
    detalle: { proveedor: "mifiel", firmantes: firmantes.length, entorno: cred.entorno },
  });
  registrar("firma_enviada", { org, contrato: contrato.id, solicitud: solicitudId });
  return { solicitudId };
}

// Consulta a Mifiel y, si el documento ya tiene todas las firmas y su constancia NOM-151,
// guarda el PDF y el XML firmados y marca el contrato como firmado. No confía en el aviso
// del webhook: siempre pregunta a la API.
export async function actualizarFirma(p: { orgId: string; solicitudId: string; actorId: string | null }) {
  const db = clienteSistema();
  const { data: s } = await db.from("signature_requests").select("*").eq("id", p.solicitudId).eq("org_id", p.orgId).maybeSingle();
  if (!s) throw new ErrorMifiel("Solicitud de firma no encontrada.");
  if (s.estado !== "enviado" || !s.externo_id) return { estado: s.estado as string };

  const cred = await exigirCredenciales(p.orgId);
  const estado = await consultarEstado(cred, s.externo_id);
  const firmantes = (s.firmantes as { correo: string; firmado: boolean }[]).map((f) => ({ ...f, firmado: f.firmado || estado.firmaron.includes(f.correo) }));
  if (estado.rechazado) {
    await db.from("signature_requests").update({ estado: "rechazado", firmantes, actualizado_en: new Date().toISOString() }).eq("id", s.id);
    await db.from("audit_events").insert({ org_id: p.orgId, contract_id: s.contract_id, actor_id: p.actorId, accion: "firma_rechazada", detalle: { proveedor: "mifiel" } });
    return { estado: "rechazado" };
  }

  const pdf = await descargarFirmado(cred, s.externo_id, "pdf");
  if (!pdf) {
    await db.from("signature_requests").update({ firmantes, actualizado_en: new Date().toISOString() }).eq("id", s.id);
    return { estado: "enviado", firmaron: firmantes.filter((f) => f.firmado).length, total: firmantes.length };
  }
  const xml = await descargarFirmado(cred, s.externo_id, "xml");
  const base = `${p.orgId}/${s.contract_id}/firma/${s.id}`;
  await db.storage.from(BUCKET).upload(`${base}-firmado.pdf`, pdf, { contentType: "application/pdf", upsert: true });
  if (xml) await db.storage.from(BUCKET).upload(`${base}-firmado.xml`, xml, { contentType: "application/xml", upsert: true });
  await db
    .from("signature_requests")
    .update({
      estado: "firmado",
      firmantes: firmantes.map((f) => ({ ...f, firmado: true })),
      firmado_pdf_path: `${base}-firmado.pdf`,
      firmado_xml_path: xml ? `${base}-firmado.xml` : null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", s.id);
  const { data: contrato } = await db.from("contracts").select("estado").eq("id", s.contract_id).single();
  if (contrato?.estado === "aprobado") await db.from("contracts").update({ estado: "firmado", firmado_en: new Date().toISOString() }).eq("id", s.contract_id);
  await db.from("audit_events").insert({
    org_id: p.orgId,
    contract_id: s.contract_id,
    actor_id: p.actorId,
    accion: "firma_completada",
    detalle: { proveedor: "mifiel", con_constancia: Boolean(xml) },
  });
  registrar("firma_completada", { org: p.orgId, contrato: s.contract_id, solicitud: s.id });
  return { estado: "firmado" };
}
