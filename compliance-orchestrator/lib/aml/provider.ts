import 'server-only';

import type { AmlProviderMatch, AmlProviderRequest, AmlProviderResponse, RiskLevel } from '@/types/compliance';
import { RISK_LEVELS } from '@/types/compliance';

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const MOCK_BASE_URL = 'https://aml-mock.local';

export function amlProviderName(): string {
  return process.env.AML_PROVIDER_NAME || 'ComplyAdvantage';
}

/**
 * Consulta al proveedor AML por REST (POST /v1/screenings con nombre y RFC).
 * Si AML_PROVIDER_URL no está configurado, la misma llamada se resuelve con
 * mockAmlFetch, así el flujo completo (headers, status HTTP, parseo,
 * validación) se ejercita igual que contra el proveedor real.
 */
export async function screenEntity(
  request: AmlProviderRequest,
  fetchImpl?: FetchLike,
): Promise<AmlProviderResponse> {
  const baseUrl = process.env.AML_PROVIDER_URL || MOCK_BASE_URL;
  const doFetch: FetchLike = fetchImpl ?? (process.env.AML_PROVIDER_URL ? fetch : mockAmlFetch);
  const timeoutMs = Number(process.env.AML_PROVIDER_TIMEOUT_MS) || 10_000;

  const res = await doFetch(`${baseUrl}/v1/screenings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AML_PROVIDER_API_KEY ?? ''}`,
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Proveedor AML respondió ${res.status}: ${body.slice(0, 300)}`);
  }

  return parseProviderResponse(await res.json());
}

function parseProviderResponse(body: unknown): AmlProviderResponse {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Respuesta del proveedor AML no es un objeto JSON');
  }
  const b = body as Record<string, unknown>;
  if (typeof b.reference_id !== 'string') {
    throw new Error('Respuesta del proveedor AML sin reference_id');
  }
  if (!RISK_LEVELS.includes(b.risk_level as RiskLevel)) {
    throw new Error(`risk_level inválido del proveedor AML: ${String(b.risk_level)}`);
  }
  if (!Array.isArray(b.matches)) {
    throw new Error('Respuesta del proveedor AML sin matches');
  }
  return {
    reference_id: b.reference_id,
    risk_level: b.risk_level as RiskLevel,
    matches: b.matches as AmlProviderMatch[],
    checked_at: typeof b.checked_at === 'string' ? b.checked_at : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

/**
 * Sustituto de fetch que simula al proveedor. Determinístico para poder
 * probar cada rama:
 *   - nombre contiene "SANCION" u "OFAC"  -> high (coincidencia en lista)
 *   - nombre contiene "PEP"               -> medium (persona políticamente expuesta)
 *   - nombre contiene "TIMEOUT"           -> HTTP 503 (falla del proveedor)
 *   - cualquier otro                      -> low, sin coincidencias
 * Son datos ficticios: no consulta ninguna lista real.
 */
export async function mockAmlFetch(_input: string, init: RequestInit): Promise<Response> {
  const req = JSON.parse(String(init.body)) as AmlProviderRequest;
  const name = req.name.toUpperCase();

  if (name.includes('TIMEOUT')) {
    return new Response(JSON.stringify({ error: 'upstream unavailable' }), { status: 503 });
  }

  let risk_level: RiskLevel = 'low';
  const matches: AmlProviderMatch[] = [];

  if (name.includes('SANCION') || name.includes('OFAC')) {
    risk_level = 'high';
    matches.push({ list: 'MOCK-SANCTIONS', matched_name: req.name, score: 0.97 });
  } else if (name.includes('PEP')) {
    risk_level = 'medium';
    matches.push({ list: 'MOCK-PEP', matched_name: req.name, score: 0.81 });
  }

  const body: AmlProviderResponse = {
    reference_id: `mock_${crypto.randomUUID()}`,
    risk_level,
    matches,
    checked_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
