import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { todayISO, tomorrowISO } from "@/lib/dateHelpers";
import type { DayCloseDecision } from "@/lib/types";

/**
 * El Cierre Forzoso: aplica la decisión manual del usuario para cada
 * tarea pendiente de hoy (reprogramar / programar fecha / eliminar) y
 * cierra el día con su efectividad.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const decisions: DayCloseDecision[] = Array.isArray(body?.decisions) ? body.decisions : [];

  const supabase = createAdminClient();
  const today = todayISO();

  const { data: todaysTasks, error: fetchError } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("scheduled_for", today)
    .neq("status", "archived");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const total = todaysTasks?.length ?? 0;
  const completed = todaysTasks?.filter((t) => t.status === "completed").length ?? 0;

  for (const decision of decisions) {
    if (decision.action === "reprogramar_manana") {
      await supabase
        .from("tasks")
        .update({ scheduled_for: tomorrowISO(), status: "pending" })
        .eq("id", decision.taskId);
    } else if (decision.action === "programar_fecha") {
      await supabase
        .from("tasks")
        .update({ scheduled_for: decision.date, status: "pending" })
        .eq("id", decision.taskId);
    } else if (decision.action === "eliminar") {
      await supabase.from("tasks").delete().eq("id", decision.taskId);
    }
  }

  const effectiveness = total === 0 ? 100 : Math.round((completed / total) * 10000) / 100;

  const { data: dayClose, error: closeError } = await supabase
    .from("day_closes")
    .upsert(
      {
        close_date: today,
        closed_at: new Date().toISOString(),
        total_tasks: total,
        completed_tasks: completed,
        effectiveness,
        used_escape_button: false,
      },
      { onConflict: "close_date" }
    )
    .select()
    .single();

  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    event_type: "day_close_completed",
    metadata: { effectiveness, total, completed },
  });

  return NextResponse.json({ dayClose });
}
