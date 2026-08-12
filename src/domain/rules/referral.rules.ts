import type { Patient } from '../entities/patient.entity';
import type { ReferralAlertReason } from '../entities/referral.entity';
import { hasTurnedEighteen, isInTutelage } from './transition.rules';

/**
 * Las reglas del área de Referencias y Contrarreferencias: cuándo le toca
 * avisar a la posta, cuándo puede salir la carta, y cuándo el especialista
 * tiene derecho a reclamarle.
 *
 * Están aquí, puras, porque las miran los dos lados: la bandeja del área para
 * saber qué hacer hoy, el tablero del médico para saber si el área lo hizo, y
 * el servidor para no aceptar una carta antes de tiempo.
 */

/**
 * El aviso a la posta sale **2 meses antes** del cumpleaños. Ni antes ni
 * después: antes la posta archiva un caso que no puede tramitar todavía
 * (la cita se pide recién cuando el paciente cumple 18), y después no le
 * queda tiempo de conseguir el cupo.
 */
export const NOTICE_MONTHS_BEFORE_18 = 2;

/** Ya está en la ventana de aviso: le faltan 2 meses o menos. */
export function isInNoticeWindow(patient: Patient): boolean {
  return (
    patient.monthsToEighteen <= NOTICE_MONTHS_BEFORE_18 && isInTutelage(patient)
  );
}

export function hasPostNotice(patient: Patient): boolean {
  return patient.postNotices.length > 0;
}

export function lastPostNoticeAt(patient: Patient): string | null {
  return patient.postNotices.at(-1)?.sentAt ?? null;
}

/** Le toca al área y todavía no lo hizo: es su trabajo de hoy. */
export function isPostNoticeDue(patient: Patient): boolean {
  return isInNoticeWindow(patient) && !hasPostNotice(patient);
}

/**
 * Se puede avisar. Mientras el paciente siga en tutela alcanza con estar en
 * la ventana; después de los 18 el aviso todavía sirve (llega tarde, pero
 * la posta igual tiene que recibir el caso) mientras la carta no haya salido.
 */
export function canNotifyHealthPost(patient: Patient): boolean {
  return (
    patient.healthPost !== null &&
    (isInNoticeWindow(patient) ||
      (hasTurnedEighteen(patient) && patient.counterReferralStatus !== 'SENT'))
  );
}

/**
 * Se pasó de plazo: le queda un mes o menos y la posta todavía no se enteró.
 * Es lo que el especialista ve en su tablero y lo que dispara su reclamo.
 */
export function isPostNoticeOverdue(patient: Patient): boolean {
  return (
    isInTutelage(patient) &&
    patient.monthsToEighteen <= NOTICE_MONTHS_BEFORE_18 - 1 &&
    !hasPostNotice(patient)
  );
}

/** Ya cumplió 18 y su carta todavía no salió a la posta. */
export function isCounterReferralDue(patient: Patient): boolean {
  return hasTurnedEighteen(patient) && patient.counterReferralStatus !== 'SENT';
}

/**
 * La carta se redacta y se sube **desde el cumpleaños**, no antes: hasta ese
 * día el paciente sigue siendo del hospital de niños y una contrarreferencia
 * adelantada lo devolvería a la posta mientras todavía se atiende aquí.
 */
export function canUploadCounterReferral(patient: Patient): boolean {
  return hasTurnedEighteen(patient) && patient.counterReferralStatus !== 'SENT';
}

/** Enviarla a la posta: hace falta que exista y que ya haya cumplido 18. */
export function canSendCounterReferral(patient: Patient): boolean {
  return (
    hasTurnedEighteen(patient) && patient.counterReferralStatus === 'UPLOADED'
  );
}

/** Por qué la carta todavía no se puede tocar. null = sí se puede. */
export function counterReferralBlockedReason(patient: Patient): string | null {
  if (isInTutelage(patient)) {
    const months = patient.monthsToEighteen;
    return `Todavía no cumple 18 (le ${months === 1 ? 'falta 1 mes' : `faltan ${months} meses`}). La carta no puede salir antes: hasta ese día el paciente es del hospital de niños.`;
  }
  if (patient.counterReferralStatus === 'SENT') {
    return 'La carta ya se envió a la posta.';
  }
  return null;
}

