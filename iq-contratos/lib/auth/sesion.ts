import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { clienteSesion } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/tipos";

// Usuario de la sesión actual con su perfil. Se memoriza por solicitud.
export const usuarioActual = cache(async (): Promise<Usuario | null> => {
  const supabase = await clienteSesion();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, org_id, nombre, puesto, rol")
    .eq("id", data.user.id)
    .single();
  if (!perfil) return null;
  return { ...perfil, correo: data.user.email ?? "" } as Usuario;
});

export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) redirect("/login");
  return u;
}
