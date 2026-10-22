import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { permisos } from "@/lib/tipos";
import { enviarAFirma } from "@/lib/firmas/solicitudes";
import { ErrorMifiel } from "@/lib/firmas/mifiel";
import { ErrorSubida } from "@/lib/subidas";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

// Envía el contrato aprobado a firma electrónica con Mifiel. Solo Legal.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.validar(usuario.rol)) return NextResponse.json({ error: "Solo Legal envía contratos a firma." }, { status: 403 });
  const { id } = await params;
  const cuerpo = (await request.json().catch(() => ({}))) as { ruta?: unknown; nombre?: unknown; firmantes?: unknown };
  const firmantes = Array.isArray(cuerpo.firmantes)
    ? cuerpo.firmantes.map((f: Record<string, unknown>) => ({ nombre: String(f?.nombre ?? ""), correo: String(f?.correo ?? ""), rfc: String(f?.rfc ?? "") }))
    : [];
  try {
    const r = await enviarAFirma({
      usuario,
      contratoId: id,
      rutaTemporal: typeof cuerpo.ruta === "string" && cuerpo.ruta ? cuerpo.ruta : null,
      nombreArchivo: typeof cuerpo.nombre === "string" ? cuerpo.nombre.slice(0, 200) : null,
      firmantes,
    });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof ErrorMifiel || e instanceof ErrorSubida) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("firma_no_enviada", e, { org: usuario.org_id, contrato: id });
    return NextResponse.json({ error: "No fue posible enviar el contrato a firma. Intente de nuevo." }, { status: 500 });
  }
}
