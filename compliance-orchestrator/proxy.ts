import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresca la sesión de Supabase en cada request del panel y manda a
 * /login a quien no tenga sesión. El webhook queda fuera del matcher:
 * se autentica con su propio token.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return new NextResponse('Supabase no configurado', { status: 500 });
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser valida el token contra Supabase Auth; no confiar solo en la cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname.startsWith('/login');

  if (!user && !isLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLogin) {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = '/entidades';
    panelUrl.search = '';
    return NextResponse.redirect(panelUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|monograma.png).*)'],
};
