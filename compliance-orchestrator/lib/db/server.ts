import 'server-only';

import type pg from 'pg';
import { requireAdmin } from '@/lib/auth/session';
import { getPool, withTx, type TxContext } from './pool';

export { getPool, withTx };
export type { TxContext };

/**
 * Valida la sesión de administrador y ejecuta fn en una transacción con
 * rol 'admin' y el correo del usuario como actor de la bitácora.
 */
export async function withAdmin<T>(fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const user = await requireAdmin();
  return withTx({ role: 'admin', actor: user.email }, fn);
}
