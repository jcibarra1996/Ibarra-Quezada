import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos, type TipoContrato } from "@/lib/tipos";
import { ErrorSugerencia, sugerirPosiciones } from "@/lib/ai/sugerir-playbook";
import { registrar, registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 300;

// La IA propone posiciones para un playbook. No guarda nada: la dirección jurídica revisa
// cada sugerencia y decide si la agrega.
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!permisos.editarPlaybook(usuario.rol)) return NextResponse.json({ error: "Solo la dirección jurídica edita el playbook." }, { status: 403 });
  const cuerpo = await request.json().catch(() => null);
  const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const playbookId = texto(cuerpo?.playbook_id, 64);
  if (!playbookId) return NextResponse.json({ error: "Indique el playbook." }, { status: 400 });

  const supabase = await clienteSesion();
  const [{ data: playbook }, { data: org }] = await Promise.all([
    supabase.from("playbooks").select("id, tipo_contrato, playbook_positions(id, tema, preferida, respaldo, nunca_se_acepta, orden)").eq("id", playbookId).maybeSingle(),
    supabase.from("organizations").select("nombre").eq("id", usuario.org_id).maybeSingle(),
  ]);
  if (!playbook) return NextResponse.json({ error: "Playbook no encontrado." }, { status: 404 });

  const tema = texto(cuerpo?.tema, 120) || undefined;
  const b = cuerpo?.borrador ?? {};
  const borrador = tema
    ? { preferida: texto(b.preferida, 6000), respaldo: texto(b.respaldo, 6000), nunca_se_acepta: texto(b.nunca_se_acepta, 6000), clausula_modelo: texto(b.clausula_modelo, 6000) }
    : undefined;
  const posicionId = texto(cuerpo?.posicion_id, 64);
  // Al editar una posición, el resto del playbook es el contexto; la propia va como borrador.
  const existentes = [...(playbook.playbook_positions ?? [])].sort((x, y) => x.orden - y.orden).filter((x) => x.id !== posicionId);

  try {
    const posiciones = await sugerirPosiciones({ tipo: playbook.tipo_contrato as TipoContrato, organizacion: org?.nombre ?? "", existentes, tema, borrador });
    registrar("playbook_sugerido", { org: usuario.org_id, playbook: playbook.id, tema: Boolean(tema), posiciones: posiciones.length });
    return NextResponse.json({ posiciones });
  } catch (e) {
    if (e instanceof ErrorSugerencia) return NextResponse.json({ error: e.message }, { status: 422 });
    registrarError("playbook_sugerencia_fallida", e, { org: usuario.org_id, playbook: playbook.id });
    return NextResponse.json({ error: "No fue posible obtener sugerencias. Intente de nuevo." }, { status: 500 });
  }
}
