'use client';

import { useActionState } from 'react';
import { signIn, type LoginState } from './actions';

const initial: LoginState = { error: null, email: '' };

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} noValidate>
      <label className="field">
        <span className="field-label">Correo</span>
        <input className="input" type="email" name="email" autoComplete="username" defaultValue={state.email} required />
      </label>
      <label className="field">
        <span className="field-label">Contraseña</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required />
      </label>

      {state.error && (
        <div className="notice notice-alert" role="alert">
          <p>{state.error}</p>
        </div>
      )}

      <button className="button button-block" type="submit" disabled={pending}>
        {pending ? 'Validando' : 'Entrar'}
      </button>
    </form>
  );
}
