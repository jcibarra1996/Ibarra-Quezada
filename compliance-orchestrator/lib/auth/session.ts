import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { withTx } from '@/lib/db/pool';
import { getDummyHash, verifyPassword } from './password';

export const SESSION_COOKIE = 'iq_session';
const SESSION_TTL_HOURS = 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export interface SessionUser {
  id: string;
  email: string;
  role: 'admin';
}

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export type LoginResult = { ok: true } | { ok: false; reason: 'invalid' | 'locked' };

/**
 * Valida credenciales y abre sesión. Bloquea la cuenta 15 minutos después de
 * 5 intentos fallidos. El mismo mensaje para correo inexistente y contraseña
 * incorrecta, y el mismo costo de cómputo en ambos casos.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();

  const user = await withTx({ role: 'auth', actor: normalized }, async (db) =>
    (
      await db.query<{ id: string; password_hash: string; locked: boolean }>(
        'select id, password_hash, coalesce(locked_until > now(), false) as locked from public.app_users where email = $1',
        [normalized],
      )
    ).rows[0],
  );

  if (!user) {
    await verifyPassword(password, await getDummyHash());
    return { ok: false, reason: 'invalid' };
  }
  if (user.locked) return { ok: false, reason: 'locked' };

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    await withTx({ role: 'auth', actor: normalized }, (db) =>
      db.query(
        `update public.app_users
            set failed_attempts = failed_attempts + 1,
                locked_until = case when failed_attempts + 1 >= $2
                                    then now() + make_interval(mins => $3) end
          where id = $1`,
        [user.id, MAX_FAILED, LOCK_MINUTES],
      ),
    );
    return { ok: false, reason: 'invalid' };
  }

  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);

  await withTx({ role: 'auth', actor: normalized }, async (db) => {
    await db.query('update public.app_users set failed_attempts = 0, locked_until = null where id = $1', [user.id]);
    await db.query('delete from public.app_sessions where expires_at < now()');
    await db.query('insert into public.app_sessions (user_id, token_hash, expires_at) values ($1, $2, $3)', [
      user.id,
      hashToken(token),
      expires,
    ]);
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await withTx({ role: 'auth', actor: 'logout' }, (db) =>
      db.query('delete from public.app_sessions where token_hash = $1', [hashToken(token)]),
    );
  }
  store.delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual o null. Memoizado por request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;

  return withTx({ role: 'auth', actor: 'session' }, async (db) => {
    const row = (
      await db.query<SessionUser>(
        `select u.id, u.email, u.role
           from public.app_sessions s
           join public.app_users u on u.id = s.user_id
          where s.token_hash = $1 and s.expires_at > now()`,
        [hashToken(token)],
      )
    ).rows[0];
    return row ?? null;
  });
});

/** Para páginas y Server Actions: redirige a /login si no hay sesión válida. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') redirect('/login');
  return user;
}
