import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/compliance';
import { requireEnv } from '@/lib/env';

/**
 * Cliente con la sesión del usuario (cookies). Respeta RLS: solo un usuario
 * con app_metadata.role = 'admin' puede leer o escribir.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un contexto donde las cookies son de solo lectura.
            // El refresco de sesión lo hace el middleware de auth.
          }
        },
      },
    },
  );
}
