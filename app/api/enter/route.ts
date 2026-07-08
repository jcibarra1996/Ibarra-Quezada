import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, GATE_MAX_AGE, gateToken } from "@/lib/accessGate";

async function handle(req: NextRequest, key: string | null) {
  const secret = process.env.APP_ACCESS_KEY;
  if (!secret) {
    return NextResponse.json({ error: "APP_ACCESS_KEY no configurado" }, { status: 500 });
  }

  if (!key || key !== secret) {
    return NextResponse.redirect(new URL("/enter?error=1", req.url));
  }

  const token = await gateToken(secret);
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: GATE_MAX_AGE,
    path: "/",
  });
  return res;
}

// La URL única hardcodeada: https://tu-app.com/api/enter?key=...
// Se guarda como acceso directo en la pantalla de inicio del iPhone.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  return handle(req, key);
}

// Fallback manual desde /enter si se perdió el acceso directo.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const key = form.get("key");
  return handle(req, typeof key === "string" ? key : null);
}
