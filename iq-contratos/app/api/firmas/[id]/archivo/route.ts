import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/contratos/registrar";
import { registrarAcceso } from "@/lib/contratos/bitacora";

export const runtime = "nodejs";

// Descarga del contrato firmado (PDF) o de su XML con la constancia de conservación,
// con enlace firmado de 5 minutos y registro en la bitácora.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { id } = await params;
  const formato = new URL(request.url).searchParams.get("formato") === "xml" ? "xml" : "pdf";
  const supabase = await clienteSesion();
  const { data: s } = await supabase.from("signature_requests").select("id, firmado_pdf_path, firmado_xml_path, contracts(titulo)").eq("id", id).maybeSingle();
  const ruta = formato === "xml" ? s?.firmado_xml_path : s?.firmado_pdf_path;
  if (!s || !ruta) return NextResponse.json({ error: "El documento firmado aún no está disponible." }, { status: 404 });
  const titulo = (s.contracts as unknown as { titulo: string } | null)?.titulo ?? "Contrato";
  const { data: firmado } = await clienteSistema()
    .storage.from(BUCKET)
    .createSignedUrl(ruta, 300, { download: `${titulo} - firmado.${formato}` });
  if (!firmado) return NextResponse.json({ error: "No fue posible generar el enlace." }, { status: 500 });
  await registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "descargar", firmaId: s.id });
  return NextResponse.redirect(firmado.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
