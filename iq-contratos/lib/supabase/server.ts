import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Cliente con la sesión del usuario: todo lo que lee o escribe pasa por RLS.
export async function clienteSesion() {
  const almacen = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabasePublica(), {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // En componentes de servidor no se pueden escribir cookies; el proxy renueva la sesión.
        }
      },
    },
  });
}
