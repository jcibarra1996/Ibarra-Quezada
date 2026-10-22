"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { CAMPOS, rfcValido, type DatosExpediente, type TipoPersona } from "@/lib/corporativo/campos";
import { permisos } from "@/lib/tipos";

type Resultado = { ok: true; id?: string } | { ok: false; error: string };

const limpiar = (s: unknown, max = 600) => String(s ?? "").trim().slice(0, max);

export async function crearExpediente(p: { denominacion: string; tipo_persona: TipoPersona; rfc?: string }): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const denominacion = limpiar(p.denominacion, 300);
  if (denominacion.length < 2) return { ok: false, error: "Escriba la denominación o el nombre completo." };
  const tipo = p.tipo_persona === "fisica" ? "fisica" : "moral";
  const rfc = limpiar(p.rfc, 13).toUpperCase().replace(/[\s-]/g, "") || null;
  if (rfc && !rfcValido(rfc, tipo)) return { ok: false, error: "El RFC no tiene el formato esperado para ese tipo de persona." };
  const supabase = await clienteSesion();
  const { data, error } = await supabase
    .from("companies")
    .insert({ org_id: usuario.org_id, denominacion, tipo_persona: tipo, rfc, creado_por: usuario.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el expediente." };
  revalidatePath("/expedientes");
  return { ok: true, id: data.id };
}

export async function guardarExpediente(
  id: string,
  p: { denominacion: string; rfc: string; datos: DatosExpediente },
): Promise<Resultado> {
  await exigirUsuario();
  const supabase = await clienteSesion();
  const { data: actual } = await supabase.from("companies").select("tipo_persona, datos").eq("id", id).maybeSingle();
  if (!actual) return { ok: false, error: "Expediente no encontrado." };
  const denominacion = limpiar(p.denominacion, 300);
  if (denominacion.length < 2) return { ok: false, error: "La denominación es obligatoria." };
  const rfc = limpiar(p.rfc, 13).toUpperCase().replace(/[\s-]/g, "") || null;
  if (rfc && !rfcValido(rfc, actual.tipo_persona as TipoPersona)) return { ok: false, error: "El RFC no tiene el formato esperado." };
  const datos: DatosExpediente = {};
  for (const c of CAMPOS) {
    const v = limpiar(p.datos[c.clave], c.tipo === "largo" ? 3000 : 600);
    if (!v) continue;
    if (c.tipo === "fecha" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: `${c.etiqueta}: use una fecha completa.` };
    datos[c.clave] = v;
  }
  // Las fuentes de un dato corregido a mano dejan de aplicar.
  const { data: fila } = await supabase.from("companies").select("fuentes").eq("id", id).single();
  const fuentes = { ...((fila?.fuentes ?? {}) as Record<string, unknown>) };
  for (const c of CAMPOS) if ((actual.datos as DatosExpediente)[c.clave] !== datos[c.clave]) delete fuentes[c.clave];
  const { error } = await supabase.from("companies").update({ denominacion, rfc, datos, fuentes }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar el expediente." };
  revalidatePath(`/expedientes/${id}`);
  return { ok: true };
}

export async function validarExpediente(id: string, validar: boolean): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.validar(usuario.rol)) return { ok: false, error: "Solo Legal valida expedientes." };
  const supabase = await clienteSesion();
  const { error } = await supabase.from("companies").update({ estado: validar ? "validado" : "por_validar" }).eq("id", id);
  if (error) return { ok: false, error: error.message.startsWith("Solo") ? error.message : "No se pudo actualizar el expediente." };
  revalidatePath(`/expedientes/${id}`);
  return { ok: true };
}

// Vincula el expediente de una de las partes con un contrato. Lo hace Legal o quien
// registró o solicitó el contrato.
export async function vincularExpediente(contratoId: string, parte: "contraparte" | "propia", companyId: string | null): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const supabase = await clienteSesion();
  const [{ data: contrato }, { data: expediente }] = await Promise.all([
    supabase.from("contracts").select("id, creado_por, solicitado_por, estado").eq("id", contratoId).maybeSingle(),
    companyId ? supabase.from("companies").select("id, es_propia").eq("id", companyId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!contrato) return { ok: false, error: "Contrato no encontrado." };
  if (companyId && !expediente) return { ok: false, error: "Expediente no encontrado." };
  if (!permisos.validar(usuario.rol) && contrato.creado_por !== usuario.id && contrato.solicitado_por !== usuario.id) {
    return { ok: false, error: "Solo Legal o quien solicitó el contrato puede vincular expedientes." };
  }
  if (contrato.estado === "firmado") return { ok: false, error: "El contrato ya está firmado." };
  const db = clienteSistema();
  const columna = parte === "propia" ? "propia_id" : "contraparte_id";
  await db.from("contracts").update({ [columna]: companyId }).eq("id", contratoId).eq("org_id", usuario.org_id);
  await db.from("audit_events").insert({
    org_id: usuario.org_id,
    contract_id: contratoId,
    actor_id: usuario.id,
    accion: "expediente_vinculado",
    detalle: { parte, expediente: companyId },
  });
  revalidatePath(`/contratos/${contratoId}`);
  return { ok: true };
}
