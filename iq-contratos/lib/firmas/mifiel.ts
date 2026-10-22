import "server-only";

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

export function mifielConfigurado(): boolean {
  return Boolean(process.env.MIFIEL_APP_ID && process.env.MIFIEL_APP_SECRET);
}

export function entornoMifiel(): EntornoMifiel {
  return process.env.MIFIEL_ENTORNO === "produccion" ? "produccion" : "sandbox";
}

export function urlBase(entorno: EntornoMifiel = entornoMifiel()): string {
  return entorno === "produccion" ? "https://app.mifiel.com/api/v1" : "https://app-sandbox.mifiel.com/api/v1";
}

function autorizacion(): string {
  const id = process.env.MIFIEL_APP_ID;
  const secreto = process.env.MIFIEL_APP_SECRET;
  if (!id || !secreto) throw new ErrorMifiel("Mifiel no está configurado. Agregue MIFIEL_APP_ID y MIFIEL_APP_SECRET en las variables de entorno.");
  return `Basic ${Buffer.from(`${id}:${secreto}`).toString("base64")}`;
}

async function llamar(ruta: string, init: RequestInit = {}): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(`${urlBase()}${ruta}`, { ...init, headers: { Authorization: autorizacion(), Accept: "application/json", ...(init.headers ?? {}) } });
  } catch {
    throw new ErrorMifiel("No fue posible comunicarse con Mifiel. Intente de nuevo.");
  }
  if (r.status === 401) throw new ErrorMifiel("Mifiel rechazó las credenciales. Revise MIFIEL_APP_ID, MIFIEL_APP_SECRET y el entorno.", 401);
  return r;
}

async function errorDe(r: Response, porDefecto: string): Promise<ErrorMifiel> {
  const cuerpo = (await r.json().catch(() => null)) as { errors?: { details?: string; title?: string }[] } | null;
  const detalle = cuerpo?.errors?.map((e) => e.details || e.title).filter(Boolean).join(" ");
  return new ErrorMifiel(detalle ? `${porDefecto} Mifiel indica: ${detalle}` : porDefecto, r.status);
}

export interface Firmante {
  nombre: string;
  correo: string;
  rfc?: string | null;
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

export async function crearDocumento(p: Parameters<typeof formularioDocumento>[0]): Promise<DocumentoMifiel> {
  const r = await llamar("/documents", { method: "POST", body: formularioDocumento(p) });
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

export async function consultarEstado(id: string): Promise<EstadoMifiel> {
  const r = await llamar(`/documents/${encodeURIComponent(id)}/state`);
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
export async function descargarFirmado(id: string, formato: "pdf" | "xml"): Promise<Buffer | null> {
  const r = await llamar(`/documents/${encodeURIComponent(id)}/${formato === "pdf" ? "file_signed" : "xml"}`, {
    headers: { Accept: formato === "pdf" ? "application/pdf" : "application/xml" },
  });
  if (r.status === 423 || r.status === 404) return null;
  if (!r.ok) throw await errorDe(r, "No fue posible descargar el documento firmado.");
  return Buffer.from(await r.arrayBuffer());
}

export async function registrarWebhook(url: string, tipo: "document_closed" | "signer_completed" | "signer_rejected") {
  const r = await llamar("/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, callback_type: tipo }) });
  if (!r.ok) throw await errorDe(r, "Mifiel no aceptó el aviso.");
}
