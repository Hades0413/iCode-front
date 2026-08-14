import type { ReferralReview } from '../../domain/entities/referral-review.entity';
import type { ReferralReviewResult } from '../../application/dto/referral-review-result.dto';
import type { ReferralReviewRepositoryPort } from '../../application/ports/referral-review-repository.port';
import { getApiErrorStatus } from '../../common/utils/get-api-error-message';
import { apiClient } from '../http/api-client';

function reviewUrl(patientId: string): string {
  return `/patients/${encodeURIComponent(patientId)}/referral-review`;
}

/** Implementación real de ReferralReviewRepositoryPort contra la API de iCode-back. */
class HttpReferralReviewRepository implements ReferralReviewRepositoryPort {
  /** 404 = el destino todavía no la revisó. */
  async getReferralReview(patientId: string): Promise<ReferralReview | null> {
    try {
      const { data } = await apiClient.get<ReferralReview>(
        reviewUrl(patientId),
      );
      return data;
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  async downloadReferralReviewDocument(patientId: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(
      `${reviewUrl(patientId)}/document`,
      { responseType: 'blob' },
    );
    return data;
  }

  async acceptReferralReview(
    patientId: string,
  ): Promise<ReferralReviewResult> {
    const { data } = await apiClient.post<ReferralReviewResult>(
      `${reviewUrl(patientId)}/acceptance`,
    );
    return data;
  }

  async rejectReferralReview(
    patientId: string,
    notes: string,
  ): Promise<ReferralReviewResult> {
    const { data } = await apiClient.post<ReferralReviewResult>(
      `${reviewUrl(patientId)}/rejection`,
      { notes },
    );
    return data;
  }

  async observeReferralReview(
    patientId: string,
    file: File,
    notes: string | null,
  ): Promise<ReferralReviewResult> {
    const body = new FormData();
    body.append('file', file);
    if (notes) {
      body.append('notes', notes);
    }
    const { data } = await apiClient.post<ReferralReviewResult>(
      `${reviewUrl(patientId)}/observation`,
      body,
    );
    return data;
  }
}

export const referralReviewRepository = new HttpReferralReviewRepository();
