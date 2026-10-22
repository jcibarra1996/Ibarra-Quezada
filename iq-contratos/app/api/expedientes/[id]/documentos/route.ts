import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { registrarDocumentoCorporativo } from "@/lib/corporativo/documentos";
import { ErrorExtraccion } from "@/lib/corporativo/esquema";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/corporativo/campos";
import { TAMANO_MAXIMO } from "@/lib/parsing/extraer";
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

  const datos = await request.formData();
  const archivo = datos.get("archivo");
  const tipo = String(datos.get("tipo") ?? "") as TipoDocumento;
  if (!(tipo in TIPOS_DOCUMENTO)) return NextResponse.json({ error: "Indique qué documento es." }, { status: 400 });
  if (!(archivo instanceof File) || archivo.size === 0) return NextResponse.json({ error: "Seleccione un archivo." }, { status: 400 });
  if (archivo.size > TAMANO_MAXIMO) return NextResponse.json({ error: "El archivo supera el límite de 20 MB." }, { status: 413 });

  try {
    const r = await registrarDocumentoCorporativo({
      usuario,
      companyId: expediente.id,
      tipo,
      nombreArchivo: archivo.name,
      datos: Buffer.from(await archivo.arrayBuffer()),
    });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof ErrorExtraccion) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("documento_corporativo_subida_fallida", e, { org: usuario.org_id });
    return NextResponse.json({ error: "No fue posible guardar el documento. Intente de nuevo." }, { status: 500 });
  }
}
