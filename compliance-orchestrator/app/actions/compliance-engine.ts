'use server';

import { amlProviderName, screenEntity } from '@/lib/aml/provider';
import { errorMessage, isUuid } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult, Json, LegalEntity, ScreeningOutcome } from '@/types/compliance';

/**
 * Chequeo AML inicial de una entidad.
 *
 * 1. Lee la entidad (RLS: requiere sesión de administrador).
 * 2. Consulta al proveedor AML por REST con nombre y RFC.
 * 3-5. En una sola transacción (RPC record_aml_screening): inserta el
 *      screening, suspende la entidad si el riesgo es high y escribe la
 *      bitácora. Si cualquiera falla, no se escribe nada.
 *
 * Si el proveedor falla, se intenta dejar constancia en audit_logs y se
 * devuelve el error. Nunca devuelve success sin bitácora escrita.
 */
export async function executeInitialAMLCheck(entityId: string): Promise<ActionResult<ScreeningOutcome>> {
  if (!isUuid(entityId)) {
    return { success: false, data: null, error: 'entityId debe ser un UUID válido' };
  }

  const provider = amlProviderName();
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  let entity: LegalEntity;

  // 1. Entidad
  try {
    supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('legal_entities')
      .select('*')
      .eq('id', entityId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return { success: false, data: null, error: `Entidad ${entityId} no existe o no es accesible` };
    }
    entity = data;
  } catch (err) {
    console.error('[executeInitialAMLCheck] lectura de entidad', entityId, err);
    return { success: false, data: null, error: `No se pudo leer la entidad: ${errorMessage(err)}` };
  }

  // 2. Proveedor AML
  let response;
  try {
    response = await screenEntity({ name: entity.name, tax_id: entity.tax_id, country: entity.country });
  } catch (err) {
    const reason = errorMessage(err);
    console.error('[executeInitialAMLCheck] proveedor AML', entityId, err);

    let auditNote = '';
    try {
      const { error } = await supabase.rpc('log_audit_event', {
        p_entity_id: entityId,
        p_action_type: 'aml.initial_check_failed',
        p_description: `Chequeo AML inicial con ${provider} no completado: ${reason}. Estado de la entidad sin cambios (${entity.status}).`,
      });
      if (error) throw error;
    } catch (auditErr) {
      console.error('[executeInitialAMLCheck] audit_logs', entityId, auditErr);
      auditNote = ` Además falló el registro en audit_logs: ${errorMessage(auditErr)}`;
    }

    return { success: false, data: null, error: `Proveedor AML no disponible: ${reason}.${auditNote}` };
  }

  // 3, 4 y 5. Screening + suspensión + bitácora, atómico
  try {
    const { data, error } = await supabase.rpc('record_aml_screening', {
      p_entity_id: entityId,
      p_provider: provider,
      p_risk_level: response.risk_level,
      p_raw_json_response: response as unknown as Json,
    });

    if (error) throw error;
    if (!data) throw new Error('record_aml_screening no devolvió resultado');

    return { success: true, data: data as unknown as ScreeningOutcome, error: null };
  } catch (err) {
    // La transacción se revirtió: no quedó screening, ni cambio de estado,
    // ni bitácora. Se reporta con el reference_id del proveedor para poder
    // reconciliar.
    console.error('[executeInitialAMLCheck] persistencia', entityId, response.reference_id, err);
    return {
      success: false,
      data: null,
      error: `Resultado AML (${response.risk_level}, ref ${response.reference_id}) no se pudo guardar: ${errorMessage(err)}`,
    };
  }
}
