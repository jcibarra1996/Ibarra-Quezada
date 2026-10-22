import { after, NextResponse } from "next/server";
import { analizarEnSegundoPlano } from "@/lib/ai/segundo-plano";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos } from "@/lib/tipos";
import { registrarContrato } from "@/lib/contratos/registrar";
import { ErrorDocumento } from "@/lib/parsing/extraer";
import { descartarSubida, ErrorSubida, recogerSubida } from "@/lib/subidas";
import { registrar, registrarError } from "@/lib/log";

export const runtime = "nodejs";
// El análisis arranca al terminar la subida, en la misma función, sin que nadie espere.
export const maxDuration = 300;

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  // El archivo ya está en la carpeta temporal del usuario (ver lib/subidas.ts).
  const datos = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const ruta = texto(datos.ruta);
  const nombre = texto(datos.nombre).slice(0, 200) || "contrato";
  if (!ruta) return NextResponse.json({ error: "Seleccione un archivo PDF o Word." }, { status: 400 });

  // Nueva versión de un contrato existente: solo Legal, y RLS confirma que el contrato es de su organización.
  const existente = texto(datos.contrato_id) || null;
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
    const contenido = await recogerSubida(usuario, ruta);
    const { contratoId, versionId } = await registrarContrato({
      contratoId: existente ?? undefined,
      usuario,
      nombreArchivo: nombre,
      datos: contenido,
      contraparte: texto(datos.contraparte),
      areaId: texto(datos.area_id) || null,
    });
    await descartarSubida(ruta);
    // Una versión nueva deja sin efecto la aprobación anterior: el contrato vuelve a negociación.
    if (estadoPrevio === "aprobado") {
      const supabase = await clienteSesion();
      await supabase.from("contracts").update({ estado: "en_negociacion" }).eq("id", contratoId);
    }
    registrar("contrato_subido", { org: usuario.org_id, contrato: contratoId, version: versionId, bytes: contenido.byteLength });
    after(() => analizarEnSegundoPlano({ contratoId, orgId: usuario.org_id, usuarioId: usuario.id }));
    return NextResponse.json({ id: contratoId });
  } catch (e) {
    await descartarSubida(ruta).catch(() => undefined);
    if (e instanceof ErrorDocumento || e instanceof ErrorSubida) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("contrato_subida_fallida", e, { org: usuario.org_id });
    return NextResponse.json({ error: "No fue posible registrar el contrato. Intente de nuevo." }, { status: 500 });
  }
}
