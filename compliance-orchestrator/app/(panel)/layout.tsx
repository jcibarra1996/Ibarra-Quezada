import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/login/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');

  return (
    <>
      <header className="masthead">
        <div className="shell masthead-inner">
          <Link href="/entidades" className="lockup" aria-label="Ibarra Quezada Abogados, inicio del panel">
            <span className="lockup-name">Ibarra Quezada</span>
            <span className="lockup-sub">Abogados · Compliance AML</span>
          </Link>
          <div className="masthead-meta">
            <span className="small masthead-email">{user.email}</span>
            <form action={signOut}>
              <button className="button button-ghost" type="submit">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="shell page">
        {adminError ? (
          <div className="notice notice-alert" role="alert">
            <p>No pudimos verificar tus permisos: {adminError.message}</p>
          </div>
        ) : isAdmin ? (
          children
        ) : (
          <div className="card">
            <p className="eyebrow">Acceso restringido</p>
            <h1 className="h1">Tu usuario no tiene rol de administrador.</h1>
            <p className="body" style={{ marginTop: 'var(--space-2)' }}>
              La información de entidades, screenings y bitácora solo es visible para administradores. Pide que se
              asigne <span className="mono">app_metadata.role = admin</span> a {user.email}.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
