import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos } from "@/lib/tipos";
import { pdfDeVersion } from "@/lib/firmas/solicitudes";
import { ErrorMifiel } from "@/lib/firmas/mifiel";
import { ErrorConversion } from "@/lib/pdf/desde-word";
import { registrarAcceso } from "@/lib/contratos/bitacora";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vista previa del PDF que se enviará a Mifiel: la versión vigente, convertida si es Word.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.validar(usuario.rol)) return NextResponse.json({ error: "Solo Legal envía contratos a firma." }, { status: 403 });
  const { id } = await params;
  const supabase = await clienteSesion();
  const { data: contrato } = await supabase
    .from("contracts")
    .select("id, titulo, version_actual_id, contract_versions!contract_versions_contract_id_fkey(id, mime, storage_path, nombre_archivo)")
    .eq("id", id)
    .maybeSingle();
  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  const versiones = (contrato.contract_versions ?? []) as { id: string; mime: string; storage_path: string; nombre_archivo: string }[];
  try {
    const { pdf, nombre } = await pdfDeVersion(contrato.titulo, versiones.find((v) => v.id === contrato.version_actual_id));
    if (contrato.version_actual_id) await registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "ver", versionId: contrato.version_actual_id });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof ErrorMifiel || e instanceof ErrorConversion) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("vista_previa_firma_fallida", e, { contrato: id });
    return NextResponse.json({ error: "No fue posible preparar el PDF." }, { status: 500 });
  }
}
