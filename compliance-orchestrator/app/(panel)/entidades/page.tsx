import type { Metadata } from 'next';
import Link from 'next/link';
import { EntityStatusLabel, RiskLabel } from '@/components/labels';
import { ENTITY_STATUS_PLURAL, formatDate, formatDateTime } from '@/lib/format';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ENTITY_STATUSES, type EntityStatus, type RiskLevel } from '@/types/compliance';
import { NewEntityForm } from './new-entity-form';

export const metadata: Metadata = { title: 'Entidades | Compliance AML' };

const PAGE_LIMIT = 200;

type LatestScreening = { risk_level: RiskLevel; last_checked_at: string };

function isStatus(v: unknown): v is EntityStatus {
  return typeof v === 'string' && (ENTITY_STATUSES as readonly string[]).includes(v);
}

export default async function EntidadesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const filter = isStatus(estado) ? estado : null;

  const supabase = await createSupabaseServerClient();

  let query = supabase.from('legal_entities').select('*').order('created_at', { ascending: false }).limit(PAGE_LIMIT);
  if (filter) query = query.eq('status', filter);

  const [entitiesRes, countsRes] = await Promise.all([query, supabase.from('legal_entities').select('status')]);

  if (entitiesRes.error || countsRes.error) {
    return (
      <div className="notice notice-alert" role="alert">
        <p>No pudimos leer las entidades: {(entitiesRes.error ?? countsRes.error)?.message}</p>
      </div>
    );
  }

  const entities = entitiesRes.data;
  const counts = new Map<EntityStatus, number>();
  for (const row of countsRes.data) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  const total = countsRes.data.length;

  // Último screening por entidad (la lista viene ordenada de más reciente a más antiguo).
  const latest = new Map<string, LatestScreening>();
  if (entities.length > 0) {
    const { data: screenings, error } = await supabase
      .from('aml_screenings')
      .select('entity_id, risk_level, last_checked_at')
      .in(
        'entity_id',
        entities.map((e) => e.id),
      )
      .order('last_checked_at', { ascending: false });

    if (error) {
      return (
        <div className="notice notice-alert" role="alert">
          <p>No pudimos leer los screenings: {error.message}</p>
        </div>
      );
    }
    for (const s of screenings) {
      if (!latest.has(s.entity_id)) latest.set(s.entity_id, { risk_level: s.risk_level, last_checked_at: s.last_checked_at });
    }
  }

  const suspended = counts.get('suspended') ?? 0;

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">Onboarding y proveedores</p>
        <h1 className="h1">
          Entidades bajo <span className="keyword">revisión AML</span>.
        </h1>
        <p className="body">
          {total === 0
            ? 'Todavía no hay entidades registradas. Da de alta la primera contraparte para correr su chequeo inicial.'
            : `${total} ${total === 1 ? 'entidad registrada' : 'entidades registradas'}. ${
                suspended > 0
                  ? `${suspended} ${suspended === 1 ? 'está suspendida' : 'están suspendidas'} por riesgo alto o alerta de monitoreo.`
                  : 'Ninguna suspendida.'
              }`}
        </p>
      </div>

      <div className="grid-2">
        <section aria-label="Lista de entidades">
          <nav className="tabs" aria-label="Filtrar por estado">
            <Link className="tab" href="/entidades" aria-current={filter === null ? 'page' : undefined}>
              Todas<span className="tab-count">{total}</span>
            </Link>
            {ENTITY_STATUSES.map((s) => (
              <Link
                key={s}
                className="tab"
                href={`/entidades?estado=${s}`}
                aria-current={filter === s ? 'page' : undefined}
              >
                {ENTITY_STATUS_PLURAL[s]}
                <span className="tab-count">{counts.get(s) ?? 0}</span>
              </Link>
            ))}
          </nav>

          {entities.length === 0 ? (
            <p className="empty">{filter ? 'No hay entidades con este estado.' : 'Sin entidades registradas.'}</p>
          ) : (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th scope="col">Entidad</th>
                    <th scope="col">Estado</th>
                    <th scope="col" className="nowrap">Último riesgo</th>
                    <th scope="col" className="nowrap">Último chequeo</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((e) => {
                    const s = latest.get(e.id);
                    return (
                      <tr key={e.id}>
                        <td>
                          <div>
                            <Link className="row-link" href={`/entidades/${e.id}`}>
                              {e.name}
                            </Link>
                            <div className="small">
                              <span className="mono">{e.tax_id}</span> · {e.country} · Alta {formatDate(e.created_at)}
                            </div>
                          </div>
                        </td>
                        <td data-label="Estado">
                          <EntityStatusLabel status={e.status} />
                        </td>
                        <td data-label="Riesgo">
                          <RiskLabel risk={s?.risk_level ?? null} />
                        </td>
                        <td data-label="Chequeo" className="small nowrap">
                          {s ? formatDateTime(s.last_checked_at) : 'Sin registro'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {entities.length === PAGE_LIMIT && (
                <p className="small">Se muestran las {PAGE_LIMIT} altas más recientes.</p>
              )}
            </div>
          )}
        </section>

        <aside>
          <NewEntityForm />
        </aside>
      </div>
    </>
  );
}
