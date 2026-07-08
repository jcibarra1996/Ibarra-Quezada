// El Sobre: viernes 5PM, si lunes-viernes tuvieron Cierre de Día con
// más de 80% de efectividad en promedio, desbloquea la recompensa.
import { assertAuthorized } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const SKINS = ["cian", "magenta", "acido", "menta"];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

Deno.serve(async (req) => {
  const unauthorized = assertAuthorized(req);
  if (unauthorized) return unauthorized;

  const supabase = supabaseAdmin();
  const monday = mondayOfCurrentWeek();
  const weekdayDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return isoDate(d);
  });

  const { data: closes, error } = await supabase
    .from("day_closes")
    .select("close_date, closed_at, effectiveness")
    .in("close_date", weekdayDates);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const allClosed =
    weekdayDates.length === (closes?.length ?? 0) && closes!.every((c) => c.closed_at !== null);

  const average = closes && closes.length > 0
    ? closes.reduce((sum, c) => sum + Number(c.effectiveness), 0) / closes.length
    : 0;

  const unlocked = allClosed && average > 80;

  if (!unlocked) {
    return new Response(JSON.stringify({ ok: true, unlocked: false, average }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const skin_id = SKINS[Math.floor(Math.random() * SKINS.length)];

  const { error: upsertError } = await supabase.from("weekly_rewards").upsert(
    {
      week_start: isoDate(monday),
      unlocked: true,
      unlocked_at: new Date().toISOString(),
      skin_id,
    },
    { onConflict: "week_start" }
  );

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, unlocked: true, average, skin_id }), {
    headers: { "Content-Type": "application/json" },
  });
});
