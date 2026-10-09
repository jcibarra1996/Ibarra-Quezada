'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { errorMessage, isUuid } from '@/lib/env';
import { PG, pgCode } from '@/lib/db/pool';
import { withAdmin } from '@/lib/db/server';
import { PARTY_TYPES, type ActionResult, type EntityStatus, type LegalEntity, type PartyType, type RelatedParty } from '@/types/compliance';

const RFC_RE = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const MIN_REASON = 10;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function cleanRfc(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase();
}

/** Mensaje de error para el usuario; los errores no previstos van al log. */
function failure(err: unknown, context: string): string {
  unstable_rethrow(err);
  const code = pgCode(err);
  if (code === PG.checkViolation || code === PG.noDataFound) return errorMessage(err);
  console.error(`[${context}]`, err);
  return `No se pudo completar la operación: ${errorMessage(err)}`;
}

// ---------------------------------------------------------------------------
// Alta de entidad
// ---------------------------------------------------------------------------

type EntityFormValues = { name: string; tax_id: string; country: string };

// values se devuelve para rellenar el formulario: React lo limpia tras cada envío.
export type CreateEntityState = { result: ActionResult<LegalEntity>; values: EntityFormValues } | null;

const EMPTY_ENTITY: EntityFormValues = { name: '', tax_id: '', country: 'MX' };

export async function createLegalEntity(_prev: CreateEntityState, formData: FormData): Promise<CreateEntityState> {
  const name = str(formData, 'name');
  const taxId = cleanRfc(str(formData, 'tax_id'));
  const country = str(formData, 'country').toUpperCase() || 'MX';
  const values = { name, tax_id: taxId, country };
  const fail = (error: string): CreateEntityState => ({ result: { success: false, data: null, error }, values });

  if (!name) return fail('La razón social es obligatoria.');
  if (!/^[A-Z]{2}$/.test(country)) return fail('El país va como código de dos letras (MX, US, ES).');
  if (!taxId) return fail('El identificador fiscal es obligatorio.');
  if (country === 'MX' && !RFC_RE.test(taxId)) {
    return fail('El RFC no tiene el formato esperado: 3 o 4 letras, 6 dígitos de fecha y 3 caracteres de homoclave.');
  }

  try {
    const entity = await withAdmin(async (db) =>
      (await db.query<LegalEntity>('select * from public.create_legal_entity($1, $2, $3)', [name, taxId, country])).rows[0],
    );
    if (!entity) throw new Error('create_legal_entity no devolvió resultado');
    revalidatePath('/entidades');
    return { result: { success: true, data: entity, error: null }, values: EMPTY_ENTITY };
  } catch (err) {
    if (pgCode(err) === PG.uniqueViolation) return fail(`Ya existe una entidad con el identificador ${taxId} en ${country}.`);
    return fail(failure(err, 'createLegalEntity'));
  }
}

// ---------------------------------------------------------------------------
// Personas relacionadas
// ---------------------------------------------------------------------------

type PartyFormValues = { full_name: string; party_type: string; tax_id: string };
export type AddPartyState = { result: ActionResult<RelatedParty>; values: PartyFormValues } | null;

export async function addRelatedParty(_prev: AddPartyState, formData: FormData): Promise<AddPartyState> {
  const entityId = str(formData, 'entity_id');
  const fullName = str(formData, 'full_name');
  const partyType = str(formData, 'party_type');
  const taxId = cleanRfc(str(formData, 'tax_id'));
  const values = { full_name: fullName, party_type: partyType, tax_id: taxId };
  const fail = (error: string): AddPartyState => ({ result: { success: false, data: null, error }, values });

  if (!isUuid(entityId)) return fail('Entidad inválida.');
  if (fullName.length < 5 || !/\s/.test(fullName)) return fail('Escribe el nombre completo, con apellidos.');
  if (!(PARTY_TYPES as readonly string[]).includes(partyType)) return fail('Elige el tipo de relación.');
  if (taxId && !RFC_RE.test(taxId)) return fail('El RFC de la persona no tiene un formato válido. Déjalo vacío si no lo tienes.');

  try {
    const party = await withAdmin(async (db) =>
      (
        await db.query<RelatedParty>('select * from public.add_related_party($1, $2, $3::public.party_type, $4)', [
          entityId,
          fullName,
          partyType as PartyType,
          taxId || null,
        ])
      ).rows[0],
    );
    if (!party) throw new Error('add_related_party no devolvió resultado');
    revalidatePath(`/entidades/${entityId}`);
    return { result: { success: true, data: party, error: null }, values: { full_name: '', party_type: partyType, tax_id: '' } };
  } catch (err) {
    return fail(failure(err, 'addRelatedParty'));
  }
}

