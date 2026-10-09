/**
 * Tipos del dominio de Compliance / AML.
 * Reflejan el esquema de db/migrations. Las columnas timestamptz llegan de
 * node-postgres como Date; date como string 'YYYY-MM-DD' (ver lib/db/server.ts).
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ENTITY_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const DOCUMENT_STATUSES = ['pending_review', 'valid', 'expired', 'rejected'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const PARTY_TYPES = ['legal_representative', 'shareholder', 'beneficial_owner'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export type WatchlistCode = 'OFAC_SDN' | 'UN_CONSOLIDATED' | 'SAT_69B';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------------

export interface LegalEntity {
  id: string;
  name: string;
  /** RFC cuando country = 'MX'. */
  tax_id: string;
  /** ISO 3166-1 alfa-2. */
  country: string;
  status: EntityStatus;
  created_at: Date;
}

export interface RelatedParty {
  id: string;
  entity_id: string;
  full_name: string;
  party_type: PartyType;
  tax_id: string | null;
  created_at: Date;
}

export interface AmlScreening {
  id: string;
  entity_id: string;
  provider: string;
  risk_level: RiskLevel;
  raw_json_response: Json;
  last_checked_at: Date;
}

export interface ComplianceDocument {
  id: string;
  entity_id: string;
  doc_type: string;
  file_path: string;
  /** YYYY-MM-DD */
  expiration_date: string | null;
  status: DocumentStatus;
}

export interface AuditLog {
  id: string;
  entity_id: string;
  action_type: string;
  description: string;
  actor: string;
  timestamp: Date;
}

export interface WatchlistSource {
  code: WatchlistCode;
  name: string;
  source_url: string;
  list_date: string | null;
  record_count: number;
  last_synced_at: Date | null;
}

export interface MatchDismissal {
  subject_key: string;
  source_code: WatchlistCode;
  match_key: string;
  reason: string;
  actor: string;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Resultado del motor de listas (aml_screenings.raw_json_response)
// ---------------------------------------------------------------------------

export interface WatchlistMatch {
  source: WatchlistCode;
  source_name: string;
  external_id: string;
  /** Clave estable para recordar descartes entre versiones de la lista. */
  match_key: string;
  matched_name: string;
  primary_name: string;
  match_type: 'rfc' | 'name';
  score: number;
  /** SAT 69-B: situación del contribuyente. */
  status: string | null;
  programs: string | null;
  risk: RiskLevel;
  /** Falso positivo descartado por una persona: ya no cuenta para el riesgo. */
  dismissed?: boolean;
  original_risk?: RiskLevel;
  dismissal_reason?: string;
  dismissed_by?: string;
  dismissed_at?: string;
}

export interface ScreenedSubject {
  role: 'entity' | PartyType;
  role_label: string;
  party_id?: string;
  name: string;
  tax_id: string | null;
  risk: RiskLevel;
  matches: WatchlistMatch[];
}

export interface ScreeningReport {
  engine: 'iq-listas';
  version: number;
  risk_level: RiskLevel;
  checked_at: string;
  sources: (Omit<WatchlistSource, 'source_url' | 'last_synced_at'> & { last_synced_at: string; stale: boolean })[];
  warnings: string[];
  subjects: ScreenedSubject[];
}

/** Resultado de run_aml_screening / apply_aml_alert (JSON, fechas como string). */
export interface ScreeningOutcome {
  screening: Omit<AmlScreening, 'last_checked_at'> & { last_checked_at: string };
  previous_status: EntityStatus;
  entity_status: EntityStatus;
}

// ---------------------------------------------------------------------------
// Bitácora: action_type que emite este backend
// ---------------------------------------------------------------------------

export type AuditActionType =
  | 'entity.created'
  | 'entity.decision'
  | 'party.added'
  | 'party.removed'
  | 'aml.initial_check'
  | 'aml.periodic_check'
  | 'aml.match_dismissed'
  | 'aml.monitoring_alert';

// ---------------------------------------------------------------------------
// Contrato de respuesta del backend
// ---------------------------------------------------------------------------

export type ActionResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

// ---------------------------------------------------------------------------
// Webhook de alertas externas
// ---------------------------------------------------------------------------

export interface AmlAlert {
  /** Lista de origen, p. ej. "OFAC SDN". */
  list: string;
  description: string;
  subject_name?: string;
  external_id?: string;
  detected_at?: string;
}

export interface AmlAlertWebhookPayload {
  entity_id: string;
  provider?: string;
  alert: AmlAlert;
}
