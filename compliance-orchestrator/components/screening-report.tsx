import { DismissForm } from '@/components/dismiss-form';
import { RiskLabel } from '@/components/labels';
import { formatDateTime, formatScore, SOURCE_SHORT } from '@/lib/format';
import type { AmlScreening, Json, MatchDismissal, ScreenedSubject, ScreeningReport, WatchlistMatch } from '@/types/compliance';

export type DismissalIndex = Map<string, MatchDismissal>;

export function dismissalKey(subjectKey: string, source: string, matchKey: string): string {
  return `${subjectKey}|${source}|${matchKey}`;
}

function isReport(v: Json): v is Json & ScreeningReport {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && (v as Record<string, unknown>).engine === 'iq-listas';
}

function asAlerts(v: Json): Record<string, Json | undefined>[] {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return [];
  const alerts = (v as Record<string, Json | undefined>).alerts;
  return Array.isArray(alerts) ? alerts.filter((a): a is Record<string, Json | undefined> => typeof a === 'object' && a !== null && !Array.isArray(a)) : [];
}

function matchReason(m: WatchlistMatch): string {
  const risk = m.original_risk ?? m.risk;
  if (m.match_type === 'rfc') {
    if (m.source === 'SAT_69B') {
      return risk === 'high'
        ? `RFC idéntico; el SAT lo publica como ${m.status}.`
        : `RFC idéntico, pero el SAT lo publica como ${m.status}. Informativo.`;
    }
    return 'RFC idéntico al publicado en la lista.';
  }
  const similar = `Nombre ${formatScore(m.score)} similar`;
  if (m.dismissed) return `${similar}.`;
  if (m.source === 'SAT_69B') return `${similar}, sin RFC que lo confirme (${m.status}). Requiere revisión.`;
  return risk === 'high' ? `${similar}.` : `${similar}. Posible homónimo, requiere revisión.`;
}

function MatchList({
  matches,
  entityId,
  subjectKey,
  canDismiss,
  dismissals,
}: {
  matches: WatchlistMatch[];
  entityId: string;
  subjectKey: string;
  canDismiss: boolean;
  dismissals: DismissalIndex;
}) {
  return (
    <ul className="matches">
      {matches.map((m) => {
        // Descartada después de este chequeo: cuenta a partir del siguiente.
        const pending = !m.dismissed ? dismissals.get(dismissalKey(subjectKey, m.source, m.match_key)) : undefined;
        const dismissedNow = m.dismissed || Boolean(pending);
        return (
        <li key={`${m.source}-${m.external_id}`} className={dismissedNow ? 'match-dismissed' : undefined}>
          <div className="match-head">
            {dismissedNow ? <span className="label label-quiet">Descartada</span> : <RiskLabel risk={m.risk} />}
            <strong>{SOURCE_SHORT[m.source]}</strong>
            <span className="small mono">#{m.external_id}</span>
          </div>
          <p className="match-name">{m.primary_name}</p>
          {m.matched_name !== m.primary_name && <p className="small">Alias coincidente: {m.matched_name}</p>}
          <p className="small">
            {matchReason(m)}
            {m.programs && ` Programa: ${m.programs}.`}
          </p>
          {m.dismissed && (
            <p className="small">
              Descartada por {m.dismissed_by}
              {m.dismissed_at && ` el ${formatDateTime(m.dismissed_at)}`}: {m.dismissal_reason}
            </p>
          )}
          {pending && (
            <p className="small">
              Descartada por {pending.actor} el {formatDateTime(pending.created_at)}: {pending.reason}{' '}
              <strong>Cuenta a partir del siguiente chequeo.</strong>
            </p>
          )}
          {canDismiss && !dismissedNow && m.match_type === 'name' && m.risk !== 'low' && (
            <DismissForm entityId={entityId} subjectKey={subjectKey} source={m.source} matchKey={m.match_key} />
          )}
        </li>
        );
      })}
    </ul>
  );
}

