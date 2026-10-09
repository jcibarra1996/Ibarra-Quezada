'use server';

import { revalidatePath } from 'next/cache';
import { errorMessage } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult, LegalEntity } from '@/types/compliance';

const RFC_RE = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

type EntityFormValues = { name: string; tax_id: string; country: string };

// values se devuelve para rellenar el formulario: React lo limpia tras cada envío.
export type CreateEntityState = { result: ActionResult<LegalEntity>; values: EntityFormValues } | null;

const EMPTY: EntityFormValues = { name: '', tax_id: '', country: 'MX' };

/**
 * Alta de entidad. La inserción y su registro en audit_logs van en la misma
 * transacción (RPC create_legal_entity).
 */
export async function createLegalEntity(_prev: CreateEntityState, formData: FormData): Promise<CreateEntityState> {
  const name = String(formData.get('name') ?? '').trim();
  const taxId = String(formData.get('tax_id') ?? '').replace(/\s/g, '').toUpperCase();
  const country = String(formData.get('country') ?? 'MX').trim().toUpperCase();
  const values = { name, tax_id: taxId, country };
  const fail = (error: string): CreateEntityState => ({ result: { success: false, data: null, error }, values });

  if (!name) return fail('La razón social es obligatoria.');
  if (!/^[A-Z]{2}$/.test(country)) {
    return fail('El país va como código de dos letras (MX, US, ES).');
  }
  if (!taxId) return fail('El identificador fiscal es obligatorio.');
  if (country === 'MX' && !RFC_RE.test(taxId)) {
    return fail('El RFC no tiene el formato esperado: 3 o 4 letras, 6 dígitos de fecha y 3 caracteres de homoclave.');
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('create_legal_entity', {
      p_name: name,
      p_tax_id: taxId,
      p_country: country,
    });

    if (error) {
      if (error.code === '23505') {
        return fail(`Ya existe una entidad con el identificador ${taxId} en ${country}.`);
      }
      if (error.code === '23514') {
        return fail('La base de datos rechazó el identificador fiscal por formato.');
      }
      throw error;
    }
    if (!data) throw new Error('create_legal_entity no devolvió resultado');

    revalidatePath('/entidades');
    return { result: { success: true, data: data as LegalEntity, error: null }, values: EMPTY };
  } catch (err) {
    console.error('[createLegalEntity]', err);
    return fail(`No se pudo dar de alta la entidad: ${errorMessage(err)}`);
  }
}
