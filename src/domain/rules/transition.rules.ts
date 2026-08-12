import type {
  ClinicalSummaryStatus,
  Patient,
  TransitionState,
} from '../entities/patient.entity';

/**
 * Reglas del recorrido que valen para UN paciente. Son funciones puras: la
 * misma definición sirve para la tabla, para los KPIs, para la ficha y para
 * un test, y ninguna sabe que existe React.
 */

/** Orden del recorrido. Ordenar por estado = ordenar por este índice. */
export const TRANSITION_STATES: readonly TransitionState[] = [
  'PENDING',
  'IN_PREPARATION',
  'REFERRED_TO_POST',
  'APPOINTMENT_IN_PROCESS',
  'APPOINTMENT_GRANTED',
  'FIRST_CARE_DONE',
  'LOST_TO_FOLLOW_UP',
  'READMITTED',
];

/**
 * Las etiquetas dicen QUÉ PASA, no el nombre técnico del estado. "Derivado a
 * la posta" o "Pérdida de seguimiento" son correctos pero hay que traducirlos
 * mentalmente; "En la posta" y "Se perdió" se entienden al toque.
 */
export const TRANSITION_STATE_LABELS: Record<TransitionState, string> = {
  PENDING: 'Sin empezar',
  IN_PREPARATION: 'Preparando',
  REFERRED_TO_POST: 'En la posta',
  APPOINTMENT_IN_PROCESS: 'Pidiendo la cita',
  APPOINTMENT_GRANTED: 'Ya tiene cita',
  FIRST_CARE_DONE: 'Ya lo atendieron',
  LOST_TO_FOLLOW_UP: 'Se perdió',
  READMITTED: 'Volvió',
};

/**
 * El nombre formal de cada estado, para el tooltip. Así la etiqueta visible
 * puede ser simple sin que se pierda el término que figura en un informe.
 */
export const TRANSITION_STATE_FORMAL_LABELS: Record<TransitionState, string> = {
  PENDING: 'Pendiente',
  IN_PREPARATION: 'En preparación',
  REFERRED_TO_POST: 'Derivado a la posta',
  APPOINTMENT_IN_PROCESS: 'Cita en gestión',
  APPOINTMENT_GRANTED: 'Cita otorgada',
  FIRST_CARE_DONE: 'Primera atención realizada',
  LOST_TO_FOLLOW_UP: 'Pérdida de seguimiento',
  READMITTED: 'Reingreso',
};

export const SUMMARY_STATUS_LABELS: Record<ClinicalSummaryStatus, string> = {
  NONE: 'Sin hacer',
  DRAFT: 'Borrador',
  // "Firmado" y no "Aprobado": firmar es el acto concreto que hace el médico.
  APPROVED: 'Firmado',
};

/**
 * La historia clínica de transferencia se puede crear desde **3 meses
 * antes** de cumplir 18. Antes de eso el paciente existe pero todavía no
 * entra al proceso. La firma es otra ventana, mucho más corta: 1 día antes
 * del cumpleaños (ver SIGN_MONTHS_BEFORE_18 en clinical-summary.rules.ts).
 */
export const ENABLED_MONTHS_BEFORE_18 = 3;

/**
 * A partir de aquí se considera que la posta se está demorando y el aviso del
 * especialista tiene sentido. Antes de eso, déjala trabajar.
 */
export const POST_DELAY_DAYS = 10;

/**
 * En tutela = **todavía no cumplió 18**. Es la definición de la lista del
 * especialista de pediatría: su responsabilidad es el tramo previo al
 * cumpleaños. En cuanto los cumple, el paciente ya no está bajo su tutela y
 * pasa al panel de seguimiento post-transición — por eso el tablero nunca
 * muestra a alguien de 18 años o más.
 */
export function isInTutelage(patient: Patient): boolean {
  return patient.monthsToEighteen > 0;
}

/** Ya cruzó: su seguimiento lo mide el panel post-transición. */
export function hasTurnedEighteen(patient: Patient): boolean {
  return patient.monthsToEighteen <= 0;
}

export function isTransitionEnabled(patient: Patient): boolean {
  return patient.monthsToEighteen <= ENABLED_MONTHS_BEFORE_18;
}

/** Estados en los que el paciente todavía está del lado de pediatría. */
export function isActiveInPediatrics(patient: Patient): boolean {
  return patient.state === 'PENDING' || patient.state === 'IN_PREPARATION';
}

/**
 * El caso ya está en la posta y todavía no hay cita. Quién le insiste a la
 * posta no es el especialista sino el área de Referencias (ver
 * referral.rules.ts); esto marca el tramo en que el caso está del otro lado.
 */
export function isWaitingOnHealthPost(patient: Patient): boolean {
  return (
    patient.state === 'REFERRED_TO_POST' ||
    patient.state === 'APPOINTMENT_IN_PROCESS'
  );
}

/** La posta se está tomando más tiempo del razonable con el caso. */
export function isHealthPostDelayed(patient: Patient): boolean {
  return (
    isWaitingOnHealthPost(patient) &&
    (patient.daysWaitingOnPost ?? 0) > POST_DELAY_DAYS
  );
}

/** Ya está habilitado, todavía no cumplió 18 y no tiene resumen aprobado. */
export function needsApprovedSummary(patient: Patient): boolean {
  return (
    isTransitionEnabled(patient) &&
    patient.monthsToEighteen > 0 &&
    patient.summaryStatus !== 'APPROVED'
  );
}

