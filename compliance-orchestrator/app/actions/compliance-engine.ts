'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { errorMessage, isUuid } from '@/lib/env';
import { PG, pgCode } from '@/lib/db/pool';
import { withAdmin } from '@/lib/db/server';
import type { ActionResult, ScreeningOutcome } from '@/types/compliance';

/**
 * Chequeo AML de una entidad y de sus personas relacionadas contra las
 * listas oficiales cargadas (OFAC SDN, ONU, SAT 69-B).
 *
 * Todo ocurre en la función run_aml_screening, en una sola transacción:
 * screening, suspensión automática si el riesgo es alto, y bitácora. Si las
 * listas no están cargadas, falla en lugar de devolver un "riesgo bajo" falso.
 */
export async function executeInitialAMLCheck(entityId: string): Promise<ActionResult<ScreeningOutcome>> {
  if (!isUuid(entityId)) {
    return { success: false, data: null, error: 'entityId debe ser un UUID válido' };
  }

  try {
    const outcome = await withAdmin(async (db) => {
      const res = await db.query<{ r: ScreeningOutcome }>("select public.run_aml_screening($1, 'aml.initial_check') as r", [
        entityId,
      ]);
      return res.rows[0]?.r;
    });
    if (!outcome) throw new Error('run_aml_screening no devolvió resultado');

    revalidatePath('/entidades');
    revalidatePath(`/entidades/${entityId}`);
    return { success: true, data: outcome, error: null };
  } catch (err) {
    // redirect() de requireAdmin se propaga tal cual.
    unstable_rethrow(err);
    const code = pgCode(err);
    if (code === PG.noDataFound) {
      return { success: false, data: null, error: `Entidad ${entityId} no existe.` };
    }
    if (code === PG.prerequisiteState) {
      // Mensaje de la función: qué listas faltan.
      return { success: false, data: null, error: errorMessage(err) };
    }
    console.error('[executeInitialAMLCheck]', entityId, err);
    return { success: false, data: null, error: `No se pudo completar el chequeo: ${errorMessage(err)}` };
  }
}
