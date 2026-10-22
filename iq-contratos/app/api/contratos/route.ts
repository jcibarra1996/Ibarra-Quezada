import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos } from "@/lib/tipos";
import { registrarContrato } from "@/lib/contratos/registrar";
import { ErrorDocumento, TAMANO_MAXIMO } from "@/lib/parsing/extraer";
import { registrar, registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const datos = await request.formData();
  const archivo = datos.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Seleccione un archivo PDF o Word." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return NextResponse.json({ error: "El archivo supera el límite de 20 MB." }, { status: 413 });
  }

  // Nueva versión de un contrato existente: solo Legal, y RLS confirma que el contrato es de su organización.
  const existente = String(datos.get("contrato_id") ?? "") || null;
  let estadoPrevio: string | null = null;
  if (existente) {
    if (!permisos.validar(usuario.rol)) return NextResponse.json({ error: "Solo Legal carga nuevas versiones." }, { status: 403 });
    const supabase = await clienteSesion();
    const { data: c } = await supabase.from("contracts").select("estado").eq("id", existente).maybeSingle();
    if (!c) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
    if (c.estado === "firmado") return NextResponse.json({ error: "El contrato ya está firmado." }, { status: 409 });
    estadoPrevio = c.estado;
  }

  try {
    const { contratoId, versionId } = await registrarContrato({
      contratoId: existente ?? undefined,
      usuario,
      nombreArchivo: archivo.name,
      datos: Buffer.from(await archivo.arrayBuffer()),
      contraparte: String(datos.get("contraparte") ?? ""),
      areaId: String(datos.get("area_id") ?? "") || null,
    });
    // Una versión nueva deja sin efecto la aprobación anterior: el contrato vuelve a negociación.
    if (estadoPrevio === "aprobado") {
      const supabase = await clienteSesion();
      await supabase.from("contracts").update({ estado: "en_negociacion" }).eq("id", contratoId);
    }
    registrar("contrato_subido", { org: usuario.org_id, contrato: contratoId, version: versionId, bytes: archivo.size });
    return NextResponse.json({ id: contratoId });
  } catch (e) {
    if (e instanceof ErrorDocumento) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("contrato_subida_fallida", e, { org: usuario.org_id });
    return NextResponse.json({ error: "No fue posible registrar el contrato. Intente de nuevo." }, { status: 500 });
  }
}
