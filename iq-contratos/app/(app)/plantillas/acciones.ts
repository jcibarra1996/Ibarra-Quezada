"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { marcadoresNegocio, type CampoNegocio, type RolPlantilla } from "@/lib/plantillas/llenar";
import { permisos } from "@/lib/tipos";

type Resultado = { ok: true } | { ok: false; error: string };

export async function guardarPlantilla(id: string, p: { nombre: string; descripcion: string; cuerpo: string }): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.editarPlaybook(usuario.rol)) return { ok: false, error: "Solo la dirección jurídica edita las plantillas." };
  const supabase = await clienteSesion();
  const { data: actual } = await supabase.from("templates").select("roles, campos").eq("id", id).maybeSingle();
  if (!actual) return { ok: false, error: "Plantilla no encontrada." };
  const cuerpo = p.cuerpo.replace(/\r\n/g, "\n").trim();
  const nombre = p.nombre.trim().slice(0, 120);
  if (!nombre || cuerpo.length < 200) return { ok: false, error: "La plantilla necesita nombre y texto completo." };
  if (cuerpo.length > 80000) return { ok: false, error: "La plantilla es demasiado extensa." };
  const claves = new Set((actual.campos as CampoNegocio[]).map((c) => c.clave));
  const desconocidos = marcadoresNegocio(cuerpo, actual.roles as RolPlantilla[]).filter((m) => !claves.has(m));
  if (desconocidos.length) return { ok: false, error: `Estos marcadores no corresponden a un dato de la solicitud: ${desconocidos.map((m) => `{{negocio.${m}}}`).join(", ")}.` };
  if (/[—―]/.test(cuerpo)) return { ok: false, error: "La plantilla contiene rayas largas; sustitúyalas por comas o puntos." };
  const { error } = await supabase.from("templates").update({ nombre, descripcion: p.descripcion.trim().slice(0, 400), cuerpo }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar la plantilla." };
  revalidatePath(`/plantillas/${id}`);
  revalidatePath("/plantillas");
  return { ok: true };
}
