import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'iq_session';

/**
 * Filtro rápido: sin cookie de sesión, a /login. La validación real de la
 * sesión contra la base ocurre en el layout del panel y en cada Server
 * Action (requireAdmin). El webhook queda fuera: usa su propio token.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = request.nextUrl.pathname.startsWith('/login');

  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|monograma.png).*)'],
};
