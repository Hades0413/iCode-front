import type { Patient } from '../../domain/entities/patient.entity';
import type {
  CounterReferral,
  ReferralAlertReason,
} from '../../domain/entities/referral.entity';
import {
  canNotifyHealthPost,
  canSendCounterReferral,
  canUploadCounterReferral,
  counterReferralBlockedReason,
  pendingReferralAction,
} from '../../domain/rules/referral.rules';
import type { CounterReferralQueueItem } from '../dto/counter-referral-queue-item.dto';
import type { CounterReferralResult } from '../dto/counter-referral-result.dto';
import type { CounterReferralUpload } from '../dto/counter-referral-upload.dto';
import type { ReferralRepositoryPort } from '../ports/referral-repository.port';

/** Se lanza cuando el acto no corresponde en este momento del proceso. */
export class ReferralNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferralNotAllowedError';
  }
}

/**
 * Los casos de uso del área de Referencias y Contrarreferencias, más el
 * reclamo que el especialista le hace al área.
 *
 * Está separado de PatientService a propósito: son dos oficinas distintas del
 * mismo hospital. El médico prepara y firma la historia clínica; el área
 * habla con la posta y manda la carta. Un solo service con las dos cosas
 * escondería que la app tiene dos usuarios con dos trabajos.
 *
 * Las precondiciones se chequean aquí antes de salir a la red — el servidor
 * las valida igual (409), pero no tiene sentido gastar un request para que
 * nos digan lo que ya sabemos.
 */
export class ReferralService {
  private readonly referralRepository: ReferralRepositoryPort;

  constructor(referralRepository: ReferralRepositoryPort) {
    this.referralRepository = referralRepository;
  }

  /** La bandeja del área: los que cumplen 18 en 2 meses o menos. */
  async getNoticeQueue(): Promise<Patient[]> {
    return this.referralRepository.listNoticeQueue();
  }

  /** Los que ya cumplieron 18 y esperan su carta, con la carta que tengan. */
  async getCounterReferralQueue(): Promise<CounterReferralQueueItem[]> {
    return this.referralRepository.listCounterReferralQueue();
  }

  /**
   * El aviso a la posta. Es **solo un aviso**: la cita se pide cuando el
   * paciente cumple 18, así que esto no agenda nada ni puede hacerlo.
   */
  async notifyHealthPost(patient: Patient): Promise<Patient> {
    if (!canNotifyHealthPost(patient)) {
      throw new ReferralNotAllowedError(
        patient.healthPost === null
          ? 'Este paciente todavía no tiene una posta asignada.'
          : `Todavía no toca avisar: le faltan ${patient.monthsToEighteen} meses para cumplir 18.`,
      );
    }
    return this.referralRepository.notifyHealthPost(patient.id);
  }

  /**
   * El reclamo del especialista al área. La razón no la elige la UI: sale de
   * lo que efectivamente está faltando, para que el reclamo no pueda decir
   * una cosa distinta de lo que muestra el tablero.
   */
  async alertReferralArea(patient: Patient): Promise<Patient> {
    const reason: ReferralAlertReason | null = pendingReferralAction(patient);
    if (reason === null) {
      throw new ReferralNotAllowedError(
        'El área ya hizo lo que le tocaba con este caso.',
      );
    }
    return this.referralRepository.alertReferralArea(patient.id, reason);
  }

  async getCounterReferral(patientId: string): Promise<CounterReferral | null> {
    return this.referralRepository.getCounterReferral(patientId);
  }

  /** Sube la carta. Subir no es enviar: queda guardada, sin salir. */
  async uploadCounterReferral(
    patient: Patient,
    upload: CounterReferralUpload,
  ): Promise<CounterReferralResult> {
    if (!canUploadCounterReferral(patient)) {
      throw new ReferralNotAllowedError(
        counterReferralBlockedReason(patient) ??
          'No se puede subir la carta de este paciente.',
      );
    }
    return this.referralRepository.uploadCounterReferral(patient.id, upload);
  }

  /**
   * El envío a la posta. La regla dura del proceso: **no puede salir antes de
   * que el paciente cumpla 18**. Hasta ese día el caso es del hospital de
   * niños, y una contrarreferencia adelantada lo devolvería mientras todavía
   * se atiende aquí.
   */
  async sendCounterReferral(patient: Patient): Promise<CounterReferralResult> {
    if (!canSendCounterReferral(patient)) {
      throw new ReferralNotAllowedError(
        counterReferralBlockedReason(patient) ??
          'Primero hay que subir la carta.',
      );
    }
    return this.referralRepository.sendCounterReferral(patient.id);
  }
}
