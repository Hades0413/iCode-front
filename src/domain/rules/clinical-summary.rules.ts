import type { ClinicalSummary } from '../entities/clinical-summary.entity';
import type { Patient } from '../entities/patient.entity';
import {
  ENABLED_MONTHS_BEFORE_18,
  isInTutelage,
  isTransitionEnabled,
} from './transition.rules';

/**
 * Reglas de la historia clínica de transferencia: cuánto está armada, en qué
 * escalón está y quién puede hacer qué con ella.
 *
 * Están aquí y no en el componente por lo mismo que el resto de domain/rules:
 * "listo para revisar" tiene que significar exactamente lo mismo en la
 * columna de la tabla, en el panel de la ficha, en el conteo del riel y en el
 * día que esto lo calcule iCode-back.
 */

/**
 * El techo de un borrador: por más que estén escritas las 6 secciones, sin
 * la firma de un médico el documento no está completo. Ese 15 % que falta
 * ES la firma — que un texto generado por IA se muestre al 100 % antes de
 * que alguien lo lea es exactamente lo que no queremos.
 */
export const DRAFT_CEILING = 0.85;

/** A partir de aquí el borrador ya está escrito entero y espera revisión. */
export const REVIEW_READY_PROGRESS = 0.8;

/**
 * Los escalones que ve el médico en la lista. No son los estados del recurso
 * (esos son NONE/DRAFT/APPROVED): son los estados de SU trabajo, que es otra
 * cosa — "aún no arranca" y "sin generar" son el mismo NONE pero pedirle algo
 * a alguien en el primer caso sería pedirle algo que todavía no le toca.
 */
export type SummaryStage =
  'LOCKED' | 'NONE' | 'PREPARING' | 'REVIEW' | 'VALIDATED';

export const SUMMARY_STAGE_LABELS: Record<SummaryStage, string> = {
  LOCKED: 'Aún no arranca',
  NONE: 'Sin generar',
  PREPARING: 'En preparación',
  REVIEW: 'Revisión',
  VALIDATED: 'Validado',
};

/** La línea que explica el escalón, para el tooltip. */
export const SUMMARY_STAGE_HINTS: Record<SummaryStage, string> = {
  LOCKED: `Le faltan más de ${ENABLED_MONTHS_BEFORE_18} meses para cumplir 18`,
  NONE: 'Todavía no tiene historia clínica de transferencia',
  PREPARING: 'El borrador está a medio escribir',
  REVIEW: 'El borrador está completo y espera que un médico lo firme',
  VALIDATED: 'Firmado: ya puede viajar con el paciente',
};

/**
 * Cuánto está armado el documento, 0..1. Es la definición que el servidor
 * copia en `patient.summaryProgress`, así que vive una sola vez.
 */
export function summaryProgress(summary: ClinicalSummary): number {
  if (summary.status === 'APPROVED') {
    return 1;
  }
  if (summary.sections.length === 0) {
    return 0;
  }
  const written = summary.sections.filter(
    (section) => section.body.trim() !== '',
  ).length;
  return (written / summary.sections.length) * DRAFT_CEILING;
}

/** Para mostrar: 0.85 -> 85. */
export function summaryPercent(progress: number): number {
  return Math.round(progress * 100);
}

export function summaryStage(patient: Patient): SummaryStage {
  if (patient.summaryStatus === 'APPROVED') {
    return 'VALIDATED';
  }
  // "Aún no arranca" solo si además no hay nada escrito: si alguien empezó el
  // resumen antes de tiempo, el escalón tiene que mostrar el borrador que
  // existe y no decir que el proceso no empezó.
  if (patient.summaryStatus === 'NONE') {
    return isTransitionEnabled(patient) ? 'NONE' : 'LOCKED';
  }
  return patient.summaryProgress >= REVIEW_READY_PROGRESS
    ? 'REVIEW'
    : 'PREPARING';
}

/**
 * Se le puede pedir a la IA el borrador: el proceso ya arrancó, el paciente
 * sigue siendo del pediatra y no hay nada escrito todavía.
 */
export function canGenerateSummary(patient: Patient): boolean {
  return (
    isTransitionEnabled(patient) &&
    isInTutelage(patient) &&
    patient.summaryStatus === 'NONE'
  );
}

/** Hay un borrador esperando: revisarlo o corregirlo. Firmar es aparte. */
export function canReviewSummary(patient: Patient): boolean {
  return patient.summaryStatus === 'DRAFT' && isInTutelage(patient);
}

