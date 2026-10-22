// Variables de entorno, verificadas al usarse para dar un error claro si falta alguna.
function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Revise .env.local (ver README).`);
  return valor;
}

export const env = {
  supabaseUrl: () => requerida("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublica: () =>
    requerida("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseSecreta: () => requerida("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  anthropicKey: () => requerida("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
  modelo: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  correoAlertasActivo: () => process.env.ALERTAS_CORREO_ACTIVAS === "true",
};
