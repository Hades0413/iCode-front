import type { Patient } from '../../domain/entities/patient.entity';
import type {
  CounterReferral,
  ReferralAlertReason,
} from '../../domain/entities/referral.entity';
import type { CounterReferralQueueItem } from '../../application/dto/counter-referral-queue-item.dto';
import type { CounterReferralResult } from '../../application/dto/counter-referral-result.dto';
import type { CounterReferralUpload } from '../../application/dto/counter-referral-upload.dto';
import type { ReferralRepositoryPort } from '../../application/ports/referral-repository.port';
import { getApiErrorStatus } from '../../common/utils/get-api-error-message';
import { apiClient } from '../http/api-client';

/** El recurso de la carta de un paciente. */
function letterUrl(patientId: string): string {
  return `/patients/${encodeURIComponent(patientId)}/counter-referral`;
}

/**
 * Implementación real de ReferralRepositoryPort contra la API de iCode-back.
 *
 * Las dos bandejas son endpoints propios del área y no un filtro sobre
 * `/patients`: son otra pregunta ("qué le toca hacer al área hoy"), con otro
 * permiso, y el día que la cohorte crezca el corte lo tiene que hacer la base
 * y no el navegador.
 */
class HttpReferralRepository implements ReferralRepositoryPort {
  async listNoticeQueue(): Promise<Patient[]> {
    const { data } = await apiClient.get<Patient[]>('/referrals/notice-queue');
    return data;
  }

  async listCounterReferralQueue(): Promise<CounterReferralQueueItem[]> {
    const { data } = await apiClient.get<CounterReferralQueueItem[]>(
      '/referrals/counter-queue',
    );
    return data;
  }

  async notifyHealthPost(patientId: string): Promise<Patient> {
    // Un aviso es un recurso que se crea, no una bandera que se activa: cada
    // uno queda registrado con su fecha y quién lo mandó.
    const { data } = await apiClient.post<Patient>(
      `/patients/${encodeURIComponent(patientId)}/post-notices`,
    );
    return data;
  }

  async alertReferralArea(
    patientId: string,
    reason: ReferralAlertReason,
  ): Promise<Patient> {
    const { data } = await apiClient.post<Patient>(
      `/patients/${encodeURIComponent(patientId)}/referral-alerts`,
      { reason },
    );
    return data;
  }

  /** 404 = todavía no subieron la carta, que es lo normal hasta los 18. */
  async getCounterReferral(patientId: string): Promise<CounterReferral | null> {
    try {
      const { data } = await apiClient.get<CounterReferral>(
        letterUrl(patientId),
      );
      return data;
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Multipart y no JSON: lo que sube el área es el documento que redactó en
   * el sistema externo, y ese archivo tiene que llegar entero al storage del
   * hospital. El backend simulado se queda solo con los metadatos (ver
   * mock/referrals.data.ts), pero el request que sale de aquí es el mismo que
   * va a recibir iCode-back.
   */
  async uploadCounterReferral(
    patientId: string,
    upload: CounterReferralUpload,
  ): Promise<CounterReferralResult> {
    const body = new FormData();
    body.append('file', upload.file);
    body.append('format', upload.format);
    if (upload.code) {
      body.append('code', upload.code);
    }

    const { data } = await apiClient.post<CounterReferralResult>(
      letterUrl(patientId),
      body,
    );
    return data;
  }

  /**
   * El envío es su propio sub-recurso y no un PATCH del estado: mandar la
   * carta a la posta es un acto con autor y fecha, y es el único punto del
   * proceso que no se puede deshacer.
   */
  async sendCounterReferral(patientId: string): Promise<CounterReferralResult> {
    const { data } = await apiClient.post<CounterReferralResult>(
      `${letterUrl(patientId)}/delivery`,
    );
    return data;
  }
}

export const referralRepository = new HttpReferralRepository();
