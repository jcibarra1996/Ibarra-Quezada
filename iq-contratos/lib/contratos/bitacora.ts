import "server-only";
import { headers } from "next/headers";
import { clienteSistema } from "@/lib/supabase/admin";

// Registra que un usuario vio o descargó un documento. Para "ver" se evita duplicar
// el registro si la misma persona abrió la misma versión en los últimos 15 minutos.
export async function registrarAcceso(p: {
  orgId: string;
  actorId: string;
  accion: "ver" | "descargar";
  versionId?: string;
  contrapropuestaId?: string;
}) {
  const db = clienteSistema();
  if (p.accion === "ver" && p.versionId) {
    const desde = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await db
      .from("document_access_log")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", p.actorId)
      .eq("version_id", p.versionId)
      .eq("accion", "ver")
      .gte("creado_en", desde);
    if (count) return;
  }
  const h = await headers();
  await db.from("document_access_log").insert({
    org_id: p.orgId,
    actor_id: p.actorId,
    accion: p.accion,
    version_id: p.versionId ?? null,
    counterproposal_id: p.contrapropuestaId ?? null,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
}
