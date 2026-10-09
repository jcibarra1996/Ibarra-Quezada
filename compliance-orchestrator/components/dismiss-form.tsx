'use client';

import { useActionState } from 'react';
import { dismissMatch, type SimpleState } from '@/app/actions/entities';

export function DismissForm({
  entityId,
  subjectKey,
  source,
  matchKey,
}: {
  entityId: string;
  subjectKey: string;
  source: string;
  matchKey: string;
}) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(dismissMatch, null);

  if (state?.success) {
    return (
      <div className="notice" role="status">
        <p>Descartada. Ejecuta el chequeo de nuevo para recalcular el riesgo.</p>
      </div>
    );
  }

  return (
    <details className="inline-details dismiss">
      <summary>Descartar como falso positivo</summary>
      <form action={action} className="stack">
        <input type="hidden" name="entity_id" value={entityId} />
        <input type="hidden" name="subject_key" value={subjectKey} />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="match_key" value={matchKey} />
        <label className="field">
          <span className="field-label">Cómo lo descartaste</span>
          <textarea
            className="input"
            name="reason"
            rows={2}
            required
            minLength={10}
            maxLength={1000}
            placeholder="Dato que no coincide: CURP, fecha de nacimiento, nacionalidad, documento revisado"
          />
        </label>
        {state && !state.success && (
          <div className="notice notice-alert" role="alert">
            <p>{state.error}</p>
          </div>
        )}
        <button className="button button-ghost" type="submit" disabled={pending}>
          {pending ? 'Registrando' : 'Confirmar descarte'}
        </button>
      </form>
    </details>
  );
}
