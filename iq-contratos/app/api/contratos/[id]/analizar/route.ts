import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { analizarContrato, ErrorAnalisis } from "@/lib/ai/analizar";

export const runtime = "nodejs";
// Un contrato largo puede tardar varios minutos en analizarse.
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { id } = await params;

  // RLS confirma que el contrato es de la organización del usuario.
  const supabase = await clienteSesion();
  const { data: contrato } = await supabase.from("contracts").select("id, version_actual_id").eq("id", id).maybeSingle();
  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });

  // Evitar dos análisis simultáneos de la misma versión.
  const hace = new Date(Date.now() - 6 * 60_000).toISOString();
  const { data: enCurso } = await supabase
    .from("analyses")
    .select("id")
    .eq("version_id", contrato.version_actual_id)
    .eq("estado", "en_proceso")
    .gte("creado_en", hace)
    .limit(1);
  if (enCurso?.length) return NextResponse.json({ estado: "en_proceso" }, { status: 202 });

  try {
    const r = await analizarContrato({ contratoId: id, orgId: usuario.org_id, usuarioId: usuario.id });
    return NextResponse.json(r);
  } catch (e) {
    const mensaje = e instanceof ErrorAnalisis ? e.message : "No fue posible completar el análisis.";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
