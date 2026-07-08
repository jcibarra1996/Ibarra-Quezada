import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/accessGate";

// Rutas públicas: magic links de delegación, quick-add (Siri, con su
// propio secreto por header), la pantalla de entrada y sus assets.
const PUBLIC_PATH_PREFIXES = ["/t/", "/api/magic/", "/api/quick-add", "/api/enter", "/enter"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const secret = process.env.APP_ACCESS_KEY;
  if (!secret) {
    // Sin secreto configurado no hay forma segura de gatear: fallar cerrado.
    return new NextResponse("APP_ACCESS_KEY no configurado", { status: 500 });
  }

  const expected = await gateToken(secret);
  const cookie = req.cookies.get(GATE_COOKIE)?.value;

  if (cookie === expected) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/enter";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
