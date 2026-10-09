'use client';

import { useState, useTransition } from 'react';
import { executeInitialAMLCheck } from '@/app/actions/compliance-engine';
import { ENTITY_STATUS_LABEL, RISK_LABEL } from '@/lib/format';
import type { ActionResult, ScreeningOutcome } from '@/types/compliance';

export function AmlCheckButton({ entityId }: { entityId: string }) {
  const [result, setResult] = useState<ActionResult<ScreeningOutcome> | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await executeInitialAMLCheck(entityId));
      } catch (err) {
        setResult({
          success: false,
          data: null,
          error: err instanceof Error ? err.message : 'No se pudo contactar al servidor.',
        });
      }
    });
  }

  return (
    <div>
      <button className="button button-block" type="button" onClick={run} disabled={pending}>
        {pending ? 'Revisando listas' : 'Ejecutar chequeo AML'}
      </button>

      <div aria-live="polite">
        {result?.success && (
          <div className={`notice ${result.data.screening.risk_level === 'high' ? 'notice-alert' : ''}`}>
            <p>
              {RISK_LABEL[result.data.screening.risk_level]}.{' '}
              {result.data.previous_status === result.data.entity_status
                ? `Estado sin cambios: ${ENTITY_STATUS_LABEL[result.data.entity_status]}.`
                : `Estado: ${ENTITY_STATUS_LABEL[result.data.previous_status]} a ${ENTITY_STATUS_LABEL[result.data.entity_status]}.`}{' '}
              El detalle está en la sección 01.
            </p>
          </div>
        )}
        {result && !result.success && (
          <div className="notice notice-alert" role="alert">
            <p>{result.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
