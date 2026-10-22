import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { permisos } from "@/lib/tipos";
import { ErrorMifiel, registrarWebhook } from "@/lib/firmas/mifiel";

export const runtime = "nodejs";

// Registra en Mifiel los avisos de documento firmado y de rechazo, apuntando a este portal.
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.editarPlaybook(usuario.rol)) return NextResponse.json({ error: "Solo la dirección jurídica conecta los avisos." }, { status: 403 });
  const clave = process.env.MIFIEL_WEBHOOK_CLAVE ?? "";
  if (clave.length < 16) return NextResponse.json({ error: "Falta MIFIEL_WEBHOOK_CLAVE (16 caracteres o más) en las variables de entorno." }, { status: 422 });
  const origen = new URL(request.url).origin;
  const url = `${origen}/api/firmas/mifiel?clave=${encodeURIComponent(clave)}`;
  try {
    await registrarWebhook(url, "document_closed");
    await registrarWebhook(url, "signer_completed");
    await registrarWebhook(url, "signer_rejected");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ErrorMifiel ? e.message : "No fue posible registrar los avisos." }, { status: 502 });
  }
}
