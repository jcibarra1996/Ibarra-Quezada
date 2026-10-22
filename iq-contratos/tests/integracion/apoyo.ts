import { config } from "dotenv";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: path.join(import.meta.dirname, "../../.env.local"), quiet: true });

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export const admin = () => createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

export async function sesion(correo: string, contrasena: string): Promise<SupabaseClient> {
  const c = createClient(url, publica, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) throw new Error(`No se pudo iniciar sesión como ${correo}. ¿Corrió npm run seed?`);
  return c;
}
