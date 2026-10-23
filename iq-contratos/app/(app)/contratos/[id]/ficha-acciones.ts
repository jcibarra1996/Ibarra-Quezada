"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { esFechaValida } from "@/lib/fechas/calcular";
import { CAMPOS_FICHA, type CampoFicha, type FuentesFicha, type ValoresFicha } from "@/lib/ai/ficha-esquema";
import { leerCamposFicha } from "@/lib/ficha-campos";
import { permisos } from "@/lib/tipos";

type Resultado = { ok: true } | { ok: false; error: string };

// Errores de las reglas de la base de datos que se muestran tal cual.
const REGLAS = /Solo un contrato firmado|terminación no puede|responsable debe|fin de la vigencia/;
const mensajeDe = (error: { message: string } | null, porDefecto: string) => (error && REGLAS.test(error.message) ? error.message : porDefecto);

// El historial lo escribe el servidor: la sesión del usuario no inserta en la bitácora.
async function evento(orgId: string, contratoId: string, actorId: string, accion: string, detalle: Record<string, unknown>) {
  await clienteSistema().from("audit_events").insert({ org_id: orgId, contract_id: contratoId, actor_id: actorId, accion, detalle });
}

function refrescar(contratoId: string) {
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/contratos");
}

// Guarda la ficha editada por Legal y la deja confirmada por quien la guardó. Los campos que
// cambian quedan marcados como capturados a mano: la IA ya no los modifica.
export async function guardarFicha(contratoId: string, entrada: Record<string, string>): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.validar(usuario.rol)) return { ok: false, error: "Solo Legal edita la ficha del contrato." };
  const leido = leerCamposFicha(entrada);
  if ("error" in leido) return { ok: false, error: leido.error };
  const supabase = await clienteSesion();
  const { data: actual } = await supabase.from("contracts").select(`org_id, ficha_fuentes, ${CAMPOS_FICHA.join(", ")}`).eq("id", contratoId).maybeSingle();
  if (!actual) return { ok: false, error: "Contrato no encontrado." };
  const previo = actual as unknown as ValoresFicha & { org_id: string; ficha_fuentes: FuentesFicha | null };
  const ahora = new Date().toISOString();
  const fuentes: FuentesFicha = { ...(previo.ficha_fuentes ?? {}) };
  const cambiados: CampoFicha[] = [];
  for (const [k, v] of Object.entries(leido.valores) as [CampoFicha, ValoresFicha[CampoFicha]][]) {
    const antes = previo[k];
    const igual = (antes ?? null) === (v ?? null) || (typeof v === "number" && antes != null && Number(antes) === v);
    if (igual) continue;
    cambiados.push(k);
    fuentes[k] = { origen: "manual", por: usuario.id, en: ahora };
  }
  const { error } = await supabase
    .from("contracts")
    .update({ ...leido.valores, ficha_fuentes: fuentes, ficha_confirmada_en: ahora, ficha_confirmada_por: usuario.id })
    .eq("id", contratoId);
  if (error) return { ok: false, error: mensajeDe(error, "No se pudo guardar la ficha.") };
  await evento(previo.org_id, contratoId, usuario.id, "ficha_confirmada", { cambios: cambiados.length });
  refrescar(contratoId);
  return { ok: true };
}

export async function confirmarFicha(contratoId: string): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.validar(usuario.rol)) return { ok: false, error: "Solo Legal confirma la ficha del contrato." };
  const supabase = await clienteSesion();
  const { data, error } = await supabase
    .from("contracts")
    .update({ ficha_confirmada_en: new Date().toISOString(), ficha_confirmada_por: usuario.id })
    .eq("id", contratoId)
    .select("org_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo confirmar la ficha." };
  await evento(data.org_id, contratoId, usuario.id, "ficha_confirmada", { cambios: 0 });
  refrescar(contratoId);
  return { ok: true };
}

export async function asignarResponsable(contratoId: string, perfilId: string | null): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.validar(usuario.rol)) return { ok: false, error: "Solo Legal asigna al responsable." };
  const supabase = await clienteSesion();
  const { data, error } = await supabase.from("contracts").update({ responsable_id: perfilId || null }).eq("id", contratoId).select("org_id").maybeSingle();
  if (error || !data) return { ok: false, error: mensajeDe(error, "No se pudo asignar al responsable.") };
  await evento(data.org_id, contratoId, usuario.id, "responsable_asignado", { responsable: perfilId || null });
  refrescar(contratoId);
  return { ok: true };
}

export async function terminarContrato(contratoId: string, fecha: string | null, motivo: string): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.validar(usuario.rol)) return { ok: false, error: "Solo Legal da por terminado un contrato." };
  if (fecha !== null && !esFechaValida(fecha)) return { ok: false, error: "Indique la fecha de terminación." };
  const texto = motivo.trim().slice(0, 500);
  if (fecha && !texto) return { ok: false, error: "Indique el motivo de la terminación." };
  const supabase = await clienteSesion();
  const { data, error } = await supabase
    .from("contracts")
    .update({ terminado_en: fecha, motivo_terminacion: fecha ? texto : null })
    .eq("id", contratoId)
    .select("org_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: mensajeDe(error, "No se pudo registrar la terminación.") };
  await evento(data.org_id, contratoId, usuario.id, fecha ? "contrato_terminado" : "terminacion_revertida", fecha ? { fecha } : {});
  refrescar(contratoId);
  return { ok: true };
}
