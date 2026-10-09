import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocumentStatusLabel, EntityStatusLabel, RiskLabel } from '@/components/labels';
import { dismissalKey, ScreeningCard } from '@/components/screening-report';
import { withAdmin } from '@/lib/db/server';
import { isUuid } from '@/lib/env';
import { actionLabel, daysUntil, formatDate, formatDateTime, formatPlainDate, PARTY_TYPE_LABEL } from '@/lib/format';
import type { AmlScreening, AuditLog, ComplianceDocument, LegalEntity, MatchDismissal, RelatedParty } from '@/types/compliance';
import { AmlCheckButton } from './aml-check-button';
import { DecisionForm } from './decision-form';
import { AddPartyForm, RemovePartyForm } from './party-forms';

type Params = { params: Promise<{ id: string }> };

const LOG_LIMIT = 100;
const SCREENING_LIMIT = 10;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: 'Entidad | Compliance AML' };
  const name = await withAdmin(async (db) => (await db.query<{ name: string }>('select name from public.legal_entities where id = $1', [id])).rows[0]?.name);
  return { title: `${name ?? 'Entidad'} | Compliance AML` };
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

function SectionHead({ n, eyebrow, title, id }: { n: string; eyebrow: string; title: string; id: string }) {
  return (
    <div className="section-head">
      <span className="index-number" aria-hidden="true">
        {n}
      </span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2" id={id}>
          {title}
        </h2>
      </div>
    </div>
  );
}

export default async function EntidadPage({ params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const data = await withAdmin(async (db) => {
    const entity = (await db.query<LegalEntity>('select * from public.legal_entities where id = $1', [id])).rows[0];
    if (!entity) return null;
    const [parties, screenings, documents, logs, dismissals] = await Promise.all([
      db.query<RelatedParty>('select * from public.related_parties where entity_id = $1 order by created_at', [id]),
      db.query<AmlScreening>(
        'select * from public.aml_screenings where entity_id = $1 order by last_checked_at desc limit $2',
        [id, SCREENING_LIMIT],
      ),
      db.query<ComplianceDocument>(
        'select * from public.compliance_documents where entity_id = $1 order by expiration_date asc nulls last',
        [id],
      ),
      db.query<AuditLog>('select * from public.audit_logs where entity_id = $1 order by "timestamp" desc limit $2', [id, LOG_LIMIT]),
      db.query<MatchDismissal>(
        'select subject_key, source_code, match_key, reason, actor, created_at from public.match_dismissals where entity_id = $1',
        [id],
      ),
    ]);
    return {
      entity,
      parties: parties.rows,
      screenings: screenings.rows,
      documents: documents.rows,
      logs: logs.rows,
      dismissals: new Map(dismissals.rows.map((d) => [dismissalKey(d.subject_key, d.source_code, d.match_key), d])),
    };
  });

  if (!data) notFound();
  const { entity, parties, screenings, documents, logs, dismissals } = data;
  const current = screenings[0] ?? null;

  // Personas agregadas después del último chequeo: todavía sin revisar.
  const unscreened = parties.filter((p) => !current || p.created_at > current.last_checked_at);

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
          <section className="section" style={{ marginTop: 0 }} aria-labelledby="sec-screening">
            <SectionHead n="01" eyebrow="Screening AML" title="Revisión contra listas oficiales" id="sec-screening" />
            {unscreened.length > 0 && current && (
              <div className="notice notice-alert" style={{ marginTop: 0, marginBottom: 'var(--space-2)' }}>
                <p>
                  {unscreened.map((p) => p.full_name).join(', ')} {unscreened.length === 1 ? 'se agregó' : 'se agregaron'} después
                  del último chequeo. Ejecuta uno nuevo para incluir{unscreened.length === 1 ? 'la' : 'las'}.
                </p>
              </div>
            )}
            {screenings.length === 0 ? (
              <p className="empty">Sin chequeos registrados. Agrega a las personas relacionadas y ejecuta el chequeo.</p>
            ) : (
              <div>
                {screenings.map((s, i) => (
                  <ScreeningCard key={s.id} screening={s} current={i === 0} dismissals={dismissals} />
                ))}
              </div>
            )}
          </section>

          <section className="section" aria-labelledby="sec-parties">
            <SectionHead n="02" eyebrow="Personas relacionadas" title="Quiénes están detrás" id="sec-parties" />
            <p className="body" style={{ marginBottom: 'var(--space-2)' }}>
              Representante legal, accionistas y beneficiario controlador. Cada una se revisa contra las mismas listas que la
              empresa.
            </p>
            {parties.length === 0 ? (
              <p className="empty">Sin personas registradas. Sin ellas, el chequeo solo cubre la razón social.</p>
            ) : (
              <ul className="parties">
                {parties.map((p) => (
                  <li key={p.id}>
                    <div>
                      <p className="eyebrow eyebrow-muted">{PARTY_TYPE_LABEL[p.party_type]}</p>
                      <p className="subject-name">
                        {p.full_name}
                        {p.tax_id && <span className="small mono"> · {p.tax_id}</span>}
                      </p>
                    </div>
                    <RemovePartyForm entityId={entity.id} partyId={p.id} name={p.full_name} />
                  </li>
                ))}
              </ul>
            )}
            <AddPartyForm entityId={entity.id} />
          </section>

          <section className="section" aria-labelledby="sec-docs">
            <SectionHead n="03" eyebrow="Documentos" title="Expediente documental" id="sec-docs" />
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

          <section className="section" aria-labelledby="sec-log">
            <SectionHead n="04" eyebrow="Bitácora" title="Registro inmutable" id="sec-log" />
            {logs.length === 0 ? (
              <p className="empty">Sin eventos registrados.</p>
            ) : (
              <ol className="log">
                {logs.map((l) => (
                  <li key={l.id}>
                    <div>
                      <time className="small" dateTime={new Date(l.timestamp).toISOString()}>
                        {formatDateTime(l.timestamp)}
                      </time>
                      <div className="small">{l.actor}</div>
                    </div>
                    <div>
                      <p className="log-action">{actionLabel(l.action_type)}</p>
                      <p className="body">{l.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {logs.length === LOG_LIMIT && <p className="small">Se muestran los {LOG_LIMIT} eventos más recientes.</p>}
          </section>
        </div>

        <aside className="stack-lg aside-first-mobile">
          <div className="card">
            <p className="eyebrow">Chequeo AML</p>
            <h2 className="h2">Revisar contra listas</h2>
            <p className="body" style={{ marginTop: 'var(--space-2)' }}>
              Revisa la razón social, el RFC y a cada persona relacionada contra OFAC SDN, la lista consolidada de la ONU y el
              listado 69-B del SAT. Un riesgo alto suspende la entidad de forma automática.
            </p>
            <AmlCheckButton entityId={entity.id} />
          </div>
          <div className="card">
            <DecisionForm entityId={entity.id} status={entity.status} lastRisk={current?.risk_level ?? null} />
          </div>
        </aside>
      </div>
    </>
  );
}
