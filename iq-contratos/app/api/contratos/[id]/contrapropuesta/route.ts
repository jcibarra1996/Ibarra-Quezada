import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { permisos } from "@/lib/tipos";
import { crearContrapropuesta, ErrorContrapropuesta } from "@/lib/contratos/contrapropuesta";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";

// Genera la contrapropuesta. El estado del contrato no cambia aquí: cambia al descargarla.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.validar(usuario.rol)) return NextResponse.json({ error: "Su rol no permite generar contrapropuestas." }, { status: 403 });
  const { id } = await params;
  try {
    const r = await crearContrapropuesta(usuario, id);
    return NextResponse.json({ id: r.id, cambios: r.cambios });
  } catch (e) {
    if (e instanceof ErrorContrapropuesta) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("contrapropuesta_fallida", e, { contrato: id });
    return NextResponse.json({ error: "No fue posible generar la contrapropuesta." }, { status: 500 });
  }
}
