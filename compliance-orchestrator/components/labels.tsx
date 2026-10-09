import { DOCUMENT_STATUS_LABEL, ENTITY_STATUS_LABEL, RISK_LABEL } from '@/lib/format';
import type { DocumentStatus, EntityStatus, RiskLevel } from '@/types/compliance';

const ENTITY_TONE: Record<EntityStatus, string> = {
  suspended: 'label-alert',
  rejected: 'label-strong',
  approved: 'label-outline',
  pending: 'label-quiet',
};

const RISK_TONE: Record<RiskLevel, string> = {
  high: 'label-alert',
  medium: 'label-accent-outline',
  low: 'label-quiet',
};

const DOCUMENT_TONE: Record<DocumentStatus, string> = {
  expired: 'label-alert',
  rejected: 'label-strong',
  valid: 'label-outline',
  pending_review: 'label-quiet',
};

export function EntityStatusLabel({ status }: { status: EntityStatus }) {
  return <span className={`label ${ENTITY_TONE[status]}`}>{ENTITY_STATUS_LABEL[status]}</span>;
}

export function RiskLabel({ risk }: { risk: RiskLevel | null }) {
  if (!risk) return <span className="label label-quiet">Sin chequeo</span>;
  return <span className={`label ${RISK_TONE[risk]}`}>{RISK_LABEL[risk]}</span>;
}

export function DocumentStatusLabel({ status }: { status: DocumentStatus }) {
  return <span className={`label ${DOCUMENT_TONE[status]}`}>{DOCUMENT_STATUS_LABEL[status]}</span>;
}
