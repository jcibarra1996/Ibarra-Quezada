/**
 * Tipos del dominio de Compliance / AML.
 * Reflejan 1:1 el esquema de supabase/migrations/20261009000000_compliance_aml_core.sql.
 * Columnas `timestamptz` y `date` llegan de PostgREST como string ISO 8601.
 */

// ---------------------------------------------------------------------------
// Enums (public.entity_status, public.risk_level, public.document_status)
// ---------------------------------------------------------------------------

export const ENTITY_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const DOCUMENT_STATUSES = ['pending_review', 'valid', 'expired', 'rejected'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

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
  created_at: string;
}

export interface AmlScreening {
  id: string;
  entity_id: string;
  provider: string;
  risk_level: RiskLevel;
  raw_json_response: Json;
  last_checked_at: string;
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
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Inserts (columnas con default en la base son opcionales)
// ---------------------------------------------------------------------------

export type LegalEntityInsert = Pick<LegalEntity, 'name' | 'tax_id'> &
  Partial<Pick<LegalEntity, 'id' | 'country' | 'status' | 'created_at'>>;

export type AmlScreeningInsert = Pick<AmlScreening, 'entity_id' | 'provider' | 'risk_level'> &
  Partial<Pick<AmlScreening, 'id' | 'raw_json_response' | 'last_checked_at'>>;

export type ComplianceDocumentInsert = Pick<ComplianceDocument, 'entity_id' | 'doc_type' | 'file_path'> &
  Partial<Pick<ComplianceDocument, 'id' | 'expiration_date' | 'status'>>;

export type AuditLogInsert = Pick<AuditLog, 'entity_id' | 'action_type' | 'description'> &
  Partial<Pick<AuditLog, 'id' | 'timestamp'>>;

// ---------------------------------------------------------------------------
// Bitácora: action_type que emite este backend
// ---------------------------------------------------------------------------

export type AuditActionType =
  | 'aml.initial_check'
  | 'aml.initial_check_failed'
  | 'aml.monitoring_alert';

// ---------------------------------------------------------------------------
// Resultados de las RPC transaccionales
// ---------------------------------------------------------------------------

export interface ScreeningOutcome {
  screening: AmlScreening;
  previous_status: EntityStatus;
  entity_status: EntityStatus;
}

// ---------------------------------------------------------------------------
// Contrato de respuesta del backend
// ---------------------------------------------------------------------------

export type ActionResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

// ---------------------------------------------------------------------------
// Proveedor AML y webhook
// ---------------------------------------------------------------------------

export interface AmlProviderRequest {
  name: string;
  tax_id: string;
  country: string;
}

export interface AmlProviderMatch {
  list: string;
  matched_name: string;
  score: number;
}

export interface AmlProviderResponse {
  reference_id: string;
  risk_level: RiskLevel;
  matches: AmlProviderMatch[];
  checked_at: string;
}

export interface AmlAlert {
  /** Lista de origen, p. ej. "OFAC SDN". */
  list: string;
  description: string;
  /** Persona listada, p. ej. el representante legal. */
  subject_name?: string;
  external_id?: string;
  detected_at?: string;
}

export interface AmlAlertWebhookPayload {
  entity_id: string;
  provider?: string;
  alert: AmlAlert;
}

// ---------------------------------------------------------------------------
// Tipo Database para el cliente tipado de Supabase
// ---------------------------------------------------------------------------

// Las interfaces no tienen firma de índice implícita y el genérico de
// supabase-js exige Record<string, unknown>; Plain las convierte en tipos objeto.
type Plain<T> = { [K in keyof T]: T[K] };

type Table<Row, Insert> = {
  Row: Plain<Row>;
  Insert: Plain<Insert>;
  Update: Partial<Plain<Row>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      legal_entities: Table<LegalEntity, LegalEntityInsert>;
      aml_screenings: Table<AmlScreening, AmlScreeningInsert>;
      compliance_documents: Table<ComplianceDocument, ComplianceDocumentInsert>;
      audit_logs: Table<AuditLog, AuditLogInsert>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      record_aml_screening: {
        Args: {
          p_entity_id: string;
          p_provider: string;
          p_risk_level: RiskLevel;
          p_raw_json_response: Json;
        };
        Returns: Json;
      };
      apply_aml_alert: {
        Args: { p_entity_id: string; p_provider: string; p_alert: Json };
        Returns: Json;
      };
      log_audit_event: {
        Args: { p_entity_id: string; p_action_type: string; p_description: string };
        Returns: Plain<AuditLog>;
      };
    };
    Enums: {
      entity_status: EntityStatus;
      risk_level: RiskLevel;
      document_status: DocumentStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
