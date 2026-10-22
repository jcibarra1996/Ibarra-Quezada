import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { registrarDocumentoCorporativo } from "@/lib/corporativo/documentos";
import { ErrorExtraccion } from "@/lib/corporativo/esquema";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/corporativo/campos";
import { descartarSubida, ErrorSubida, recogerSubida } from "@/lib/subidas";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";
// Un acta constitutiva escaneada puede tardar en leerse.
export const maxDuration = 300;

// Cualquier integrante de la organización, incluida el área que solicita, carga documentos.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { id } = await params;

  const supabase = await clienteSesion();
  const { data: expediente } = await supabase.from("companies").select("id").eq("id", id).maybeSingle();
  if (!expediente) return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });

  // El archivo ya está en la carpeta temporal del usuario (ver lib/subidas.ts).
  const datos = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ruta = typeof datos.ruta === "string" ? datos.ruta : "";
  const nombre = typeof datos.nombre === "string" && datos.nombre ? datos.nombre.slice(0, 200) : "documento";
  const tipo = String(datos.tipo ?? "") as TipoDocumento;
  if (!(tipo in TIPOS_DOCUMENTO)) return NextResponse.json({ error: "Indique qué documento es." }, { status: 400 });
  if (!ruta) return NextResponse.json({ error: "Seleccione un archivo." }, { status: 400 });

  try {
    const contenido = await recogerSubida(usuario, ruta);
    const r = await registrarDocumentoCorporativo({ usuario, companyId: expediente.id, tipo, nombreArchivo: nombre, datos: contenido });
    await descartarSubida(ruta);
    return NextResponse.json(r);
  } catch (e) {
    await descartarSubida(ruta).catch(() => undefined);
    if (e instanceof ErrorExtraccion || e instanceof ErrorSubida) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("documento_corporativo_subida_fallida", e, { org: usuario.org_id });
    return NextResponse.json({ error: "No fue posible guardar el documento. Intente de nuevo." }, { status: 500 });
  }
}
