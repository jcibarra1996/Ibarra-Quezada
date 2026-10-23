import "server-only";
import { clienteSistema } from "@/lib/supabase/admin";
import { registrar } from "@/lib/log";
import { detalleErrorMifiel } from "./error-mifiel";

// Cliente mínimo de la API v1 de Mifiel (firma electrónica avanzada con e.firma y
// constancia de conservación NOM-151), según su especificación pública
// (docs.mifiel.com, OpenAPI 2026-06-01):
//  - Servidores: https://app.mifiel.com (producción) y https://app-sandbox.mifiel.com.
//  - Autenticación Basic con APP_ID:APP_SECRET.
//  - POST /api/v1/documents (multipart): file (PDF), signatories[i][name|email|tax_id],
//    external_id, send_invites, days_to_expire, message_for_signers.
//  - GET /api/v1/documents/{id}/state; GET /api/v1/documents/{id}/file_signed (PDF, 423
//    mientras no esté listo); GET /api/v1/documents/{id}/xml.
//  - POST /api/v1/webhooks {url, callback_type}.
// La llave nunca sale del servidor.

export type EntornoMifiel = "sandbox" | "produccion";

export class ErrorMifiel extends Error {
  constructor(
    mensaje: string,
    public estado?: number,
  ) {
    super(mensaje);
  }
}

export interface CredencialesMifiel {
  entorno: EntornoMifiel;
  appId: string;
  secreto: string;
  // Protege la URL de avisos; null si no hay.
  webhookClave: string | null;
}

// Las credenciales de cada organización viven cifradas en Supabase Vault (ver la migración
// de integraciones) y las administra la dirección jurídica desde Firmas. Las variables de
// entorno MIFIEL_* quedan como alternativa para una instalación de una sola organización.
export async function credencialesMifiel(orgId: string): Promise<CredencialesMifiel | null> {
  const { data } = await clienteSistema().rpc("credenciales_integracion", { p_org: orgId, p_proveedor: "mifiel" });
  const fila = (data as { entorno: string; app_id: string; secreto: string; webhook_clave: string }[] | null)?.[0];
  if (fila) return { entorno: fila.entorno === "produccion" ? "produccion" : "sandbox", appId: fila.app_id, secreto: fila.secreto, webhookClave: fila.webhook_clave };
  if (process.env.MIFIEL_APP_ID && process.env.MIFIEL_APP_SECRET) {
    return {
      entorno: process.env.MIFIEL_ENTORNO === "produccion" ? "produccion" : "sandbox",
      appId: process.env.MIFIEL_APP_ID,
      secreto: process.env.MIFIEL_APP_SECRET,
      webhookClave: process.env.MIFIEL_WEBHOOK_CLAVE ?? null,
    };
  }
  return null;
}

export async function exigirCredenciales(orgId: string): Promise<CredencialesMifiel> {
  const c = await credencialesMifiel(orgId);
  if (!c) throw new ErrorMifiel("Mifiel no está conectado. La dirección jurídica lo conecta desde Firmas.");
  return c;
}

export function urlBase(entorno: EntornoMifiel): string {
  return entorno === "produccion" ? "https://app.mifiel.com/api/v1" : "https://app-sandbox.mifiel.com/api/v1";
}

async function llamar(cred: CredencialesMifiel, ruta: string, init: RequestInit = {}): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(`${urlBase(cred.entorno)}${ruta}`, {
      ...init,
      headers: { Authorization: `Basic ${Buffer.from(`${cred.appId}:${cred.secreto}`).toString("base64")}`, Accept: "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new ErrorMifiel("No fue posible comunicarse con Mifiel. Intente de nuevo.");
  }
  if (r.status === 401) throw new ErrorMifiel("Mifiel rechazó las credenciales. Revise el APP_ID, el APP_SECRET y el ambiente (pruebas o producción).", 401);
  return r;
}

// Comprueba las credenciales contra la API antes de guardarlas.
export async function probarCredenciales(cred: Omit<CredencialesMifiel, "webhookClave">): Promise<void> {
  const r = await llamar({ ...cred, webhookClave: null }, "/webhooks");
  if (!r.ok) throw await errorDe(r, "Mifiel no aceptó las credenciales.");
}

async function errorDe(r: Response, porDefecto: string): Promise<ErrorMifiel> {
  const texto = await r.text().catch(() => "");
  let cuerpo: unknown = null;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    cuerpo = null;
  }
  const detalle = detalleErrorMifiel(cuerpo);
  // Solo el código y la razón de Mifiel; nunca el contenido del contrato.
  registrar("mifiel_rechazo", { estado: r.status, ruta: new URL(r.url || "http://x").pathname, detalle: detalle ?? (cuerpo ? null : texto.slice(0, 200)) });
  if (detalle) return new ErrorMifiel(`${porDefecto} Mifiel indica: ${detalle}`, r.status);
  return new ErrorMifiel(`${porDefecto} Mifiel respondió con el código ${r.status} sin dar la razón.`, r.status);
}