/**
 * Si el paciente que ya cumplió 18 está siguiendo su tratamiento, dicho para
 * la columna del panel de seguimiento. Sale del estado del recorrido: la
 * primera atención hecha ES seguir el tratamiento; perderse es abandonarlo.
 */
export interface TreatmentStatus {
  label: string;
  tone: 'ok' | 'warn' | 'crit';
}

export function treatmentStatus(patient: Patient): TreatmentStatus {
  switch (patient.state) {
    case 'FIRST_CARE_DONE':
      return { label: 'Sigue su tratamiento', tone: 'ok' };
    case 'READMITTED':
      return { label: 'Retomó el tratamiento', tone: 'warn' };
    case 'LOST_TO_FOLLOW_UP':
      return { label: 'Abandonó el tratamiento', tone: 'crit' };
    default:
      // Cumplió 18 y todavía no llegó a su primera cita de adultos.
      return { label: 'Aún sin primera atención', tone: 'warn' };
  }
}

/**
 * La cita del otro lado, contada como la pregunta que trae el médico:
 * ¿asistió?, ¿se la reprogramaron?, ¿o todavía nadie la confirmó?
 * Sale del estado del recorrido, así que el panel y la ficha no pueden
 * decir cosas distintas.
 */
export type FollowUpAppointmentKind =
  'ATTENDED' | 'RESCHEDULED' | 'MISSED' | 'UNCONFIRMED';

export interface FollowUpAppointment {
  kind: FollowUpAppointmentKind;
  label: string;
  tone: 'ok' | 'warn' | 'crit';
}

export function followUpAppointment(patient: Patient): FollowUpAppointment {
  switch (patient.state) {
    case 'FIRST_CARE_DONE':
      return { kind: 'ATTENDED', label: 'Asistió a su cita', tone: 'ok' };
    case 'READMITTED':
      return {
        kind: 'RESCHEDULED',
        label: 'Cita reprogramada',
        tone: 'warn',
      };
    case 'LOST_TO_FOLLOW_UP':
      return {
        kind: 'MISSED',
        label: 'No asistió · sin reprogramar',
        tone: 'crit',
      };
    default:
      return {
        kind: 'UNCONFIRMED',
        label: 'Cita aún sin confirmar',
        tone: 'warn',
      };
  }
}

/**
 * El orden del panel de seguimiento: primero lo que necesita a alguien
 * (abandonos), después los trámites a medias, al final lo que va bien. Vive
 * aquí y no en la tabla porque se aplica ANTES de paginar — si ordenara cada
 * página por su cuenta, los abandonos quedarían repartidos en vez de
 * primeros.
 */
export function followUpWeight(patient: Patient): number {
  const { tone } = treatmentStatus(patient);
  if (tone === 'crit') return 0;
  if (tone === 'warn') return 1;
  return 2;
}

export type Urgency = 'crit' | 'warn' | null;

export interface TimeToEighteen {
  /** "3 meses", "este mes", "5 meses". */
  text: string;
  /** "faltan", "cumple 18", "cumplió 18 hace" — según de qué lado del cumpleaños esté. */
  prefix: string;
  urgency: Urgency;
  /** false cuando ya cumplió 18: la UI lo muestra apagado, no como cuenta regresiva. */
  isCountdown: boolean;
}

function months(n: number): string {
  return `${n} ${n === 1 ? 'mes' : 'meses'}`;
}

export function timeToEighteen(patient: Patient): TimeToEighteen {
  const m = patient.monthsToEighteen;
  if (m > 0) {
    return {
      text: months(m),
      prefix: 'faltan',
      urgency: m <= 1 ? 'crit' : m <= 3 ? 'warn' : null,
      isCountdown: true,
    };
  }
  if (m === 0) {
    // isCountdown en false: ya no es una cuenta regresiva de meses, así que
    // el diseño lo muestra como "cumple 18 este mes" y no como un número.
    return {
      text: 'este mes',
      prefix: 'cumple 18',
      urgency: 'crit',
      isCountdown: false,
    };
  }
  return {
    text: months(Math.abs(m)),
    prefix: 'cumplió 18 hace',
    urgency: null,
    isCountdown: false,
  };
}

/**
 * Urgencia de la fila: el filete de color de la izquierda. No es lo mismo
 * que el tiempo restante — a un paciente ya derivado no le urge el
 * cumpleaños, le urge que la posta gestione la cita.
 */
export function rowUrgency(patient: Patient): Urgency {
  if (isActiveInPediatrics(patient)) {
    if (patient.monthsToEighteen <= 1) return 'crit';
    if (patient.monthsToEighteen <= 3) return 'warn';
  }
  if (patient.state === 'LOST_TO_FOLLOW_UP') return 'crit';
  if (isHealthPostDelayed(patient)) return 'warn';
  return null;
}

/**
 * Dónde está el caso ahora mismo, en una línea: la posta que lo tiene, el
 * hospital que le dio cita, o nada si todavía no salió de pediatría. Es lo
 * que el especialista necesita saber para actuar.
 */
export function currentDestination(patient: Patient): string | null {
  if (patient.appointment) {
    return patient.appointment.hospital;
  }
  if (patient.hospitalReferral) {
    return patient.hospitalReferral.hospital;
  }
  // La posta que le toca se sabe desde el domicilio, pero el caso recién está
  // del otro lado cuando el área le avisó: mostrarla antes diría que el
  // paciente ya salió del INSN cuando todavía nadie lo movió.
  return isActiveInPediatrics(patient)
    ? null
    : (patient.healthPost?.name ?? null);
}
