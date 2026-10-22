"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos } from "@/lib/tipos";

export async function actualizarAlerta(
  alertaId: string,
  cambios: { estado?: "activa" | "atendida" | "descartada"; area_id?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const usuario = await exigirUsuario();
  if (!permisos.validar(usuario.rol)) return { ok: false, error: "Su rol no permite modificar alertas." };
  const supabase = await clienteSesion();
  const datos: Record<string, unknown> = {};
  if (cambios.estado) {
    datos.estado = cambios.estado;
    datos.atendida_por = cambios.estado === "activa" ? null : usuario.id;
    datos.atendida_en = cambios.estado === "activa" ? null : new Date().toISOString();
  }
  if (cambios.area_id !== undefined) datos.area_id = cambios.area_id;
  const { data, error } = await supabase.from("alerts").update(datos).eq("id", alertaId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo actualizar la alerta." };
  revalidatePath("/vencimientos");
  return { ok: true };
}
