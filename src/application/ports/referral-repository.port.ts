import type { Patient } from '../../domain/entities/patient.entity';
import type {
  CounterReferral,
  ReferralAlertReason,
} from '../../domain/entities/referral.entity';
import type { CounterReferralQueueItem } from '../dto/counter-referral-queue-item.dto';
import type { CounterReferralResult } from '../dto/counter-referral-result.dto';
import type { CounterReferralUpload } from '../dto/counter-referral-upload.dto';

/**
 * Todo lo que el área de Referencias y Contrarreferencias necesita del
 * servidor. Va en su propio puerto y no dentro de PatientRepositoryPort
 * porque es otro dominio con otros permisos: quien lee la cohorte no
 * necesariamente puede avisarle a una posta ni mandar una carta.
 */
export interface ReferralRepositoryPort {
  /** Los que están por cumplir 18 y le tocan al área (2 meses o menos). */
  listNoticeQueue(): Promise<Patient[]>;

  /** Los que ya cumplieron 18, cada uno con su carta (si ya la subieron). */
  listCounterReferralQueue(): Promise<CounterReferralQueueItem[]>;

  /** El aviso del área a la posta. Devuelve la fila actualizada. */
  notifyHealthPost(patientId: string): Promise<Patient>;

  /** El reclamo del especialista al área. */
  alertReferralArea(
    patientId: string,
    reason: ReferralAlertReason,
  ): Promise<Patient>;

  /** La carta de contrarreferencia. null = todavía no se subió. */
  getCounterReferral(patientId: string): Promise<CounterReferral | null>;

  /** Sube la carta redactada en el sistema externo. */
  uploadCounterReferral(
    patientId: string,
    upload: CounterReferralUpload,
  ): Promise<CounterReferralResult>;

  /** La manda a la posta. Solo después de que el paciente cumple 18. */
  sendCounterReferral(patientId: string): Promise<CounterReferralResult>;
}
