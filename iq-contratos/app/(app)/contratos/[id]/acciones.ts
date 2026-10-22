"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos, type EstadoContrato, type EstadoHallazgo } from "@/lib/tipos";

type Resultado = { ok: true } | { ok: false; error: string };

// Las reglas viven en la base de datos (RLS y triggers); aquí solo se traducen los errores.
function mensajeDe(error: { message: string } | null, porDefecto: string): string {
  if (!error) return porDefecto;
  if (/No se puede aprobar|Solo un contrato aprobado|Un hallazgo editado|para modificar validaciones/.test(error.message)) return error.message;
  return porDefecto;
}

export async function decidirHallazgo(hallazgoId: string, estado: EstadoHallazgo, textoFinal?: string): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.validar(usuario.rol)) return { ok: false, error: "Su rol no permite validar hallazgos." };
  if (!["pendiente", "aceptado", "editado", "descartado"].includes(estado)) return { ok: false, error: "Estado no válido." };
  const supabase = await clienteSesion();
  const { data, error } = await supabase
    .from("findings")
    .update({ estado, texto_final: estado === "editado" ? (textoFinal ?? "").trim() : null })
    .eq("id", hallazgoId)
    .select("contract_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: mensajeDe(error, "No se pudo registrar la decisión.") };
  revalidatePath(`/contratos/${data.contract_id}`);
  return { ok: true };
}

export async function cambiarEstado(contratoId: string, estado: EstadoContrato): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.cambiarEstado(usuario.rol)) return { ok: false, error: "Su rol no permite cambiar el estado del contrato." };
  const supabase = await clienteSesion();
  const { data, error } = await supabase.from("contracts").update({ estado }).eq("id", contratoId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: mensajeDe(error, "No se pudo cambiar el estado.") };
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/contratos");
  return { ok: true };
}
