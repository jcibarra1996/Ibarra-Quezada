// Recordatorio de Cierre de Casa. pg_cron lo dispara 3 veces (7:30,
// 7:45, 8:00 PM) pero cada corrida revisa si ya hubo actividad desde
// las 7:30 en adelante — si sí, no reenvía.
import { assertAuthorized } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/messaging.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const unauthorized = assertAuthorized(req);
  if (unauthorized) return unauthorized;

  const supabase = supabaseAdmin();

  const windowStart = new Date();
  windowStart.setHours(19, 30, 0, 0);

  const { data: activity } = await supabase
    .from("activity_log")
    .select("id")
    .in("event_type", ["task_completed", "day_close_completed", "day_close_escape"])
    .gte("occurred_at", windowStart.toISOString())
    .limit(1);

  if (activity && activity.length > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: "activity_detected" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "";
  await sendWhatsApp(`Vacía los pendientes de Casa antes de cerrar el día 🏠\n${appUrl}`);

  await supabase.from("activity_log").insert({ event_type: "whatsapp_sent", metadata: { kind: "evening-reminder" } });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
