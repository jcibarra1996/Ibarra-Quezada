import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { clienteSesion } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/tipos";

// Usuario de la sesión actual con su perfil. Se memoriza por solicitud.
// getClaims verifica la firma del token (con las llaves públicas del proyecto, sin ir al
// servidor de autenticación en cada página) y RLS vuelve a verificarlo en cada consulta.
export const usuarioActual = cache(async (): Promise<Usuario | null> => {
  const supabase = await clienteSesion();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: perfil } = await supabase.from("profiles").select("id, org_id, nombre, puesto, rol").eq("id", id).single();
  if (!perfil) return null;
  return { ...perfil, correo: typeof data.claims.email === "string" ? data.claims.email : "" } as Usuario;
});

export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) redirect("/login");
  return u;
}
