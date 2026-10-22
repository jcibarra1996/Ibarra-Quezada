import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renueva la sesión de Supabase en cada solicitud y manda al inicio de sesión
// a quien no esté autenticado.
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          for (const { name, value } of lista) request.cookies.set(name, value);
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of lista) respuesta.cookies.set(name, value, options);
        },
      },
    },
  );
  // Renueva el token si venció y verifica su firma.
  const { data } = await supabase.auth.getClaims();
  // La tarea programada de avisos (CRON_SECRET) y el aviso de Mifiel (MIFIEL_WEBHOOK_CLAVE)
  // se autentican con su propia clave.
  const ruta = request.nextUrl.pathname;
  const publica = ruta.startsWith("/login") || ruta === "/api/alertas/cron" || ruta === "/api/firmas/mifiel";
  if (!data?.claims?.sub && !publica) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|woff2?)$).*)"],
};
