'use client';

import { useActionState } from 'react';
import { decideEntity, type DecisionState } from '@/app/actions/entities';
import { ENTITY_STATUS_LABEL, RISK_LABEL } from '@/lib/format';
import type { EntityStatus, RiskLevel } from '@/types/compliance';

// Mismas transiciones que decide_entity en la base.
const TRANSITIONS: Record<EntityStatus, { to: EntityStatus; label: string }[]> = {
  pending: [
    { to: 'approved', label: 'Aprobar' },
    { to: 'rejected', label: 'Rechazar' },
  ],
  approved: [
    { to: 'rejected', label: 'Rechazar' },
    { to: 'pending', label: 'Reabrir (vuelve a Pendiente)' },
  ],
  suspended: [
    { to: 'pending', label: 'Reactivar (vuelve a Pendiente)' },
    { to: 'rejected', label: 'Rechazar' },
  ],
  rejected: [{ to: 'pending', label: 'Reabrir (vuelve a Pendiente)' }],
};

export function DecisionForm({
  entityId,
  status,
  lastRisk,
}: {
  entityId: string;
  status: EntityStatus;
  lastRisk: RiskLevel | null;
}) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(decideEntity, null);
  const options = TRANSITIONS[status];
  const result = state?.result;

  return (
    <form action={action} noValidate>
      <input type="hidden" name="entity_id" value={entityId} />
      <p className="eyebrow">Decisión</p>
      <h2 className="h2">Resolver el expediente</h2>
      <p className="body" style={{ marginTop: 'var(--space-1)' }}>
        Estado actual: {ENTITY_STATUS_LABEL[status]}. El motivo queda en la bitácora con tu usuario.
      </p>

      {status === 'pending' && lastRisk === null && (
        <div className="notice">
          <p>Todavía no hay chequeo AML. Ejecútalo antes de aprobar.</p>
        </div>
      )}
      {lastRisk && lastRisk !== 'low' && (
        <div className="notice notice-alert">
          <p>
            El último chequeo dio {RISK_LABEL[lastRisk].toLowerCase()}. Si la coincidencia es un homónimo, explica en el
            motivo cómo lo descartaste (dato que no coincide, documento revisado).
          </p>
        </div>
      )}

      <fieldset className="field radio-group">
        <legend className="field-label">Acción</legend>
        {options.map((o, i) => (
          <label key={o.to} className="radio">
            <input type="radio" name="status" value={o.to} defaultChecked={i === 0} />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="field">
        <span className="field-label">Motivo</span>
        <textarea className="input" name="reason" rows={3} required minLength={10} maxLength={2000} defaultValue={state?.reason} />
      </label>

      {result && !result.success && (
        <div className="notice notice-alert" role="alert">
          <p>{result.error}</p>
        </div>
      )}
      {result?.success && (
        <div className="notice" role="status">
          <p>Registrado. Estado: {ENTITY_STATUS_LABEL[result.data.status]}.</p>
        </div>
      )}

      <button className="button button-block" type="submit" disabled={pending}>
        {pending ? 'Registrando' : 'Registrar decisión'}
      </button>
    </form>
  );
}
