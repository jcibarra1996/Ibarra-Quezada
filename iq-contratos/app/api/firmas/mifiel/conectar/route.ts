import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { permisos } from "@/lib/tipos";
import { ErrorMifiel } from "@/lib/firmas/mifiel";
import { conectarAvisos } from "@/lib/firmas/avisos";

export const runtime = "nodejs";

// Registra en Mifiel los avisos que le dicen al portal cuándo se firmó un documento.
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.editarPlaybook(usuario.rol)) return NextResponse.json({ error: "Solo la dirección jurídica conecta los avisos." }, { status: 403 });
  try {
    await conectarAvisos(usuario.org_id, new URL(request.url).origin);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ErrorMifiel || e instanceof Error ? e.message : "No fue posible registrar los avisos." }, { status: 502 });
  }
}
