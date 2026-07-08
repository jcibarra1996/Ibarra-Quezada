import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { assignSmartTags } from "@/lib/smartTags";
import { todayISO } from "@/lib/dateHelpers";
import type { Context } from "@/lib/types";

// Captura Cero Fricción: crea una tarea para "Hoy" desde el campo
// gigante siempre activo de la pantalla principal.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const context: Context = body?.context === "trabajo" ? "trabajo" : "casa";

  if (!title) {
    return NextResponse.json({ error: "title requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const smart_tags = assignSmartTags(title, context);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      context,
      smart_tags,
      scheduled_for: todayISO(),
      source: "manual",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    event_type: "task_created",
    context,
    metadata: { task_id: data.id, source: "manual" },
  });

  return NextResponse.json({ task: data }, { status: 201 });
}
