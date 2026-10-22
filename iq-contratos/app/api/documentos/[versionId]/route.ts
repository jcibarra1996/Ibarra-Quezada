import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/contratos/registrar";
import { registrarAcceso } from "@/lib/contratos/bitacora";

export const runtime = "nodejs";
const CADUCIDAD_SEGUNDOS = 300;

// Descarga del archivo original mediante un enlace firmado que caduca en 5 minutos.
export async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { versionId } = await params;

  // La lectura con la sesión del usuario confirma, vía RLS, que la versión es de su organización.
  const supabase = await clienteSesion();
  const { data: version } = await supabase
    .from("contract_versions")
    .select("id, storage_path, nombre_archivo")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });

  const { data: firmado, error } = await clienteSistema()
    .storage.from(BUCKET)
    .createSignedUrl(version.storage_path, CADUCIDAD_SEGUNDOS, { download: version.nombre_archivo });
  if (error || !firmado) return NextResponse.json({ error: "No fue posible generar el enlace." }, { status: 500 });

  await registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "descargar", versionId });
  return NextResponse.redirect(firmado.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
