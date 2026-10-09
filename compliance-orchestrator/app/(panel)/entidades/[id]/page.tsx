import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocumentStatusLabel, EntityStatusLabel, RiskLabel } from '@/components/labels';
import { isUuid } from '@/lib/env';
import { actionLabel, daysUntil, formatDate, formatDateTime, formatPlainDate } from '@/lib/format';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AmlProviderMatch, AmlScreening, Json } from '@/types/compliance';
import { AmlCheckButton } from './aml-check-button';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: 'Entidad | Compliance AML' };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('legal_entities').select('name').eq('id', id).maybeSingle();
  return { title: `${data?.name ?? 'Entidad'} | Compliance AML` };
}

function asObject(v: Json): Record<string, Json | undefined> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {};
}

function screeningDetails(s: AmlScreening) {
  const raw = asObject(s.raw_json_response);
  const matches = Array.isArray(raw.matches) ? (raw.matches as unknown as AmlProviderMatch[]) : [];
  const alerts = Array.isArray(raw.alerts) ? raw.alerts.map((a) => asObject(a as Json)) : [];
  const reference = typeof raw.reference_id === 'string' ? raw.reference_id : null;
  return { matches, alerts, reference };
}

// Texto, no etiqueta: el estado del documento ya lleva la etiqueta y el
// accent se reserva para lo que exige acción (vencido o por vencer).
function ExpirationNote({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days < 0) return <span className="due due-urgent">Venció hace {-days} {-days === 1 ? 'día' : 'días'}</span>;
  if (days === 0) return <span className="due due-urgent">Vence hoy</span>;
  if (days <= 30) return <span className="due due-urgent">Vence en {days} {days === 1 ? 'día' : 'días'}</span>;
  return null;
}

