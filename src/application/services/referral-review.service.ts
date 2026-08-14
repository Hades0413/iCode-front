import type { Patient } from '../../domain/entities/patient.entity';
import type { ReferralReview } from '../../domain/entities/referral-review.entity';
import { canReviewReferral } from '../../domain/rules/referral-review.rules';
import type { ReferralReviewResult } from '../dto/referral-review-result.dto';
import type { ReferralReviewRepositoryPort } from '../ports/referral-review-repository.port';

/** Se lanza cuando el destino todavía no puede revisar este caso. */
export class ReferralReviewNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferralReviewNotAllowedError';
  }
}

/**
 * Los casos de uso de "Referencia": qué dijo el destino sobre la historia
 * clínica ya firmada. Separado de ReferralService porque es otro permiso
 * (REFERRAL_REVIEW_MANAGE) y otro momento del recorrido — recién después
 * de la firma, no antes.
 */
export class ReferralReviewService {
  private readonly referralReviewRepository: ReferralReviewRepositoryPort;

  constructor(referralReviewRepository: ReferralReviewRepositoryPort) {
    this.referralReviewRepository = referralReviewRepository;
  }

  async getReferralReview(patientId: string): Promise<ReferralReview | null> {
    return this.referralReviewRepository.getReferralReview(patientId);
  }

  async downloadReferralReviewDocument(patientId: string): Promise<Blob> {
    return this.referralReviewRepository.downloadReferralReviewDocument(
      patientId,
    );
  }

  async acceptReferralReview(patient: Patient): Promise<ReferralReviewResult> {
    if (!canReviewReferral(patient)) {
      throw new ReferralReviewNotAllowedError(
        'Todavía no se puede revisar: la historia clínica no está firmada.',
      );
    }
    return this.referralReviewRepository.acceptReferralReview(patient.id);
  }

  async rejectReferralReview(
    patient: Patient,
    notes: string,
  ): Promise<ReferralReviewResult> {
    if (!canReviewReferral(patient)) {
      throw new ReferralReviewNotAllowedError(
        'Todavía no se puede revisar: la historia clínica no está firmada.',
      );
    }
    return this.referralReviewRepository.rejectReferralReview(
      patient.id,
      notes,
    );
  }

  async observeReferralReview(
    patient: Patient,
    file: File,
    notes: string | null,
  ): Promise<ReferralReviewResult> {
    if (!canReviewReferral(patient)) {
      throw new ReferralReviewNotAllowedError(
        'Todavía no se puede revisar: la historia clínica no está firmada.',
      );
    }
    return this.referralReviewRepository.observeReferralReview(
      patient.id,
      file,
      notes,
    );
  }
}
