// Tareas Fantasma: materializa recurring_tasks como tasks reales en
// "Hoy" cuando corresponde, para que el usuario no tenga que recordarlas.
import { assertAuthorized } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

interface RecurringTask {
  id: string;
  title: string;
  context: "trabajo" | "casa";
  smart_tags: string[];
  recurrence: "monthly" | "weekly" | "interval";
  day_of_month: number | null;
  day_of_week: number | null;
  interval_days: number | null;
  last_injected_date: string | null;
  active: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function shouldFireToday(rt: RecurringTask): boolean {
  if (rt.last_injected_date === todayISO()) return false; // ya inyectada hoy

  const now = new Date();

  if (rt.recurrence === "monthly" && rt.day_of_month) {
    const lastDay = daysInCurrentMonth();
    const target = Math.min(rt.day_of_month, lastDay); // ej. día 31 en febrero -> últ. día
    return now.getDate() === target;
  }

  if (rt.recurrence === "weekly" && rt.day_of_week !== null) {
    return now.getDay() === rt.day_of_week;
  }

  if (rt.recurrence === "interval" && rt.interval_days) {
    if (!rt.last_injected_date) return true; // primera vez
    const last = new Date(rt.last_injected_date + "T00:00:00");
    const diffDays = Math.floor((now.getTime() - last.getTime()) / 86_400_000);
    return diffDays >= rt.interval_days;
  }

  return false;
}

Deno.serve(async (req) => {
  const unauthorized = assertAuthorized(req);
  if (unauthorized) return unauthorized;

  const supabase = supabaseAdmin();
  const { data: recurringTasks, error } = await supabase
    .from("recurring_tasks")
    .select("*")
    .eq("active", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const today = todayISO();
  let injected = 0;

  for (const rt of (recurringTasks as RecurringTask[]) ?? []) {
    if (!shouldFireToday(rt)) continue;

    const { error: insertError } = await supabase.from("tasks").insert({
      title: rt.title,
      context: rt.context,
      smart_tags: rt.smart_tags,
      scheduled_for: today,
      source: "recurring",
      recurring_task_id: rt.id,
    });

    if (insertError) {
      console.error("ghost-tasks insert error", rt.id, insertError.message);
      continue;
    }

    await supabase.from("recurring_tasks").update({ last_injected_date: today }).eq("id", rt.id);
    injected += 1;
  }

  return new Response(JSON.stringify({ ok: true, injected }), {
    headers: { "Content-Type": "application/json" },
  });
});