export default async function EntidadPage({ params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createSupabaseServerClient();

  const [entityRes, screeningsRes, documentsRes, logsRes] = await Promise.all([
    supabase.from('legal_entities').select('*').eq('id', id).maybeSingle(),
    supabase.from('aml_screenings').select('*').eq('entity_id', id).order('last_checked_at', { ascending: false }),
    supabase
      .from('compliance_documents')
      .select('*')
      .eq('entity_id', id)
      .order('expiration_date', { ascending: true, nullsFirst: false }),
    supabase.from('audit_logs').select('*').eq('entity_id', id).order('timestamp', { ascending: false }).limit(100),
  ]);

  const firstError = entityRes.error ?? screeningsRes.error ?? documentsRes.error ?? logsRes.error;
  if (firstError) {
    return (
      <div className="notice notice-alert" role="alert">
        <p>No pudimos leer el expediente: {firstError.message}</p>
      </div>
    );
  }

  const entity = entityRes.data;
  if (!entity) notFound();

  const screenings = screeningsRes.data ?? [];
  const documents = documentsRes.data ?? [];
  const logs = logsRes.data ?? [];
  const current = screenings[0] ?? null;

  return (
    <>
      <Link href="/entidades" className="back-link">
        ← Entidades
      </Link>

      <div className="page-head">
        <p className="eyebrow">Expediente de entidad</p>
        <h1 className="h1">{entity.name}</h1>
        <div className="meta-row">
          <EntityStatusLabel status={entity.status} />
          <RiskLabel risk={current?.risk_level ?? null} />
          <span className="small">
            <span className="mono">{entity.tax_id}</span> · {entity.country} · Alta {formatDate(entity.created_at)}
          </span>
        </div>
      </div>

      <div className="grid-2">
        <div>
          {/* 01 Screening AML */}
          <section className="section" style={{ marginTop: 0 }} aria-labelledby="sec-screening">
            <div className="section-head">
              <span className="index-number" aria-hidden="true">
                01
              </span>
              <div>
                <p className="eyebrow">Screening AML</p>
                <h2 className="h2" id="sec-screening">
                  Resultados del proveedor
                </h2>
              </div>
            </div>

            {screenings.length === 0 ? (
              <p className="empty">Sin chequeos registrados. Ejecuta el chequeo inicial desde el panel lateral.</p>
            ) : (
              <div>
                {screenings.map((s) => {
                  const { matches, alerts, reference } = screeningDetails(s);
                  return (
                    <article key={s.id} className="screening">
                      <div className="screening-head">
                        <RiskLabel risk={s.risk_level} />
                        <strong>{s.provider}</strong>
                        <span className="small">{formatDateTime(s.last_checked_at)}</span>
                      </div>
                      {reference && (
                        <p className="small" style={{ margin: '6px 0 0' }}>
                          Referencia <span className="mono">{reference}</span>
                        </p>
                      )}

                      {matches.length > 0 && (
                        <ul className="bullets">
                          {matches.map((m, i) => (
                            <li key={i}>
                              Coincidencia en <strong>{m.list}</strong> con {m.matched_name}{' '}
                              <span className="small">(score {m.score})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {matches.length === 0 && alerts.length === 0 && (
                        <p className="body" style={{ marginTop: 6 }}>
                          Sin coincidencias reportadas.
                        </p>
                      )}

                      {alerts.length > 0 && (
                        <ul className="bullets">
                          {alerts.map((a, i) => (
                            <li key={i}>
                              Alerta en <strong>{String(a.list ?? 'lista no especificada')}</strong>:{' '}
                              {String(a.description ?? '')}
                              {a.subject_name ? ` (${String(a.subject_name)})` : ''}{' '}
                              {typeof a.received_at === 'string' && (
                                <span className="small">{formatDateTime(a.received_at)}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      <details>
                        <summary>Respuesta completa</summary>
                        <pre>{JSON.stringify(s.raw_json_response, null, 2)}</pre>
                      </details>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* 02 Documentos */}
          <section className="section" aria-labelledby="sec-docs">
            <div className="section-head">
              <span className="index-number" aria-hidden="true">
                02
              </span>
              <div>
                <p className="eyebrow">Documentos</p>
                <h2 className="h2" id="sec-docs">
                  Expediente documental
                </h2>
              </div>
            </div>

            {documents.length === 0 ? (
              <p className="empty">Sin documentos registrados.</p>
            ) : (
              <div className="table-wrap">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      <th scope="col">Documento</th>
                      <th scope="col">Vigencia</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div>{d.doc_type}</div>
                          <div className="small mono">{d.file_path}</div>
                        </td>
                        <td data-label="Vigencia">
                          {d.expiration_date ? (
                            <div>
                              <div className="nowrap">{formatPlainDate(d.expiration_date)}</div>
                              <ExpirationNote date={d.expiration_date} />
                            </div>
                          ) : (
                            <span className="small">Sin vencimiento</span>
                          )}
                        </td>
                        <td data-label="Estado">
                          <DocumentStatusLabel status={d.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 03 Bitácora */}
          <section className="section" aria-labelledby="sec-log">
            <div className="section-head">
              <span className="index-number" aria-hidden="true">
                03
              </span>
              <div>
                <p className="eyebrow">Bitácora</p>
                <h2 className="h2" id="sec-log">
                  Registro inmutable
                </h2>
              </div>
            </div>

            {logs.length === 0 ? (
              <p className="empty">Sin eventos registrados.</p>
            ) : (
              <ol className="log">
                {logs.map((l) => (
                  <li key={l.id}>
                    <time className="small" dateTime={l.timestamp}>
                      {formatDateTime(l.timestamp)}
                    </time>
                    <div>
                      <p className="log-action">{actionLabel(l.action_type)}</p>
                      <p className="body">{l.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {logs.length === 100 && <p className="small">Se muestran los 100 eventos más recientes.</p>}
          </section>
        </div>

        <aside className="card aside-first-mobile">
          <p className="eyebrow">Chequeo inicial</p>
          <h2 className="h2">Consulta al proveedor AML</h2>
          <p className="body" style={{ marginTop: 'var(--space-2)' }}>
            Envía razón social y RFC al proveedor. Un resultado de riesgo alto suspende la entidad de forma automática y
            queda asentado en la bitácora.
          </p>
          {entity.status === 'suspended' && (
            <div className="notice notice-alert">
              <p>La entidad ya está suspendida. Un chequeo nuevo no la reactiva.</p>
            </div>
          )}
          <AmlCheckButton entityId={entity.id} />
        </aside>
      </div>
    </>
  );
}
