// Descarga las listas oficiales, las carga en la base y re-chequea las
// entidades activas contra la versión nueva.
//   npm run listas:sync                 (las tres listas + re-chequeo)
//   npm run listas:sync -- --sin-rechequeo
//   npm run listas:sync -- --desde-dir=/ruta   (archivos ya descargados)
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type pg from 'pg';
import { getPool, withTx } from '../lib/db/pool.ts';
import { parseOfacSdn, parseSat69b, parseUnConsolidated, type ParsedList, type WatchlistRecord } from '../lib/watchlists/parsers.ts';

const SOURCES = {
  OFAC_SDN: {
    urls: ['https://www.treasury.gov/ofac/downloads/sdn.csv', 'https://www.treasury.gov/ofac/downloads/alt.csv'],
    files: ['sdn.csv', 'alt.csv'],
    minRecords: 5000,
  },
  UN_CONSOLIDATED: {
    urls: ['https://scsanctions.un.org/resources/xml/sp/consolidated.xml'],
    files: ['un.xml'],
    minRecords: 500,
  },
  SAT_69B: {
    // El servidor del SAT corta la conexión por https; solo responde por http.
    urls: ['http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv'],
    files: ['69b.csv'],
    minRecords: 5000,
  },
} as const;

type SourceCode = keyof typeof SOURCES;

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k ?? '', v ?? 'true'] as const;
  }),
);
const fromDir = args.get('desde-dir');
const rescreen = !args.has('sin-rechequeo');

interface Download {
  bodies: Uint8Array[];
  lastModified: string | null;
}

async function download(code: SourceCode): Promise<Download> {
  const src = SOURCES[code];
  if (fromDir) {
    const bodies = await Promise.all(src.files.map(async (f) => new Uint8Array(await readFile(join(fromDir, f)))));
    return { bodies, lastModified: null };
  }
  let lastModified: string | null = null;
  const bodies: Uint8Array[] = [];
  for (const url of src.urls) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IQ-Compliance/1.0)' },
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
    lastModified ??= res.headers.get('last-modified');
    bodies.push(new Uint8Array(await res.arrayBuffer()));
  }
  return { bodies, lastModified };
}

function parse(code: SourceCode, dl: Download): ParsedList {
  const utf8 = (b: Uint8Array | undefined) => new TextDecoder('utf-8').decode(b);
  switch (code) {
    case 'OFAC_SDN':
      // OFAC no declara fecha en el CSV; se usa Last-Modified del servidor.
      return parseOfacSdn(new TextDecoder('windows-1252').decode(dl.bodies[0]), new TextDecoder('windows-1252').decode(dl.bodies[1]), dl.lastModified);
    case 'UN_CONSOLIDATED':
      return parseUnConsolidated(utf8(dl.bodies[0]));
    case 'SAT_69B':
      return parseSat69b(dl.bodies[0] ?? new Uint8Array());
  }
}

const BATCH = 2000;

async function insertBatch(db: pg.PoolClient, code: SourceCode, batch: WatchlistRecord[]) {
  await db.query(
    `with src as (
       select * from jsonb_to_recordset($2::jsonb)
         as x(external_id text, primary_name text, entity_kind text, tax_ids text[],
              status text, programs text, details jsonb, names text[])
     ),
     ins as (
       insert into public.watchlist_entries (source_code, external_id, primary_name, entity_kind, tax_ids, status, programs, details)
       select $1, external_id, primary_name, entity_kind, coalesce(tax_ids, '{}'), status, programs, coalesce(details, '{}')
         from src
       returning id, external_id
     )
     insert into public.watchlist_names (entry_id, name)
     select ins.id, n.name
       from ins
       join src using (external_id)
       cross join lateral unnest(src.names) as n(name)`,
    [code, JSON.stringify(batch)],
  );
}

async function syncSource(code: SourceCode): Promise<boolean> {
  const started = Date.now();
  const dl = await download(code);
  const sha = createHash('sha256');
  for (const b of dl.bodies) sha.update(b);
  const digest = sha.digest('hex');

  const parsed = parse(code, dl);
  const count = parsed.records.length;
  const src = SOURCES[code];

  return withTx({ role: 'system', actor: 'sincronización de listas' }, async (db) => {
    const prev = (
      await db.query<{ record_count: number; content_sha256: string | null; last_synced_at: Date | null }>(
        'select record_count, content_sha256, last_synced_at from public.watchlist_sources where code = $1 for update',
        [code],
      )
    ).rows[0];
    if (!prev) throw new Error(`Fuente ${code} no registrada; corre las migraciones.`);

    if (prev.content_sha256 === digest && prev.last_synced_at) {
      await db.query('update public.watchlist_sources set last_synced_at = now() where code = $1', [code]);
      console.log(`${code}: sin cambios (${prev.record_count} registros).`);
      return false;
    }

    // Protección contra descargas truncadas o cambios de formato: no se
    // reemplaza una lista buena por una sospechosamente corta.
    if (count < src.minRecords || (prev.record_count > 0 && count < prev.record_count * 0.5)) {
      throw new Error(`${code}: ${count} registros, se esperaban al menos ${Math.max(src.minRecords, Math.ceil(prev.record_count * 0.5))}. No se reemplaza la lista.`);
    }

    await db.query('delete from public.watchlist_entries where source_code = $1', [code]);
    for (let i = 0; i < count; i += BATCH) {
      await insertBatch(db, code, parsed.records.slice(i, i + BATCH));
    }
    await db.query(
      `update public.watchlist_sources
          set record_count = $2, content_sha256 = $3, list_date = $4, last_synced_at = now()
        where code = $1`,
      [code, count, digest, parsed.listDate],
    );
    console.log(`${code}: ${count} registros cargados (${parsed.listDate ?? 'sin fecha declarada'}) en ${((Date.now() - started) / 1000).toFixed(1)} s.`);
    return true;
  });
}

async function rescreenAll() {
  const ids = await withTx({ role: 'system', actor: 'sincronización de listas' }, async (db) =>
    (await db.query<{ id: string }>("select id from public.legal_entities where status <> 'rejected' order by created_at")).rows.map((r) => r.id),
  );
  let high = 0;
  for (const id of ids) {
    const outcome = await withTx({ role: 'system', actor: 're-chequeo periódico' }, async (db) =>
      (await db.query<{ r: { screening: { risk_level: string }; previous_status: string; entity_status: string } }>(
        "select public.run_aml_screening($1, 'aml.periodic_check') as r",
        [id],
      )).rows[0]?.r,
    );
    if (outcome?.screening.risk_level === 'high') high++;
    if (outcome && outcome.previous_status !== outcome.entity_status) {
      console.log(`  ${id}: ${outcome.previous_status} -> ${outcome.entity_status}`);
    }
  }
  console.log(`Re-chequeo: ${ids.length} entidades, ${high} con riesgo alto.`);
}

async function main() {
  const failures: string[] = [];
  let changed = false;
  for (const code of Object.keys(SOURCES) as SourceCode[]) {
    try {
      changed = (await syncSource(code)) || changed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${code}: ERROR ${msg}`);
      failures.push(`${code}: ${msg}`);
    }
  }

  if (rescreen && changed) {
    await rescreenAll();
  } else if (rescreen) {
    console.log('Re-chequeo omitido: ninguna lista cambió.');
  }

  await getPool().end();
  if (failures.length > 0) {
    // Código de salida distinto de cero para que el cron lo marque como fallido.
    console.error(`Fallaron ${failures.length} fuente(s). Las demás quedaron actualizadas.`);
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await getPool().end().catch(() => {});
  process.exit(1);
});
