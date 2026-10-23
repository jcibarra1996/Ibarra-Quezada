import { after, NextResponse } from "next/server";
import { analizarEnSegundoPlano } from "@/lib/ai/segundo-plano";
import { usuarioActual } from "@/lib/auth/sesion";
import { ErrorPlantilla, generarDesdePlantilla } from "@/lib/plantillas/generar";
import { ErrorDocumento } from "@/lib/parsing/extraer";
import { registrar, registrarError } from "@/lib/log";
import { permisos } from "@/lib/tipos";

export const runtime = "nodejs";
export const maxDuration = 300;

// Solo Legal genera contratos desde plantilla; el área de negocio solicita subiendo el
// documento de la contraparte.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.verBiblioteca(usuario.rol)) return NextResponse.json({ error: "Las plantillas son de uso exclusivo de Legal." }, { status: 403 });
  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  if (!cuerpo || typeof cuerpo !== "object") return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const negocio = Object.fromEntries(Object.entries((cuerpo.negocio ?? {}) as Record<string, unknown>).map(([k, v]) => [k, texto(v)]));
  const fechaFirma = texto(cuerpo.fecha_firma);
  try {
    const r = await generarDesdePlantilla({
      usuario,
      plantillaId: id,
      contraparteId: texto(cuerpo.contraparte_id) || null,
      propiaId: texto(cuerpo.propia_id) || null,
      negocio,
      lugarFirma: texto(cuerpo.lugar_firma) || "la Ciudad de México",
      fechaFirma: /^\d{4}-\d{2}-\d{2}$/.test(fechaFirma) ? fechaFirma : null,
      areaId: texto(cuerpo.area_id) || null,
    });
    registrar("contrato_generado", { org: usuario.org_id, contrato: r.contratoId, pendientes: r.faltantes.length });
    after(() => analizarEnSegundoPlano({ contratoId: r.contratoId, orgId: usuario.org_id, usuarioId: usuario.id }));
    return NextResponse.json({ id: r.contratoId, faltantes: r.faltantes });
  } catch (e) {
    if (e instanceof ErrorPlantilla || e instanceof ErrorDocumento) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("contrato_generado_fallido", e, { org: usuario.org_id });
    return NextResponse.json({ error: "No fue posible generar el contrato. Intente de nuevo." }, { status: 500 });
  }
}
