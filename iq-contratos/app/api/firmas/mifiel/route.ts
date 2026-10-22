import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { credencialesMifiel } from "@/lib/firmas/mifiel";
import { actualizarFirma } from "@/lib/firmas/solicitudes";
import { registrarError } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const iguales = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Aviso de Mifiel (webhook). La especificación de Mifiel no documenta una firma del aviso,
// así que la URL lleva la organización y una clave propia de ella, y el aviso solo dispara
// una consulta autenticada a la API: su contenido nunca se toma como cierto.
export async function POST(request: Request) {
  const parametros = new URL(request.url).searchParams;
  const org = parametros.get("org") ?? "";
  const recibida = parametros.get("clave") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(org)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const cred = await credencialesMifiel(org);
  if (!cred?.webhookClave || cred.webhookClave.length < 16 || !iguales(recibida, cred.webhookClave)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const cuerpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const documento = (cuerpo.document ?? cuerpo) as Record<string, unknown>;
  const ids = [documento.id, documento.document_id, cuerpo.document_id].filter((x): x is string => typeof x === "string");
  const externos = [documento.external_id, cuerpo.external_id].filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x));
  if (!ids.length && !externos.length) return NextResponse.json({ ok: true });

  let consulta = clienteSistema().from("signature_requests").select("id").eq("org_id", org).eq("estado", "enviado");
  consulta = ids.length ? consulta.in("externo_id", ids) : consulta.in("id", externos);
  const { data } = await consulta.limit(1).maybeSingle();
  if (!data) return NextResponse.json({ ok: true });
  try {
    await actualizarFirma({ orgId: org, solicitudId: data.id, actorId: null });
  } catch (e) {
    registrarError("firma_aviso_fallido", e, { solicitud: data.id });
  }
  return NextResponse.json({ ok: true });
}
