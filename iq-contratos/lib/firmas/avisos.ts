import "server-only";
import { clienteSistema } from "@/lib/supabase/admin";
import { exigirCredenciales, registrarWebhook, webhooksRegistrados } from "./mifiel";

const TIPOS = ["document_closed", "signer_completed", "signer_rejected"] as const;

export function urlAvisos(origen: string, orgId: string, clave: string): string {
  return `${origen}/api/firmas/mifiel?org=${encodeURIComponent(orgId)}&clave=${encodeURIComponent(clave)}`;
}

// Registra en Mifiel los avisos de firma, rechazo y documento cerrado, sin duplicar los
// que ya existen para esta misma URL.
export async function conectarAvisos(orgId: string, origen: string) {
  const cred = await exigirCredenciales(orgId);
  if (!cred.webhookClave || cred.webhookClave.length < 16) throw new Error("Falta la clave de avisos de la organización.");
  const url = urlAvisos(origen, orgId, cred.webhookClave);
  const existentes = await webhooksRegistrados(cred);
  for (const tipo of TIPOS) {
    if (existentes.some((w) => w.url === url && w.callback_type === tipo)) continue;
    await registrarWebhook(cred, url, tipo);
  }
  await clienteSistema().from("integraciones").update({ avisos_conectados_en: new Date().toISOString() }).eq("org_id", orgId).eq("proveedor", "mifiel");
}
