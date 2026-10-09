import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import { requireAdmin } from '@/lib/auth/session';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

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

      <main className="shell page">{children}</main>
    </>
  );
}
