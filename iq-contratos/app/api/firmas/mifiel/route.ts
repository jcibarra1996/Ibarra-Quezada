import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { actualizarFirma } from "@/lib/firmas/solicitudes";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

// Aviso de Mifiel (webhook). La especificación de Mifiel no documenta una firma del aviso,
// así que la URL lleva una clave propia (MIFIEL_WEBHOOK_CLAVE) y el aviso solo dispara una
// consulta autenticada a la API: el contenido del aviso nunca se toma como cierto.
export async function POST(request: Request) {
  const esperada = process.env.MIFIEL_WEBHOOK_CLAVE ?? "";
  const recibida = new URL(request.url).searchParams.get("clave") ?? "";
  const valida = esperada.length >= 16 && recibida.length === esperada.length && timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada));
  if (!valida) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const cuerpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const documento = (cuerpo.document ?? cuerpo) as Record<string, unknown>;
  const ids = [documento.id, documento.document_id, cuerpo.document_id].filter((x): x is string => typeof x === "string");
  const externos = [documento.external_id, cuerpo.external_id].filter((x): x is string => typeof x === "string");
  if (!ids.length && !externos.length) return NextResponse.json({ ok: true });

  const db = clienteSistema();
  let consulta = db.from("signature_requests").select("id, org_id").eq("estado", "enviado");
  consulta = ids.length ? consulta.in("externo_id", ids) : consulta.in("id", externos.filter((x) => /^[0-9a-f-]{36}$/.test(x)));
  const { data } = await consulta.limit(1).maybeSingle();
  if (!data) return NextResponse.json({ ok: true });
  try {
    await actualizarFirma({ orgId: data.org_id, solicitudId: data.id, actorId: null });
  } catch (e) {
    registrarError("firma_aviso_fallido", e, { solicitud: data.id });
  }
  return NextResponse.json({ ok: true });
}
