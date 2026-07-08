import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dateHelpers";

/**
 * "Hoy no tengo energía": archiva todo lo pendiente de hoy en el baúl
 * oculto (Pendientes Archivados) sin culpa, sin decisiones, sin fricción.
 */
export async function POST() {
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
  const pendingIds = (todaysTasks ?? []).filter((t) => t.status === "pending").map((t) => t.id);

  if (pendingIds.length > 0) {
    await supabase
      .from("tasks")
      .update({ status: "archived", archived_at: new Date().toISOString(), archive_reason: "no_energy" })
      .in("id", pendingIds);
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
        used_escape_button: true,
      },
      { onConflict: "close_date" }
    )
    .select()
    .single();

  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    event_type: "day_close_escape",
    metadata: { archived: pendingIds.length },
  });

  return NextResponse.json({ dayClose });
}
