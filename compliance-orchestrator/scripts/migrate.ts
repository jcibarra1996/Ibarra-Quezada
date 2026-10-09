// Aplica las migraciones de db/migrations en orden, una transacción por
// archivo, y registra cada una en schema_migrations.
//   npm run db:migrate
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getPool } from '../lib/db/pool.ts';

const dir = join(import.meta.dirname, '..', 'db', 'migrations');

async function main() {
  const pool = getPool();
  await pool.query(`create table if not exists public.schema_migrations (
    filename text primary key,
    sha256 text not null,
    applied_at timestamptz not null default now()
  )`);

  const applied = new Map<string, string>(
    (await pool.query<{ filename: string; sha256: string }>('select filename, sha256 from public.schema_migrations')).rows.map(
      (r) => [r.filename, r.sha256],
    ),
  );

  const files = (await readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  for (const file of files) {
    const sql = await readFile(join(dir, file), 'utf8');
    const sha = createHash('sha256').update(sql).digest('hex');

    if (applied.has(file)) {
      if (applied.get(file) !== sha) {
        throw new Error(`${file} ya se aplicó y cambió después. Crea una migración nueva en lugar de editarla.`);
      }
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query("select set_config('app.role', 'system', true), set_config('app.actor', 'migración', true)");
      await client.query(sql);
      await client.query('insert into public.schema_migrations (filename, sha256) values ($1, $2)', [file, sha]);
      await client.query('commit');
      console.log(`aplicada ${file}`);
    } catch (err) {
      await client.query('rollback').catch(() => {});
      throw new Error(`Falló ${file}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      client.release();
    }
  }
  console.log('Migraciones al día.');
  await pool.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
