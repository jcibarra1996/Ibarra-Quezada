"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos, TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";

type Resultado = { ok: true; id?: string } | { ok: false; error: string };

export interface CamposPosicion {
  tema: string;
  preferida: string;
  respaldo: string;
  nunca_se_acepta: string;
  clausula_modelo: string;
}

const LIMITE = 6000;

async function director() {
  const usuario = await exigirUsuario();
  if (!permisos.editarPlaybook(usuario.rol)) return null;
  return usuario;
}

export async function guardarPosicion(playbookId: string, posicionId: string | null, c: CamposPosicion): Promise<Resultado> {
  const usuario = await director();
  if (!usuario) return { ok: false, error: "Solo la dirección jurídica edita las reglas." };
  const campos = {
    tema: c.tema.trim().slice(0, 120),
    preferida: c.preferida.trim().slice(0, LIMITE),
    respaldo: c.respaldo.trim().slice(0, LIMITE),
    nunca_se_acepta: c.nunca_se_acepta.trim().slice(0, LIMITE),
    clausula_modelo: c.clausula_modelo.trim().slice(0, LIMITE),
    actualizado_en: new Date().toISOString(),
  };
  if (!campos.tema) return { ok: false, error: "El tema es obligatorio." };
  const supabase = await clienteSesion();
  let id = posicionId;
  if (posicionId) {
    const { error } = await supabase.from("playbook_positions").update(campos).eq("id", posicionId);
    if (error) return { ok: false, error: "No se pudo guardar la posición." };
  } else {
    const { count } = await supabase.from("playbook_positions").select("id", { count: "exact", head: true }).eq("playbook_id", playbookId);
    const { data, error } = await supabase
      .from("playbook_positions")
      .insert({ ...campos, playbook_id: playbookId, org_id: usuario.org_id, orden: count ?? 0 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "No se pudo agregar la posición." };
    id = data.id;
  }
  await supabase.from("playbooks").update({ actualizado_por: usuario.id, actualizado_en: new Date().toISOString() }).eq("id", playbookId);
  revalidatePath("/playbook");
  return { ok: true, id: id ?? undefined };
}

export async function eliminarPosicion(posicionId: string): Promise<Resultado> {
  if (!(await director())) return { ok: false, error: "Solo la dirección jurídica edita las reglas." };
  const supabase = await clienteSesion();
  const { error } = await supabase.from("playbook_positions").delete().eq("id", posicionId);
  if (error) return { ok: false, error: "No se pudo eliminar la posición." };
  revalidatePath("/playbook");
  return { ok: true };
}

export async function crearPlaybook(tipo: TipoContrato): Promise<Resultado> {
  const usuario = await director();
  if (!usuario) return { ok: false, error: "Solo la dirección jurídica edita las reglas." };
  if (!(tipo in TIPOS_CONTRATO)) return { ok: false, error: "Tipo de contrato no válido." };
  const supabase = await clienteSesion();
  const { data, error } = await supabase
    .from("playbooks")
    .insert({ org_id: usuario.org_id, tipo_contrato: tipo, nombre: `Contratos de ${TIPOS_CONTRATO[tipo].toLowerCase()}`, actualizado_por: usuario.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudieron crear las reglas." };
  revalidatePath("/playbook");
  return { ok: true, id: data.id };
}
