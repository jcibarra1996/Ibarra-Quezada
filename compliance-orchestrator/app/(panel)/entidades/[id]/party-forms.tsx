'use client';

import { useActionState } from 'react';
import { addRelatedParty, removeRelatedParty, type AddPartyState, type SimpleState } from '@/app/actions/entities';
import { PARTY_TYPE_LABEL } from '@/lib/format';
import { PARTY_TYPES } from '@/types/compliance';

export function AddPartyForm({ entityId }: { entityId: string }) {
  const [state, action, pending] = useActionState<AddPartyState, FormData>(addRelatedParty, null);
  const result = state?.result;
  const values = state?.values;

  return (
    <form action={action} className="card" noValidate>
      <input type="hidden" name="entity_id" value={entityId} />
      <p className="eyebrow">Agregar persona</p>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Nombre completo</span>
          <input className="input" name="full_name" defaultValue={values?.full_name} required maxLength={300} />
        </label>
        <label className="field">
          <span className="field-label">Relación</span>
          <select className="input" name="party_type" defaultValue={values?.party_type || 'legal_representative'}>
            {PARTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {PARTY_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">RFC (opcional)</span>
          <input className="input mono" name="tax_id" defaultValue={values?.tax_id} maxLength={13} spellCheck={false} />
        </label>
      </div>

      {result && !result.success && (
        <div className="notice notice-alert" role="alert">
          <p>{result.error}</p>
        </div>
      )}
      {result?.success && (
        <div className="notice" role="status">
          <p>{result.data.full_name} quedó registrada. Se revisa contra listas en el siguiente chequeo.</p>
        </div>
      )}

      <button className="button button-block" type="submit" disabled={pending}>
        {pending ? 'Registrando' : 'Agregar'}
      </button>
    </form>
  );
}

export function RemovePartyForm({ entityId, partyId, name }: { entityId: string; partyId: string; name: string }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(removeRelatedParty, null);

  return (
    <details className="inline-details">
      <summary>Retirar</summary>
      <form action={action} className="stack">
        <input type="hidden" name="entity_id" value={entityId} />
        <input type="hidden" name="party_id" value={partyId} />
        <label className="field">
          <span className="field-label">Motivo para retirar a {name}</span>
          <input className="input" name="reason" required minLength={10} maxLength={500} />
        </label>
        {state && !state.success && (
          <div className="notice notice-alert" role="alert">
            <p>{state.error}</p>
          </div>
        )}
        <button className="button button-ghost" type="submit" disabled={pending}>
          {pending ? 'Retirando' : 'Confirmar retiro'}
        </button>
      </form>
    </details>
  );
}