/**
 * La firma se hace **1 día antes del cumpleaños**, no cuando el borrador
 * queda lindo: hasta ese día pueden aparecer enfermedades nuevas, y una
 * historia firmada no se puede seguir editando. El tablero mide en meses,
 * así que la ventana es el último mes de tutela — la alerta y el texto de la
 * UI son los que dicen "1 día antes".
 */
export const SIGN_MONTHS_BEFORE_18 = 1;

/** Ya está en el último mes: la firma entra en su ventana. */
export function isInSignWindow(patient: Patient): boolean {
  return (
    isInTutelage(patient) && patient.monthsToEighteen <= SIGN_MONTHS_BEFORE_18
  );
}

/** Hay borrador Y ya llegó el momento: recién ahí se puede firmar. */
export function canApproveSummary(patient: Patient): boolean {
  return canReviewSummary(patient) && isInSignWindow(patient);
}

/** Por qué todavía no se puede firmar. null = ya se puede. */
export function signBlockedReason(patient: Patient): string | null {
  if (patient.summaryStatus !== 'DRAFT') {
    return null;
  }
  if (isInSignWindow(patient)) {
    return null;
  }
  return `La historia se firma 1 día antes del cumpleaños y ${patient.initials} todavía tiene ${patient.monthsToEighteen} meses por delante. Hasta entonces, guárdala y sigue editándola si aparece algo nuevo.`;
}

/**
 * Volver a pedirle el borrador a la IA. Solo si nadie lo editó: regenerar
 * después de que un médico escribió encima sería botarle el trabajo.
 */
export function canRegenerateSummary(
  patient: Patient,
  summary: ClinicalSummary,
): boolean {
  return (
    canReviewSummary(patient) &&
    summary.status === 'DRAFT' &&
    summary.editedAt === null
  );
}

/** Por qué no se puede tocar el resumen todavía. null = sí se puede. */
export function summaryBlockedReason(patient: Patient): string | null {
  if (!isInTutelage(patient)) {
    return 'Ya cumplió 18: su historia clínica la maneja el hospital de adultos.';
  }
  if (!isTransitionEnabled(patient)) {
    return `El traspaso arranca ${ENABLED_MONTHS_BEFORE_18} meses antes de cumplir 18. A este paciente todavía le faltan ${patient.monthsToEighteen}.`;
  }
  return null;
}

/** Cuántas cosas quedan sin confirmar antes de poder firmar tranquilo. */
export function pendingCheckCount(summary: ClinicalSummary | null): number {
  return summary?.pendingChecks.length ?? 0;
}

/* ---------- las alertas del médico ---------- */

export type DoctorAlertKind = 'SIGN_DUE' | 'GENERATE_DUE';

export interface DoctorAlert {
  kind: DoctorAlertKind;
  patient: Patient;
  /** Qué hay que hacer, dicho como se le muestra. */
  message: string;
}

/**
 * Lo que la campanita le recuerda al médico. Son exactamente los dos
 * olvidos que rompen el proceso:
 *
 * - **SIGN_DUE**: el paciente entró en su último mes y su historia sigue en
 *   borrador. La firma es 1 día antes del cumpleaños, y un cumpleaños sin
 *   firma es un paciente que cruza sin documento.
 * - **GENERATE_DUE**: entró en la ventana de los 3 meses y todavía no tiene
 *   ni el borrador.
 *
 * Las firmas van primero y ambos grupos se ordenan por urgencia: la campana
 * existe para el que menos tiempo tiene.
 */
export function doctorAlerts(patients: readonly Patient[]): DoctorAlert[] {
  const byUrgency = (a: Patient, b: Patient) =>
    a.monthsToEighteen - b.monthsToEighteen;

  const toSign = patients
    .filter(canApproveSummary)
    .sort(byUrgency)
    .map((patient) => ({
      kind: 'SIGN_DUE' as const,
      patient,
      message:
        'Cumple 18 muy pronto y su historia sigue en borrador. Se firma 1 día antes del cumpleaños.',
    }));

  const toCreate = patients
    .filter(canGenerateSummary)
    .sort(byUrgency)
    .map((patient) => ({
      kind: 'GENERATE_DUE' as const,
      patient,
      message: `Entró en los ${ENABLED_MONTHS_BEFORE_18} meses: ya puedes crear su historia clínica.`,
    }));

  return [...toSign, ...toCreate];
}
