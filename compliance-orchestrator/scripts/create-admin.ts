// Crea un usuario administrador o le cambia la contraseña.
//   npm run admin:create -- correo@dominio.com
// La contraseña se toma de ADMIN_PASSWORD; si no está, se genera una y se
// imprime una sola vez.
import { randomBytes } from 'node:crypto';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../lib/auth/password.ts';
import { getPool, withTx } from '../lib/db/pool.ts';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Uso: npm run admin:create -- correo@dominio.com');
  }

  const provided = process.env.ADMIN_PASSWORD;
  const password = provided ?? randomBytes(18).toString('base64url');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  const hash = await hashPassword(password);

  const created = await withTx({ role: 'system', actor: 'admin:create' }, async (db) => {
    const res = await db.query<{ inserted: boolean }>(
      `insert into public.app_users (email, password_hash, role)
       values ($1, $2, 'admin')
       on conflict (email) do update
         set password_hash = excluded.password_hash, failed_attempts = 0, locked_until = null
       returning (xmax = 0) as inserted`,
      [email, hash],
    );
    // Un cambio de contraseña invalida las sesiones abiertas.
    await db.query('delete from public.app_sessions where user_id = (select id from public.app_users where email = $1)', [email]);
    return res.rows[0]?.inserted ?? false;
  });

  console.log(created ? `Administrador creado: ${email}` : `Contraseña actualizada: ${email}`);
  if (!provided) console.log(`Contraseña generada (guárdala, no se vuelve a mostrar): ${password}`);
  await getPool().end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
