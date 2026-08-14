import type { ReferralReview } from '../../domain/entities/referral-review.entity';
import type { ReferralReviewResult } from '../dto/referral-review-result.dto';

/**
 * Lo que dijo el destino (posta u hospital) sobre la historia clínica de
 * transferencia ya firmada. Va en su propio puerto y no dentro de
 * ReferralRepositoryPort porque es otro permiso (REFERRAL_REVIEW_MANAGE,
 * no COUNTER_REFERRAL_MANAGE) y otro momento del recorrido.
 */
export interface ReferralReviewRepositoryPort {
  /** La respuesta del destino. null = todavía no la revisó. */
  getReferralReview(patientId: string): Promise<ReferralReview | null>;

  /** El PDF de la observación, para abrirlo/descargarlo. */
  downloadReferralReviewDocument(patientId: string): Promise<Blob>;

  /** El destino aceptó el caso. */
  acceptReferralReview(patientId: string): Promise<ReferralReviewResult>;

  /** El destino rechazó el caso. */
  rejectReferralReview(
    patientId: string,
    notes: string,
  ): Promise<ReferralReviewResult>;

  /** El destino observó la historia clínica — adjunta un PDF con el detalle. */
  observeReferralReview(
    patientId: string,
    file: File,
    notes: string | null,
  ): Promise<ReferralReviewResult>;
}
