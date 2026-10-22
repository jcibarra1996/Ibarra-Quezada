"use server";
import { redirect } from "next/navigation";
import { clienteSesion } from "@/lib/supabase/server";

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
