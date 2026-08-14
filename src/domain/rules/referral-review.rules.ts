import type { Patient } from '../entities/patient.entity';
import type { ReferralReviewStatus } from '../entities/referral-review.entity';

/**
 * Reglas de "Referencia": qué dijo el destino sobre la historia clínica ya
 * firmada. Vive aparte de clinical-summary.rules.ts porque es otro
 * documento con otro dueño (el área de Referencias, no el especialista).
 */

export const REFERRAL_REVIEW_STATUS_LABELS: Record<
  ReferralReviewStatus,
  string
> = {
  NONE: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  OBSERVED: 'Observada',
};

/**
 * El destino solo puede revisar una historia clínica ya firmada — mismo
 * requisito que exige el servidor (409 si no). Mostrar la acción antes de
 * tiempo solo generaría un error de red.
 */
export function canReviewReferral(patient: Patient): boolean {
  return patient.summaryStatus === 'APPROVED';
}
