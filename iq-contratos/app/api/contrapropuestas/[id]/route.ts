import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { descargarContrapropuesta, ErrorContrapropuesta } from "@/lib/contratos/contrapropuesta";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";

async function descargar(id: string) {
  const usuario = await usuarioActual();
  if (!usuario) return { error: NextResponse.json({ error: "Sesión no válida." }, { status: 401 }) };
  try {
    return { r: await descargarContrapropuesta(usuario, id) };
  } catch (e) {
    if (e instanceof ErrorContrapropuesta) return { error: NextResponse.json({ error: e.message }, { status: 404 }) };
    registrarError("descarga_contrapropuesta_fallida", e, { contrapropuesta: id });
    return { error: NextResponse.json({ error: "No fue posible generar el enlace." }, { status: 500 }) };
  }
}

// Enlace directo: redirige a la descarga.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { r, error } = await descargar((await params).id);
  if (error) return error;
  return NextResponse.redirect(r.url, { headers: { "Cache-Control": "no-store" } });
}

// Desde la pantalla del contrato: devuelve el enlace y el estado resultante para refrescar la vista.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { r, error } = await descargar((await params).id);
  if (error) return error;
  return NextResponse.json({ url: r.url, estado: r.estado }, { headers: { "Cache-Control": "no-store" } });
}
