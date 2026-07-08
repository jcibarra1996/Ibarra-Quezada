import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente admin (service_role). Solo se usa dentro de Route Handlers /
 * Server Components — nunca se importa en un componente cliente. Es la
 * única vía de acceso a la base de datos: el navegador nunca habla
 * directo con Supabase, siempre pasa por nuestras API routes.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
