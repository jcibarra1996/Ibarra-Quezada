import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cliente del sistema (llave secreta, omite RLS). Solo para escrituras del sistema
// después de verificar la sesión y la organización del usuario en el servidor.
export function clienteSistema() {
  return createClient(env.supabaseUrl(), env.supabaseSecreta(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
