import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Magic Link público: quien recibe la tarea por WhatsApp toca "Listo"
 * sin necesitar la clave de acceso de la app. Solo puede completar la
 * tarea exacta cuyo share_token conoce — no puede listar ni ver nada más.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString(), completed_via: "magic_link" })
    .eq("share_token", token)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "no encontrada o ya resuelta" }, { status: 404 });
  }

  await supabase.from("activity_log").insert({
    event_type: "task_completed",
    context: data.context,
    metadata: { task_id: data.id, via: "magic_link" },
  });

  return NextResponse.json({ task: data });
}
