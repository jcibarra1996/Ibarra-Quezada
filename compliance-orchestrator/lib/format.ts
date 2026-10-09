import type { DocumentStatus, EntityStatus, PartyType, RiskLevel, WatchlistCode } from '@/types/compliance';

export const ENTITY_STATUS_LABEL: Record<EntityStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  suspended: 'Suspendida',
};

export const ENTITY_STATUS_PLURAL: Record<EntityStatus, string> = {
  pending: 'Pendientes',
  approved: 'Aprobadas',
  rejected: 'Rechazadas',
  suspended: 'Suspendidas',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Riesgo bajo',
  medium: 'Riesgo medio',
  high: 'Riesgo alto',
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  pending_review: 'En revisión',
  valid: 'Vigente',
  expired: 'Vencido',
  rejected: 'Rechazado',
};

export const PARTY_TYPE_LABEL: Record<PartyType, string> = {
  legal_representative: 'Representante legal',
  shareholder: 'Accionista',
  beneficial_owner: 'Beneficiario controlador',
};

export const SOURCE_SHORT: Record<WatchlistCode, string> = {
  OFAC_SDN: 'OFAC SDN',
  UN_CONSOLIDATED: 'ONU',
  SAT_69B: 'SAT 69-B',
};

const ACTION_LABEL: Record<string, string> = {
  'entity.created': 'Alta de entidad',
  'entity.decision': 'Decisión',
  'party.added': 'Persona relacionada registrada',
  'party.removed': 'Persona relacionada retirada',
  'aml.initial_check': 'Chequeo AML',
  'aml.periodic_check': 'Re-chequeo periódico',
  'aml.match_dismissed': 'Falso positivo descartado',
  'aml.monitoring_alert': 'Alerta de monitoreo',
};

export function actionLabel(actionType: string): string {
  return ACTION_LABEL[actionType] ?? actionType;
}

const TZ = 'America/Mexico_City';

const dateTimeFmt = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TZ,
});

const dateFmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: TZ });

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return 'Sin registro';
  return dateTimeFmt.format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return 'Sin registro';
  return dateFmt.format(new Date(value));
}

export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Para columnas DATE (YYYY-MM-DD): se interpretan como fecha local, sin hora. */
export function formatPlainDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)),
  );
}

/** Días entre hoy (Ciudad de México) y una fecha YYYY-MM-DD. Negativo si ya pasó. */
export function daysUntil(ymd: string): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(ymd) - toUtc(today)) / 86_400_000);
}