export type SimpleState = ActionResult<null> | null;

export async function removeRelatedParty(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const entityId = str(formData, 'entity_id');
  const partyId = str(formData, 'party_id');
  const reason = str(formData, 'reason');

  if (!isUuid(partyId) || !isUuid(entityId)) return { success: false, data: null, error: 'Registro inválido.' };
  if (reason.length < MIN_REASON) {
    return { success: false, data: null, error: `Explica el motivo (mínimo ${MIN_REASON} caracteres).` };
  }

  try {
    await withAdmin((db) => db.query('select public.remove_related_party($1, $2)', [partyId, reason]));
    revalidatePath(`/entidades/${entityId}`);
    return { success: true, data: null, error: null };
  } catch (err) {
    return { success: false, data: null, error: failure(err, 'removeRelatedParty') };
  }
}

// ---------------------------------------------------------------------------
// Decisión humana
// ---------------------------------------------------------------------------

const DECISIONS: readonly EntityStatus[] = ['approved', 'rejected', 'pending'];

export type DecisionState = { result: ActionResult<LegalEntity>; reason: string } | null;

export async function decideEntity(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  const entityId = str(formData, 'entity_id');
  const status = str(formData, 'status') as EntityStatus;
  const reason = str(formData, 'reason');
  const fail = (error: string): DecisionState => ({ result: { success: false, data: null, error }, reason });

  if (!isUuid(entityId)) return fail('Entidad inválida.');
  if (!DECISIONS.includes(status)) return fail('Decisión inválida.');
  if (reason.length < MIN_REASON) return fail(`El motivo es obligatorio (mínimo ${MIN_REASON} caracteres). Queda en la bitácora.`);

  try {
    const entity = await withAdmin(async (db) =>
      (await db.query<LegalEntity>('select * from public.decide_entity($1, $2::public.entity_status, $3)', [entityId, status, reason]))
        .rows[0],
    );
    if (!entity) throw new Error('decide_entity no devolvió resultado');
    revalidatePath('/entidades');
    revalidatePath(`/entidades/${entityId}`);
    return { result: { success: true, data: entity, error: null }, reason: '' };
  } catch (err) {
    return fail(failure(err, 'decideEntity'));
  }
}

// ---------------------------------------------------------------------------
// Falso positivo
// ---------------------------------------------------------------------------

export async function dismissMatch(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const entityId = str(formData, 'entity_id');
  const subjectKey = str(formData, 'subject_key');
  const source = str(formData, 'source');
  const matchKey = str(formData, 'match_key');
  const reason = str(formData, 'reason');

  if (!isUuid(entityId) || (subjectKey !== 'entity' && !isUuid(subjectKey)) || !source || !matchKey) {
    return { success: false, data: null, error: 'Coincidencia inválida.' };
  }
  if (reason.length < MIN_REASON) {
    return { success: false, data: null, error: `Explica cómo descartaste la coincidencia (mínimo ${MIN_REASON} caracteres).` };
  }

  try {
    await withAdmin((db) =>
      db.query('select public.dismiss_match($1, $2, $3, $4, $5)', [entityId, subjectKey, source, matchKey, reason]),
    );
    revalidatePath(`/entidades/${entityId}`);
    return { success: true, data: null, error: null };
  } catch (err) {
    return { success: false, data: null, error: failure(err, 'dismissMatch') };
  }
}

