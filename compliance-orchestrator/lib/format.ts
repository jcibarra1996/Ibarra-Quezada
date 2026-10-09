import type { DocumentStatus, EntityStatus, RiskLevel } from '@/types/compliance';

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

const ACTION_LABEL: Record<string, string> = {
  'entity.created': 'Alta de entidad',
  'aml.initial_check': 'Chequeo AML inicial',
  'aml.initial_check_failed': 'Chequeo AML no completado',
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

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Sin registro';
  return dateTimeFmt.format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Sin registro';
  return dateFmt.format(new Date(iso));
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
