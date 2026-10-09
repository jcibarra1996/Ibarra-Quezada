import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/compliance';
import { requireEnv } from '@/lib/env';

/**
 * Cliente con service_role para procesos sin sesión de usuario (webhooks).
 * Ignora RLS: nunca lo importes desde código que llegue al navegador.
 * Sin cookies, la llave se envía como bearer token en cada request.
 */
export function createSupabaseAdminClient() {
  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