/**
 * Qué le puede reclamar el especialista al área, o null si no hay nada que
 * reclamar. El orden importa: si falta el aviso, eso es lo urgente — la carta
 * viene después.
 */
export function pendingReferralAction(
  patient: Patient,
): ReferralAlertReason | null {
  if (isPostNoticeOverdue(patient)) {
    return 'POST_NOTICE';
  }
  if (isCounterReferralDue(patient)) {
    return 'COUNTER_REFERRAL';
  }
  // Perdió su cita y nadie la reprogramó: es del área conseguirle otra con
  // la posta — el médico solo puede empujar.
  if (hasTurnedEighteen(patient) && patient.state === 'LOST_TO_FOLLOW_UP') {
    return 'RESCHEDULE';
  }
  return null;
}

/** Lo que el médico está reclamando, dicho como se lo muestra. */
export const REFERRAL_ALERT_LABELS: Record<ReferralAlertReason, string> = {
  POST_NOTICE: 'Falta avisarle a la posta',
  COUNTER_REFERRAL: 'Falta enviar la carta de contrarreferencia',
  RESCHEDULE: 'Falta reprogramar su cita perdida',
};

/** Cuántas veces ya se le reclamó al área por este caso. */
export function referralAlertCount(patient: Patient): number {
  return patient.referralAlerts.length;
}

/* ---------- lo que ve la bandeja del área ---------- */

/** Los escalones del trabajo del área, en el orden en que ocurren. */
export type ReferralStage =
  | 'NOT_DUE'
  | 'NOTICE_DUE'
  | 'NOTICE_SENT'
  | 'LETTER_DUE'
  | 'LETTER_UPLOADED'
  | 'LETTER_SENT';

export const REFERRAL_STAGE_LABELS: Record<ReferralStage, string> = {
  NOT_DUE: 'Todavía no toca',
  NOTICE_DUE: 'Hay que avisar',
  NOTICE_SENT: 'Posta avisada',
  LETTER_DUE: 'Falta la carta',
  LETTER_UPLOADED: 'Carta lista, sin enviar',
  LETTER_SENT: 'Carta enviada',
};

export function referralStage(patient: Patient): ReferralStage {
  if (hasTurnedEighteen(patient)) {
    if (patient.counterReferralStatus === 'SENT') return 'LETTER_SENT';
    if (patient.counterReferralStatus === 'UPLOADED') return 'LETTER_UPLOADED';
    return 'LETTER_DUE';
  }
  if (!isInNoticeWindow(patient)) return 'NOT_DUE';
  return hasPostNotice(patient) ? 'NOTICE_SENT' : 'NOTICE_DUE';
}

/** Los números de la bandeja del área. */
export function referralSummary(patients: readonly Patient[]) {
  const inWindow = patients.filter(isInNoticeWindow);
  return {
    /** En ventana de aviso (2 meses o menos). */
    inWindow: inWindow.length,
    /** De esos, los que todavía no tienen aviso: el trabajo de hoy. */
    noticeDue: inWindow.filter((p) => !hasPostNotice(p)).length,
    /** Y los que ya se avisaron. */
    noticeSent: inWindow.filter(hasPostNotice).length,
    /** Se pasaron de plazo: queda un mes o menos y la posta no sabe nada. */
    overdue: patients.filter(isPostNoticeOverdue).length,
    /** Reclamos del especialista sin resolver. */
    alerted: patients.filter(
      (p) => p.referralAlerts.length > 0 && pendingReferralAction(p) !== null,
    ).length,
  };
}

/** Los números de las contrarreferencias (los que ya cumplieron 18). */
export function counterReferralSummary(patients: readonly Patient[]) {
  return {
    total: patients.length,
    pending: patients.filter((p) => p.counterReferralStatus === 'NONE').length,
    uploaded: patients.filter((p) => p.counterReferralStatus === 'UPLOADED')
      .length,
    sent: patients.filter((p) => p.counterReferralStatus === 'SENT').length,
  };
}
