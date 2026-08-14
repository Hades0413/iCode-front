import type {
  Appointment,
  HealthPost,
  TransitionState,
} from './patient.entity';

/**
 * El recorrido visto **desde adentro**: lo que el propio paciente (y su
 * padre, madre o tutor) ven en su app.
 *
 * Es otra entidad y no el `Patient` del tablero a propósito. El especialista
 * ve una cohorte y necesita comparar; el paciente ve una sola cosa —la suya—
 * y necesita entenderla: su diagnóstico en castellano llano, sus remedios con
 * para qué son, su cita con la hora a la que tiene que llegar. Compartir un
 * solo tipo entre las dos pantallas terminaría en un objeto que no le sirve
 * bien a ninguna.
 *
 * Capa pura: sin React, sin axios, sin nada de presentación.
 */

/** Un ítem de la preparación del paciente. Solo él puede marcarlos. */
export interface JourneyChecklistItem {
  id: string;
  title: string;
  /** El detalle concreto: "Calcio + vitamina D3, 1 al día con el almuerzo". */
  detail: string;
  /**
   * La misma tarea dicha en dos palabras, para armar "te falta ___".
   * Ej.: "aprenderte tus dosis".
   */
  pendingLabel: string;
  done: boolean;
}

export interface JourneyMedication {
  /** Inicial que se muestra en el círculo, ej. "C". */
  initial: string;
  name: string;
  /** "500 mg · 1 vez al día, con el almuerzo". */
  dose: string;
  /** Para qué sirve y cómo tomarlo, en lenguaje de persona. */
  purpose: string;
}

export interface JourneyAllergy {
  substance: string;
  /** Qué pasó y cuándo: es lo que hay que poder decir en una emergencia. */
  detail: string;
}

/** Un teléfono o dato de contacto del equipo que lo sigue atendiendo. */
export interface JourneyContact {
  role: string;
  name: string;
  detail: string;
}

/** Una pregunta de la guía práctica del hospital de adultos. */
export interface JourneyGuideEntry {
  question: string;
  answer: string;
}

/** Quién está mirando: el propio paciente o quien lo acompaña. */
export type JourneyViewerRole = 'OWNER' | 'GUARDIAN';

export interface JourneyViewer {
  role: JourneyViewerRole;
  /** Cómo se llama a sí mismo el que mira: "Tú" / "madre". */
  relationship: string;
  /** Solo el dueño de la información marca su checklist. */
  canEditChecklist: boolean;
  /** Solo quien acompaña puede mandar recordatorios. */
  canSendReminder: boolean;
  /** Solo el dueño decide quién ve su información. */
  canManageGuardianAccess: boolean;
  /** Solo el dueño registra una cita que consiguió por su cuenta. */
  canReportAppointment: boolean;
  /** Solo el dueño genera su código único de consulta. */
  canManageConsultationCode: boolean;
}

/** Lo que el paciente escribe cuando consiguió su cita por su cuenta. */
export interface AppointmentReport {
  hospital: string;
  /** "YYYY-MM-DD". */
  date: string;
  /** "HH:mm". */
  time: string;
  doctor: string;
}

/** Un mensaje que el tutor le mandó y el paciente todavía no descartó. */
export interface JourneyMessage {
  id: string;
  text: string;
  /** ISO 8601. */
  sentAt: string;
  /** "tu madre" — quién lo mandó, como se lo dice al paciente. */
  from: string;
}

export interface JourneyGuardian {
  firstName: string;
  /** "madre", "padre", "tutora"… — sale del dato, no de un hardcodeo. */
  relationship: string;
  /** false = el paciente le quitó el acceso. */
  hasAccess: boolean;
}

export interface TransitionJourney {
  /** Iniciales: la app tampoco muestra el nombre completo. */
  initials: string;
  age: string;
  state: TransitionState;
  /** El diagnóstico como lo escribiría un médico. */
  diagnosis: string;
  /** El mismo diagnóstico explicado para el que lo tiene. */
  diagnosisPlain: string;
  /** Qué hay que seguir vigilando y cada cuánto. */
  followUp: string;
  medications: JourneyMedication[];
  allergies: JourneyAllergy[];
  contacts: JourneyContact[];
  checklist: JourneyChecklistItem[];
  guide: JourneyGuideEntry[];
  /** La posta que gestiona su cita. null antes de la derivación. */
  healthPost: HealthPost | null;
  /** La cita que consiguió la posta. null mientras no haya fecha. */
  appointment: Appointment | null;
  /** Dirección del hospital de la cita, para el pase. */
  appointmentAddress: string | null;
  /** Cuántos minutos antes tiene que estar ahí. */
  arriveMinutesEarly: number;
  /** Dónde presentarse al llegar. */
  admissionNote: string | null;
  /** El resumen clínico de 2 hojas: si está firmado, viaja con él. */
  summaryApproved: boolean;
  /** Quién armó el resumen y sigue disponible para dudas. */
  attendingDoctor: string;
  specialty: string;
  /** null si no tiene ningún tutor activo (ej. ya cumplió 18 y el suyo quedó desactivado). */
  guardian: JourneyGuardian | null;
  /** Mensaje pendiente del tutor, si hay. */
  pendingMessage: JourneyMessage | null;
  /** El código único de consulta. null hasta que el paciente lo genera, o si el que tenía ya venció. */
  consultationCode: string | null;
  /** ISO 8601 — cuándo vence "consultationCode" (dura 15 minutos). Null si consultationCode es null. */
  consultationCodeExpiresAt: string | null;
}

/**
 * Lo que devuelve el endpoint del recorrido.
 *
 * Es una unión discriminada porque "el paciente te quitó el acceso" es un
 * estado legítimo del recurso de quien acompaña, no un error: por eso viaja
 * como 200 y no como 403. Un 403 obligaría a la UI a adivinar, desde un
 * error, que tiene que mostrar una pantalla amable en lugar de un fallo — y
 * esa pantalla es justamente lo que el diseño pide.
 */
export type JourneyAccess =
  | { access: 'GRANTED'; viewer: JourneyViewer; journey: TransitionJourney }
  | {
      access: 'REVOKED';
      viewer: JourneyViewer;
      /** Lo único que se sigue diciendo: de quién se trata. */
      subjectInitials: string;
    };
