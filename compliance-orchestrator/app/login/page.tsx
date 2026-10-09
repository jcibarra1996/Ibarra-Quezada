import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Acceso | Compliance AML' };

export default function LoginPage() {
  return (
    <main className="surface-negro access">
      <section className="access-brand">
        {/* El monograma trae fondo #0D0D0D incrustado: solo va sobre superficie negra. */}
        <img src="/monograma.png" alt="Ibarra Quezada Abogados" width={72} height={84} />
        <div>
          <p className="eyebrow">Compliance y AML</p>
          <h1 className="display-lg">
            Cada contraparte, <span className="keyword">revisada antes</span> de firmar.
          </h1>
        </div>
        <div className="lockup">
          <span className="lockup-name">Ibarra Quezada</span>
          <span className="lockup-sub">Abogados</span>
        </div>
      </section>

      <section className="access-form">
        <p className="eyebrow">Acceso interno</p>
        <h2 className="h1" style={{ marginBottom: 'var(--space-3)' }}>
          Entrar al panel
        </h2>
        <LoginForm />
        <p className="small" style={{ marginTop: 'var(--space-3)' }}>
          Solo usuarios con rol de administrador ven información de entidades.
        </p>
      </section>
    </main>
  );
}
