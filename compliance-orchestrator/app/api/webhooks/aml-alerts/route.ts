import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { errorMessage, isUuid } from '@/lib/env';
import { PG, pgCode, withTx } from '@/lib/db/pool';
import type { ActionResult, AmlAlert, AmlAlertWebhookPayload, ScreeningOutcome } from '@/types/compliance';

const DEFAULT_PROVIDER = 'Proveedor externo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;

type Result = ActionResult<ScreeningOutcome>;

function reply(status: number, body: Result) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function fail(status: number, error: string) {
  return reply(status, { success: false, data: null, error });
}

/** Comparación en tiempo constante (los hashes igualan longitudes). */
function tokenMatches(received: string, expected: string): boolean {
  const a = createHash('sha256').update(received).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function isNonEmptyString(v: unknown, max = 2000): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

function parsePayload(body: unknown): AmlAlertWebhookPayload | string {
  if (typeof body !== 'object' || body === null) return 'El cuerpo debe ser un objeto JSON';
  const b = body as Record<string, unknown>;

  if (!isUuid(b.entity_id)) return 'entity_id debe ser un UUID válido';
  if (b.provider !== undefined && !isNonEmptyString(b.provider, 100)) return 'provider inválido';

  if (typeof b.alert !== 'object' || b.alert === null) return 'alert es obligatorio';
  const a = b.alert as Record<string, unknown>;
  if (!isNonEmptyString(a.list, 200)) return 'alert.list es obligatorio';
  if (!isNonEmptyString(a.description)) return 'alert.description es obligatorio';
  for (const key of ['subject_name', 'external_id', 'detected_at'] as const) {
    if (a[key] !== undefined && !isNonEmptyString(a[key], 500)) return `alert.${key} inválido`;
  }

  const alert: AmlAlert = {
    list: a.list,
    description: a.description,
    ...(a.subject_name !== undefined && { subject_name: a.subject_name as string }),
    ...(a.external_id !== undefined && { external_id: a.external_id as string }),
    ...(a.detected_at !== undefined && { detected_at: a.detected_at as string }),
  };

  return {
    entity_id: b.entity_id,
    ...(b.provider !== undefined && { provider: b.provider as string }),
    alert,
  };
}

/**
 * POST /api/webhooks/aml-alerts
 * Authorization: Bearer <AML_WEBHOOK_SECRET>
 * { "entity_id": "<uuid>", "provider"?: "ComplyAdvantage",
 *   "alert": { "list": "OFAC SDN", "description": "...", "subject_name"?: "...",
 *              "external_id"?: "...", "detected_at"?: "..." } }
 *
 * En una sola transacción (RPC apply_aml_alert): actualiza el screening,
 * suspende la entidad y escribe la bitácora inmutable.
 */
export async function POST(request: NextRequest) {
  // 1. Autorización
  const secret = process.env.AML_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) {
    console.error('[aml-alerts] AML_WEBHOOK_SECRET ausente o menor a 32 caracteres');
    return fail(500, 'Webhook no configurado');
  }

  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1] || !tokenMatches(match[1].trim(), secret)) {
    return fail(401, 'No autorizado');
  }

  // 2. Payload
  let payload: AmlAlertWebhookPayload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return fail(413, 'Payload demasiado grande');

    const parsed = parsePayload(JSON.parse(raw));
    if (typeof parsed === 'string') return fail(400, parsed);
    payload = parsed;
  } catch {
    return fail(400, 'JSON inválido');
  }

  // 3, 4 y 5. Screening + suspensión + bitácora, atómico
  try {
    const provider = payload.provider ?? DEFAULT_PROVIDER;
    const outcome = await withTx({ role: 'system', actor: `webhook ${provider}` }, async (db) =>
      (
        await db.query<{ r: ScreeningOutcome }>('select public.apply_aml_alert($1, $2, $3::jsonb) as r', [
          payload.entity_id,
          provider,
          JSON.stringify(payload.alert),
        ])
      ).rows[0]?.r,
    );
    if (!outcome) throw new Error('apply_aml_alert no devolvió resultado');

    return reply(200, { success: true, data: outcome, error: null });
  } catch (err) {
    if (pgCode(err) === PG.noDataFound) return fail(404, `Entidad ${payload.entity_id} no existe`);
    // 500 para que el proveedor reintente: la transacción se revirtió completa.
    // El detalle va al log, no al tercero que llama.
    console.error('[aml-alerts] persistencia', payload.entity_id, errorMessage(err), err);
    return fail(500, 'No se pudo registrar la alerta; reintentar');
  }
}
