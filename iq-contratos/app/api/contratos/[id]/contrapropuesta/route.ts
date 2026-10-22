import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos } from "@/lib/tipos";
import { crearContrapropuesta, ErrorContrapropuesta } from "@/lib/contratos/contrapropuesta";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.validar(usuario.rol)) return NextResponse.json({ error: "Su rol no permite generar contrapropuestas." }, { status: 403 });
  const { id } = await params;
  try {
    const r = await crearContrapropuesta(usuario, id);
    // Al preparar la contrapropuesta, el contrato pasa a negociación. Se hace con la sesión
    // del usuario para que el historial registre quién lo movió.
    if (r.estadoPrevio === "recibido" || r.estadoPrevio === "en_revision") {
      const supabase = await clienteSesion();
      await supabase.from("contracts").update({ estado: "en_negociacion" }).eq("id", id);
    }
    return NextResponse.json({ id: r.id, cambios: r.cambios });
  } catch (e) {
    if (e instanceof ErrorContrapropuesta) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("contrapropuesta_fallida", e, { contrato: id });
    return NextResponse.json({ error: "No fue posible generar la contrapropuesta." }, { status: 500 });
  }
}
