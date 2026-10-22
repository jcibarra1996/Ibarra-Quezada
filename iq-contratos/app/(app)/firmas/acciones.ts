"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSistema } from "@/lib/supabase/admin";
import { ErrorMifiel, probarCredenciales } from "@/lib/firmas/mifiel";
import { permisos } from "@/lib/tipos";

type Resultado = { ok: true } | { ok: false; error: string };

// La dirección jurídica conecta la cuenta de Mifiel de la organización. Las credenciales se
// prueban contra la API y se guardan cifradas en Supabase Vault; nunca regresan al navegador.
export async function conectarMifiel(p: { appId: string; secreto: string; entorno: "sandbox" | "produccion" }): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.editarPlaybook(usuario.rol)) return { ok: false, error: "Solo la dirección jurídica conecta Mifiel." };
  const appId = p.appId.trim();
  const secreto = p.secreto.trim();
  const entorno = p.entorno === "produccion" ? "produccion" : "sandbox";
  if (!/^[A-Za-z0-9]{16,80}$/.test(appId) || secreto.length < 16 || secreto.length > 200) return { ok: false, error: "Revise el APP_ID y el APP_SECRET." };
  try {
    await probarCredenciales({ entorno, appId, secreto });
  } catch (e) {
    const otro = entorno === "produccion" ? "pruebas (sandbox)" : "producción";
    return { ok: false, error: e instanceof ErrorMifiel && e.estado === 401 ? `Mifiel no aceptó estas credenciales en ${entorno === "produccion" ? "producción" : "pruebas"}. ¿Son de ${otro}?` : "No fue posible comprobar las credenciales con Mifiel." };
  }
  const { error } = await clienteSistema().rpc("guardar_integracion", {
    p_org: usuario.org_id,
    p_proveedor: "mifiel",
    p_entorno: entorno,
    p_app_id: appId,
    p_secreto: secreto,
    p_usuario: usuario.id,
  });
  if (error) return { ok: false, error: "No se pudieron guardar las credenciales." };
  revalidatePath("/firmas");
  return { ok: true };
}

export async function desconectarMifiel(): Promise<Resultado> {
  const usuario = await exigirUsuario();
  if (!permisos.editarPlaybook(usuario.rol)) return { ok: false, error: "Solo la dirección jurídica desconecta Mifiel." };
  await clienteSistema().rpc("borrar_integracion", { p_org: usuario.org_id, p_proveedor: "mifiel" });
  revalidatePath("/firmas");
  return { ok: true };
}
