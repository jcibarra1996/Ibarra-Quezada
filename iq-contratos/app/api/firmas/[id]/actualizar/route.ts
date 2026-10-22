import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { actualizarFirma } from "@/lib/firmas/solicitudes";
import { ErrorMifiel } from "@/lib/firmas/mifiel";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

// Consulta en Mifiel el estado de una solicitud de firma de la organización.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { id } = await params;
  const supabase = await clienteSesion();
  const { data } = await supabase.from("signature_requests").select("id").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  try {
    return NextResponse.json(await actualizarFirma({ orgId: usuario.org_id, solicitudId: id, actorId: usuario.id }));
  } catch (e) {
    if (e instanceof ErrorMifiel) return NextResponse.json({ error: e.message }, { status: 502 });
    registrarError("firma_no_actualizada", e, { org: usuario.org_id, solicitud: id });
    return NextResponse.json({ error: "No fue posible consultar a Mifiel." }, { status: 500 });
  }
}
