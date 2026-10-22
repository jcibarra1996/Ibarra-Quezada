"use server";
import { redirect } from "next/navigation";
import { clienteSesion } from "@/lib/supabase/server";
import { clienteSistema } from "@/lib/supabase/admin";
import { exigirUsuario } from "@/lib/auth/sesion";

export async function iniciarSesion(_previo: { error?: string } | undefined, datos: FormData) {
  const correo = String(datos.get("correo") ?? "").trim();
  const contrasena = String(datos.get("contrasena") ?? "");
  if (!correo || !contrasena) return { error: "Escriba su correo y contraseña." };
  const supabase = await clienteSesion();
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/inicio");
}

export async function cerrarSesion() {
  const supabase = await clienteSesion();
  await supabase.auth.signOut();
  redirect("/login");
}

// Solo en organizaciones de demostración: entra con otro perfil de la misma organización
// sin pedir contraseña. El enlace de un solo uso se genera y se canjea en el servidor;
// nunca sale al navegador ni se envía por correo.
export async function cambiarPerfil(perfilId: string) {
  const usuario = await exigirUsuario();
  const db = clienteSistema();
  const [{ data: org }, { data: destino }] = await Promise.all([
    db.from("organizations").select("es_demo").eq("id", usuario.org_id).single(),
    db.from("profiles").select("id, org_id").eq("id", perfilId).maybeSingle(),
  ]);
  if (!org?.es_demo || !destino || destino.org_id !== usuario.org_id || destino.id === usuario.id) redirect("/inicio");
  const { data: cuenta } = await db.auth.admin.getUserById(destino.id);
  if (!cuenta.user?.email) redirect("/inicio");
  const { data: enlace, error } = await db.auth.admin.generateLink({ type: "magiclink", email: cuenta.user.email });
  if (error || !enlace.properties?.hashed_token) redirect("/inicio");
  const supabase = await clienteSesion();
  await supabase.auth.verifyOtp({ type: "magiclink", token_hash: enlace.properties.hashed_token });
  redirect("/inicio");
}
