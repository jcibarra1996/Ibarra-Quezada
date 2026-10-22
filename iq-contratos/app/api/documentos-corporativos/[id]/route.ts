import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/contratos/registrar";
import { registrarAcceso } from "@/lib/contratos/bitacora";

export const runtime = "nodejs";
const CADUCIDAD_SEGUNDOS = 300;

// Descarga de un documento corporativo mediante un enlace firmado que caduca en 5 minutos.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { id } = await params;

  const supabase = await clienteSesion();
  const { data: doc } = await supabase.from("corporate_documents").select("id, storage_path, nombre_archivo").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });

  const { data: firmado, error } = await clienteSistema()
    .storage.from(BUCKET)
    .createSignedUrl(doc.storage_path, CADUCIDAD_SEGUNDOS, { download: doc.nombre_archivo });
  if (error || !firmado) return NextResponse.json({ error: "No fue posible generar el enlace." }, { status: 500 });

  await registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "descargar", documentoCorporativoId: doc.id });
  return NextResponse.redirect(firmado.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
