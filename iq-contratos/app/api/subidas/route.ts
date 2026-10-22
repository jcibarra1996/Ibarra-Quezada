import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { ErrorSubida, prepararSubida } from "@/lib/subidas";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";

// Entrega un enlace firmado para subir un archivo directo al almacenamiento privado.
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const cuerpo = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await prepararSubida(usuario, { nombre: String(cuerpo.nombre ?? ""), tamano: Number(cuerpo.tamano) }));
  } catch (e) {
    if (e instanceof ErrorSubida) return NextResponse.json({ error: e.message }, { status: 400 });
    registrarError("subida_no_preparada", e, { org: usuario.org_id });
    return NextResponse.json({ error: "No fue posible preparar la subida. Intente de nuevo." }, { status: 500 });
  }
}
