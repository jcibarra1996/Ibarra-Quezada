import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { permisos } from "@/lib/tipos";
import { ErrorFicha, llenarFicha } from "@/lib/ai/ficha";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 120;

// Llena la ficha con la IA a partir de la versión vigente. No pisa lo capturado a mano.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.validar(usuario.rol)) return NextResponse.json({ error: "Solo Legal llena la ficha del contrato." }, { status: 403 });
  const { id } = await params;
  try {
    return NextResponse.json(await llenarFicha({ contratoId: id, orgId: usuario.org_id, usuarioId: usuario.id }));
  } catch (e) {
    if (e instanceof ErrorFicha) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("ficha_fallida", e, { contrato: id });
    return NextResponse.json({ error: "No fue posible llenar la ficha. Intente de nuevo." }, { status: 500 });
  }
}
