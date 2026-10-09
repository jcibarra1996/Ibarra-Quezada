'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createLegalEntity, type CreateEntityState } from '@/app/actions/entities';

export function NewEntityForm() {
  const [state, action, pending] = useActionState<CreateEntityState, FormData>(createLegalEntity, null);
  const result = state?.result;
  const values = state?.values;

  return (
    <form action={action} className="card" noValidate>
      <p className="eyebrow">Alta de entidad</p>
      <h2 className="h2" style={{ marginBottom: 'var(--space-3)' }}>
        Nueva contraparte
      </h2>

      <label className="field">
        <span className="field-label">Razón social o nombre</span>
        <input className="input" name="name" defaultValue={values?.name} required maxLength={300} />
      </label>
      <label className="field">
        <span className="field-label">RFC o identificador fiscal</span>
        <input className="input mono" name="tax_id" defaultValue={values?.tax_id} required maxLength={20} autoCapitalize="characters" spellCheck={false} />
      </label>
      <label className="field">
        <span className="field-label">País (ISO, dos letras)</span>
        <input className="input mono" name="country" defaultValue={values?.country ?? 'MX'} required maxLength={2} autoCapitalize="characters" />
      </label>

      {result && !result.success && (
        <div className="notice notice-alert" role="alert">
          <p>{result.error}</p>
        </div>
      )}
      {result?.success && (
        <div className="notice" role="status">
          <p>
            {result.data.name} quedó registrada como pendiente.{' '}
            <Link href={`/entidades/${result.data.id}`}>Ejecutar chequeo AML</Link>
          </p>
        </div>
      )}

      <button className="button button-block" type="submit" disabled={pending}>
        {pending ? 'Registrando' : 'Dar de alta'}
      </button>
    </form>
  );
}
