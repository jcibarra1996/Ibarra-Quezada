// "¿Qué vamos a destruir hoy?" — pg_cron dispara esto a las 8:30 AM.
import { assertAuthorized } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/messaging.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const unauthorized = assertAuthorized(req);
  if (unauthorized) return unauthorized;

  const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "";
  const message = `¿Qué vamos a destruir hoy? 💥\n${appUrl}`;

  await sendWhatsApp(message);

  const supabase = supabaseAdmin();
  await supabase.from("activity_log").insert({ event_type: "whatsapp_sent", metadata: { kind: "morning-plan" } });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
