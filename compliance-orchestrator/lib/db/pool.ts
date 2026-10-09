// Conexión a Postgres (Neon) y transacciones con rol declarado.
// Sin imports con alias "@/" ni 'server-only': lo usan también los scripts
// de scripts/, que corren con Node directamente.
import pg from 'pg';

// Columnas DATE como 'YYYY-MM-DD', sin convertir a Date con zona horaria.
pg.types.setTypeParser(1082, (v: string) => v);

export type DbRole = 'auth' | 'admin' | 'system';

export interface TxContext {
  role: DbRole;
  /** Quién actúa: correo del usuario, "webhook", "sincronización". Va a audit_logs.actor. */
  actor: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __iqPool: pg.Pool | undefined;
}

export function getPool(): pg.Pool {
  if (!globalThis.__iqPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Falta la variable de entorno DATABASE_URL');
    globalThis.__iqPool = new pg.Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__iqPool;
}

/**
 * Ejecuta fn dentro de una transacción con app.role y app.actor fijados solo
 * para esa transacción (set_config local). RLS forzado en la base usa ese rol;
 * funciona igual detrás del pooler de Neon en modo transacción.
 */
export async function withTx<T>(ctx: TxContext, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query("select set_config('app.role', $1, true), set_config('app.actor', $2, true)", [
      ctx.role,
      ctx.actor,
    ]);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Códigos SQLSTATE que el código de la app traduce a mensajes. */
export const PG = {
  uniqueViolation: '23505',
  checkViolation: '23514',
  noDataFound: 'P0002',
  prerequisiteState: '55000',
  insufficientPrivilege: '42501',
} as const;

export function pgCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : undefined;
}
