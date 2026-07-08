import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { assignSmartTags, inferContext } from "@/lib/smartTags";
import { todayISO } from "@/lib/dateHelpers";
import type { Context } from "@/lib/types";

/**
 * Atajo de Voz (Siri Shortcuts): el Atajo nativo de iOS manda el texto
 * dictado desde la pantalla de bloqueo. No hay cookie de sesión en ese
 * contexto, así que se protege con un header secreto fijo en vez del
 * gate normal (ver middleware.ts, que excluye esta ruta).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.QUICK_ADD_SECRET;
  const provided = req.headers.get("x-quick-add-secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let text = "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    text = typeof body?.text === "string" ? body.text : "";
  } else {
    text = (await req.text()).trim();
  }

  text = text.trim();
  if (!text) {
    return NextResponse.json({ error: "texto vacío" }, { status: 400 });
  }

  const context: Context = inferContext(text);
  const smart_tags = assignSmartTags(text, context);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: text,
      context,
      smart_tags,
      scheduled_for: todayISO(),
      source: "quick_add",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    event_type: "task_created",
    context,
    metadata: { task_id: data.id, source: "quick_add" },
  });

  return NextResponse.json({ ok: true, task: data });
}