// El SAT publica algunos RFC más de una vez con situaciones distintas (p. ej.
// Definitivo y Sentencia Favorable). Cuál prevalece depende de los oficios;
// no se decide en automático.
function SatDuplicateNote({ subject }: { subject: ScreenedSubject }) {
  const sat = subject.matches.filter((m) => m.source === 'SAT_69B' && m.match_type === 'rfc');
  const statuses = [...new Set(sat.map((m) => m.status))];
  if (statuses.length < 2) return null;
  return (
    <div className="notice notice-alert">
      <p>
        El SAT publica este RFC en más de una situación ({statuses.join(' y ')}). Revisa los oficios y fechas de cada
        publicación antes de decidir; el sistema toma la más grave.
      </p>
    </div>
  );
}

export function ScreeningCard({
  screening,
  current,
  dismissals,
}: {
  screening: AmlScreening;
  current: boolean;
  dismissals: DismissalIndex;
}) {
  const entityId = screening.entity_id;
  const raw = screening.raw_json_response;
  const report = isReport(raw) ? raw : null;
  const alerts = asAlerts(raw);

  return (
    <article className={`screening ${current ? '' : 'screening-past'}`}>
      <div className="screening-head">
        <RiskLabel risk={screening.risk_level} />
        <strong>{current ? 'Chequeo vigente' : 'Chequeo anterior'}</strong>
        <span className="small">{formatDateTime(screening.last_checked_at)}</span>
      </div>
      <p className="small" style={{ margin: '6px 0 0' }}>
        {screening.provider}
      </p>

      {report && current && (
        <>
          {report.warnings.length > 0 && (
            <div className="notice notice-alert">
              {report.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
          <div className="subjects">
            {report.subjects.map((s, i) => (
              <section key={`${s.role}-${s.party_id ?? i}`} className="subject">
                <div className="subject-head">
                  <div>
                    <p className="eyebrow eyebrow-muted">{s.role_label}</p>
                    <p className="subject-name">
                      {s.name}
                      {s.tax_id && <span className="small mono"> · {s.tax_id}</span>}
                    </p>
                  </div>
                  <RiskLabel risk={s.risk} />
                </div>
                <SatDuplicateNote subject={s} />
                {s.matches.length === 0 ? (
                  <p className="small">Sin coincidencias en OFAC SDN, ONU ni SAT 69-B.</p>
                ) : (
                  <MatchList
                    matches={s.matches}
                    entityId={entityId}
                    subjectKey={s.party_id ?? 'entity'}
                    canDismiss={current}
                    dismissals={dismissals}
                  />
                )}
              </section>
            ))}
          </div>
          <p className="small" style={{ marginTop: 'var(--space-2)' }}>
            Listas usadas:{' '}
            {report.sources
              .map((src) => `${SOURCE_SHORT[src.code]} (descargada ${formatDateTime(src.last_synced_at)})`)
              .join(' · ')}
          </p>
        </>
      )}

      {report && !current && (
        <p className="small" style={{ margin: '6px 0 0' }}>
          {report.subjects.length} {report.subjects.length === 1 ? 'sujeto revisado' : 'sujetos revisados'},{' '}
          {report.subjects.reduce((n, s) => n + s.matches.filter((m) => !m.dismissed).length, 0)} coincidencias.
        </p>
      )}

      {alerts.length > 0 && (
        <ul className="bullets">
          {alerts.map((a, i) => (
            <li key={i}>
              Alerta externa en <strong>{String(a.list ?? 'lista no especificada')}</strong>: {String(a.description ?? '')}
              {a.subject_name ? ` (${String(a.subject_name)})` : ''}{' '}
              {typeof a.received_at === 'string' && <span className="small">{formatDateTime(a.received_at)}</span>}
            </li>
          ))}
        </ul>
      )}

      {current && (
        <details>
          <summary>Respuesta completa</summary>
          <pre>{JSON.stringify(raw, null, 2)}</pre>
        </details>
      )}
    </article>
  );
}
