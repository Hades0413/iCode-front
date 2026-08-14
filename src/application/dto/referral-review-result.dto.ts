import type { Patient } from '../../domain/entities/patient.entity';
import type { ReferralReview } from '../../domain/entities/referral-review.entity';

/**
 * Lo que contesta el servidor al aceptar/rechazar/observar: el documento
 * **y** la fila del paciente — mismo criterio que CounterReferralResult
 * (cambia `referralReviewStatus`, evita recargar la lista entera).
 */
export interface ReferralReviewResult {
  patient: Patient;
  referralReview: ReferralReview;
}
