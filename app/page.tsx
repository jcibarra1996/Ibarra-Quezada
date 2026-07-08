import { createAdminClient } from "@/lib/supabase/server";
import { todayISO, weekStartISO } from "@/lib/dateHelpers";
import { HoyClient } from "@/components/HoyClient";
import type { Task, DayClose, WeeklyReward } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const supabase = createAdminClient();
  const today = todayISO();

  const [{ data: tasks }, { data: dayClose }, { data: weeklyReward }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("scheduled_for", today)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase.from("day_closes").select("*").eq("close_date", today).maybeSingle(),
    supabase.from("weekly_rewards").select("*").eq("week_start", weekStartISO()).maybeSingle(),
  ]);

  await supabase.from("activity_log").insert({ event_type: "app_opened" });

  return (
    <HoyClient
      initialTasks={(tasks as Task[]) ?? []}
      dayAlreadyClosed={Boolean((dayClose as DayClose | null)?.closed_at)}
      weeklyReward={(weeklyReward as WeeklyReward | null) ?? null}
    />
  );
}
