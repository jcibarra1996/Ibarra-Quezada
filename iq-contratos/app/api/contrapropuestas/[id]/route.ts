import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/contratos/registrar";
import { registrarAcceso } from "@/lib/contratos/bitacora";

export const runtime = "nodejs";

// Descarga de una contrapropuesta con enlace firmado de 5 minutos y registro en bitácora.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { id } = await params;
  const supabase = await clienteSesion();
  const { data: cp } = await supabase
    .from("counterproposals")
    .select("id, storage_path, creado_en, contracts(titulo)")
    .eq("id", id)
    .maybeSingle();
  if (!cp) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });

  const titulo = (cp.contracts as unknown as { titulo: string } | null)?.titulo ?? "Contrato";
  const nombre = `Contrapropuesta - ${titulo} - ${cp.creado_en.slice(0, 10)}.docx`.replace(/[\\/:*?"<>|]/g, "");
  const { data: firmado, error } = await clienteSistema().storage.from(BUCKET).createSignedUrl(cp.storage_path, 300, { download: nombre });
  if (error || !firmado) return NextResponse.json({ error: "No fue posible generar el enlace." }, { status: 500 });
  await registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "descargar", contrapropuestaId: cp.id });
  return NextResponse.redirect(firmado.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
