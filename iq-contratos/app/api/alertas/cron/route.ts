import { NextResponse } from "next/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { avisosDeHoy } from "@/lib/fechas/avisos";
import { enviarAviso, redactarAviso } from "@/lib/alertas/correo";
import { env } from "@/lib/env";
import { registrar } from "@/lib/log";

export const runtime = "nodejs";

// Tarea diaria de avisos (preparada para Vercel Cron). Mientras ALERTAS_CORREO_ACTIVAS no
// sea "true", solo calcula qué avisos tocarían hoy y no envía nada.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const db = clienteSistema();
  const { data } = await db
    .from("alerts")
    .select("id, titulo, fecha_limite, avisos_dias, estado, contract_id, contracts(titulo, contraparte), areas(nombre, correo_aviso)")
    .eq("estado", "activa");
  const avisos = avisosDeHoy(data ?? [], hoy);

  if (!env.correoAlertasActivo()) {
    registrar("avisos_simulados", { avisos: avisos.length });
    return NextResponse.json({ enviados: 0, pendientes: avisos.length, correoActivo: false });
  }

  let enviados = 0;
  const base = new URL(request.url).origin;
  for (const { alerta, dias } of avisos) {
    const area = alerta.areas as unknown as { nombre: string; correo_aviso: string | null } | null;
    const contrato = alerta.contracts as unknown as { titulo: string; contraparte: string } | null;
    if (!area?.correo_aviso) continue;
    await enviarAviso(
      redactarAviso({
        area: area.nombre,
        correo: area.correo_aviso,
        titulo: alerta.titulo,
        contrato: contrato?.titulo ?? "",
        contraparte: contrato?.contraparte ?? "",
        fechaLimite: alerta.fecha_limite,
        dias,
        enlace: `${base}/contratos/${alerta.contract_id}`,
      }),
    );
    enviados++;
  }
  registrar("avisos_enviados", { enviados });
  return NextResponse.json({ enviados, pendientes: avisos.length - enviados, correoActivo: true });
}
