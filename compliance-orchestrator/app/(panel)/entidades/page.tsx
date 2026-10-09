import type { Metadata } from 'next';
import Link from 'next/link';
import { EntityStatusLabel, RiskLabel } from '@/components/labels';
import { ListsStatus } from '@/components/lists-status';
import { withAdmin } from '@/lib/db/server';
import { ENTITY_STATUS_PLURAL, formatDate, formatDateTime } from '@/lib/format';
import { ENTITY_STATUSES, type EntityStatus, type LegalEntity, type RiskLevel, type WatchlistSource } from '@/types/compliance';
import { NewEntityForm } from './new-entity-form';

export const metadata: Metadata = { title: 'Entidades | Compliance AML' };

const PAGE_LIMIT = 200;

type Row = LegalEntity & { risk_level: RiskLevel | null; last_checked_at: Date | null; parties: number };

function isStatus(v: unknown): v is EntityStatus {
  return typeof v === 'string' && (ENTITY_STATUSES as readonly string[]).includes(v);
}

export default async function EntidadesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const filter = isStatus(estado) ? estado : null;

  const { entities, counts, sources } = await withAdmin(async (db) => {
    const entities = (
      await db.query<Row>(
        `select e.*, s.risk_level, s.last_checked_at,
                (select count(*)::int from public.related_parties p where p.entity_id = e.id) as parties
           from public.legal_entities e
           left join lateral (
             select risk_level, last_checked_at
               from public.aml_screenings
              where entity_id = e.id
              order by last_checked_at desc
              limit 1
           ) s on true
          where $1::public.entity_status is null or e.status = $1
          order by e.created_at desc
          limit $2`,
        [filter, PAGE_LIMIT],
      )
    ).rows;
    const counts = (
      await db.query<{ status: EntityStatus; n: number }>(
        'select status, count(*)::int as n from public.legal_entities group by status',
      )
    ).rows;
    const sources = (
      await db.query<WatchlistSource>(
        'select code, name, source_url, list_date, record_count, last_synced_at from public.watchlist_sources order by code',
      )
    ).rows;
    return { entities, counts: new Map(counts.map((c) => [c.status, c.n])), sources };
  });

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
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
            ? 'Todavía no hay entidades registradas. Da de alta la primera contraparte para correr su chequeo.'
            : `${total} ${total === 1 ? 'entidad registrada' : 'entidades registradas'}. ${
                suspended > 0
                  ? `${suspended} ${suspended === 1 ? 'está suspendida' : 'están suspendidas'} y ${suspended === 1 ? 'requiere' : 'requieren'} revisión.`
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
              <Link key={s} className="tab" href={`/entidades?estado=${s}`} aria-current={filter === s ? 'page' : undefined}>
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
                  {entities.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div>
                          <Link className="row-link" href={`/entidades/${e.id}`}>
                            {e.name}
                          </Link>
                          <div className="small">
                            <span className="mono">{e.tax_id}</span> · {e.country} · Alta {formatDate(e.created_at)}
                            {e.parties > 0 && ` · ${e.parties} ${e.parties === 1 ? 'persona' : 'personas'}`}
                          </div>
                        </div>
                      </td>
                      <td data-label="Estado">
                        <EntityStatusLabel status={e.status} />
                      </td>
                      <td data-label="Riesgo">
                        <RiskLabel risk={e.risk_level} />
                      </td>
                      <td data-label="Chequeo" className="small nowrap">
                        {e.last_checked_at ? formatDateTime(e.last_checked_at) : 'Sin registro'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entities.length === PAGE_LIMIT && <p className="small">Se muestran las {PAGE_LIMIT} altas más recientes.</p>}
            </div>
          )}
        </section>

        <aside className="stack-lg">
          <NewEntityForm />
          <ListsStatus sources={sources} />
        </aside>
      </div>
    </>
  );
}
