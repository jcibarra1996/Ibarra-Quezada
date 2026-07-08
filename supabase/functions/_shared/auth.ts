/**
 * Todas estas funciones tienen verify_jwt=false (las llama pg_cron, no
 * un usuario con sesión Supabase), así que se protegen con un secreto
 * compartido propio: el mismo valor que EDGE_FUNCTION_SECRET / lo que
 * quedó sembrado en app_settings.edge_function_secret.
 */
export function assertAuthorized(req: Request): Response | null {
  const expected = Deno.env.get("EDGE_FUNCTION_SECRET");
  const header = req.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "");

  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
