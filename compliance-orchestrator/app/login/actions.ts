'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { login, logout } from '@/lib/auth/session';

// email se devuelve para rellenar el campo: React limpia el formulario tras cada envío.
export type LoginState = { error: string | null; email: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Escribe tu correo y tu contraseña.', email };
  }

  try {
    const result = await login(email, password);
    if (!result.ok) {
      return {
        error:
          result.reason === 'locked'
            ? 'La cuenta quedó bloqueada 15 minutos por intentos fallidos.'
            : 'Correo o contraseña incorrectos.',
        email,
      };
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error('[signIn]', err);
    return { error: 'No pudimos validar el acceso. Intenta de nuevo en unos minutos.', email };
  }

  redirect('/entidades');
}

export async function signOut(): Promise<void> {
  try {
    await logout();
  } catch (err) {
    console.error('[signOut]', err);
  }
  redirect('/login');
}
