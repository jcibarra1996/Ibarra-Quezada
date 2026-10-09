import { formatDate, formatDateTime, SOURCE_SHORT } from '@/lib/format';
import type { WatchlistSource } from '@/types/compliance';

const STALE_DAYS = 8;

/** Estado de las listas oficiales: sin esto, un "sin coincidencias" no dice nada. */
export function ListsStatus({ sources }: { sources: WatchlistSource[] }) {
  const now = Date.now();
  const missing = sources.filter((s) => !s.last_synced_at || s.record_count === 0);

  return (
    <section className="card" aria-labelledby="lists-title">
      <p className="eyebrow">Listas oficiales</p>
      <h2 className="h2" id="lists-title">
        Contra qué se revisa
      </h2>

      {missing.length > 0 && (
        <div className="notice notice-alert" role="alert">
          <p>
            Sin cargar: {missing.map((s) => SOURCE_SHORT[s.code]).join(', ')}. Los chequeos fallan hasta correr{' '}
            <span className="mono">npm run listas:sync</span>.
          </p>
        </div>
      )}

      <ul className="sources">
        {sources.map((s) => {
          const stale = s.last_synced_at && now - new Date(s.last_synced_at).getTime() > STALE_DAYS * 86_400_000;
          return (
            <li key={s.code}>
              <div className="sources-head">
                <strong>{SOURCE_SHORT[s.code]}</strong>
                <span className="small">{s.record_count.toLocaleString('es-MX')} registros</span>
              </div>
              <div className="small">
                {s.last_synced_at ? `Descargada ${formatDateTime(s.last_synced_at)}` : 'Nunca descargada'}
                {s.list_date && ` · Fuente al ${formatSourceDate(s.list_date)}`}
              </div>
              {stale && <span className="due due-urgent">Más de {STALE_DAYS} días sin actualizar</span>}
            </li>
          );
        })}
      </ul>
      <p className="small" style={{ marginTop: 'var(--space-2)' }}>
        La Lista de Personas Bloqueadas de la UIF no está incluida: no tiene descarga pública oficial verificable.
      </p>
    </section>
  );
}

function formatSourceDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : formatDate(d);
}