export interface Firmante {
  nombre: string;
  correo: string;
  rfc?: string | null;
  // Firmante de la propia empresa: puede firmar desde el portal con el componente de
  // Mifiel. No se manda a Mifiel.
  interno?: boolean;
}

export interface DocumentoMifiel {
  id: string;
  firmantes: { nombre: string; correo: string; rfc: string | null; widget_id: string | null; firmado: boolean }[];
}

export function formularioDocumento(p: { pdf: Buffer; nombreArchivo: string; firmantes: Firmante[]; externalId: string; mensaje?: string; diasParaVencer?: number }): FormData {
  const f = new FormData();
  f.append("file", new Blob([new Uint8Array(p.pdf)], { type: "application/pdf" }), p.nombreArchivo);
  p.firmantes.forEach((s, i) => {
    f.append(`signatories[${i}][name]`, s.nombre);
    f.append(`signatories[${i}][email]`, s.correo);
    if (s.rfc) f.append(`signatories[${i}][tax_id]`, s.rfc);
  });
  f.append("external_id", p.externalId);
  f.append("send_invites", "true");
  if (p.diasParaVencer) f.append("days_to_expire", String(p.diasParaVencer));
  if (p.mensaje) f.append("message_for_signers", p.mensaje);
  return f;
}

export async function crearDocumento(cred: CredencialesMifiel, p: Parameters<typeof formularioDocumento>[0]): Promise<DocumentoMifiel> {
  const r = await llamar(cred, "/documents", { method: "POST", body: formularioDocumento(p) });
  if (!r.ok) throw await errorDe(r, "Mifiel no aceptó el documento.");
  const d = (await r.json()) as { id: string; signers?: { name?: string; email?: string; tax_id?: string; widget_id?: string; signed?: boolean }[] };
  return {
    id: d.id,
    firmantes: (d.signers ?? []).map((s) => ({ nombre: s.name ?? "", correo: s.email ?? "", rfc: s.tax_id ?? null, widget_id: s.widget_id ?? null, firmado: Boolean(s.signed) })),
  };
}

export interface EstadoMifiel {
  estado: string;
  // Correos de quienes ya firmaron, según los grupos de firma del documento.
  firmaron: string[];
  rechazado: boolean;
}

export async function consultarEstado(cred: CredencialesMifiel, id: string): Promise<EstadoMifiel> {
  const r = await llamar(cred, `/documents/${encodeURIComponent(id)}/state`);
  if (!r.ok) throw await errorDe(r, "No fue posible consultar el documento en Mifiel.");
  const d = (await r.json()) as { state?: string; signing_groups?: { state?: string; stakeholders?: { email?: string; state?: string }[] }[] };
  const participantes = (d.signing_groups ?? []).flatMap((g) => g.stakeholders ?? []);
  return {
    estado: d.state ?? "",
    firmaron: participantes.filter((s) => /sign|complet|approv/i.test(s.state ?? "")).map((s) => (s.email ?? "").toLowerCase()),
    rechazado: participantes.some((s) => /reject/i.test(s.state ?? "")) || /reject/i.test(d.state ?? ""),
  };
}

// Regresa el PDF firmado, o null si Mifiel aún no lo tiene listo (423).
export async function descargarFirmado(cred: CredencialesMifiel, id: string, formato: "pdf" | "xml"): Promise<Buffer | null> {
  const r = await llamar(cred, `/documents/${encodeURIComponent(id)}/${formato === "pdf" ? "file_signed" : "xml"}`, {
    headers: { Accept: formato === "pdf" ? "application/pdf" : "application/xml" },
  });
  if (r.status === 423 || r.status === 404) return null;
  if (!r.ok) throw await errorDe(r, "No fue posible descargar el documento firmado.");
  return Buffer.from(await r.arrayBuffer());
}

export async function webhooksRegistrados(cred: CredencialesMifiel): Promise<{ url: string; callback_type: string }[]> {
  const r = await llamar(cred, "/webhooks");
  if (!r.ok) return [];
  const d = (await r.json().catch(() => [])) as unknown;
  return Array.isArray(d) ? (d as { url: string; callback_type: string }[]) : [];
}

export async function registrarWebhook(cred: CredencialesMifiel, url: string, tipo: "document_closed" | "signer_completed" | "signer_rejected") {
  const r = await llamar(cred, "/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, callback_type: tipo }) });
  if (!r.ok) throw await errorDe(r, "Mifiel no aceptó el aviso.");
}
