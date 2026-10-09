'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// email se devuelve para rellenar el campo: React limpia el formulario tras cada envío.
export type LoginState = { error: string | null; email: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Escribe tu correo y tu contraseña.', email };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Mensaje único para no revelar si el correo existe.
      return { error: 'Correo o contraseña incorrectos.', email };
    }
  } catch (err) {
    console.error('[signIn]', err);
    return { error: 'No pudimos validar el acceso. Intenta de nuevo en unos minutos.', email };
  }

  redirect('/entidades');
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[signOut]', err);
  }
  redirect('/login');
}
