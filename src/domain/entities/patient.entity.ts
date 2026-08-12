/**
 * Un paciente en tutela: alguien que todavía se atiende en pediatría pero
 * que va a cumplir 18 años y tiene que cruzar al sistema de adultos.
 *
 * El recorrido tiene TRES actores, no dos:
 *
 *   INSN San Borja  →  posta del distrito  →  hospital de adultos
 *   (pediatría)        (primer nivel)          (donde se atiende)
 *
 * Al cumplir 18, el paciente se deriva a la **posta más cercana a su
 * domicilio**. Esa posta es la que lo deriva al hospital que corresponde y
 * la que gestiona la cita — el especialista de pediatría NO agenda nada, y
 * tampoco habla con la posta: eso lo hace el **área de Referencias y
 * Contrarreferencias** del propio INSN, dos meses antes del cumpleaños (ver
 * referral.entity.ts). Lo único que puede hacer el especialista es mirar si
 * el área lo hizo y reclamarle si no.
 *
 * Capa pura: sin React, sin axios y sin nada de presentación. Los estados
 * viajan como códigos (no como el texto que se muestra) porque es lo que
 * devolvería un enum de la base; las etiquetas en castellano viven en
 * domain/rules/transition.rules.ts.
 */

import type {
  CounterReferralStatus,
  PostNotice,
  ReferralAlert,
} from './referral.entity';

/** Los 5 primeros son el recorrido, en orden. Los 2 últimos son desvíos. */
export type TransitionState =
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'REFERRED_TO_POST'
  | 'APPOINTMENT_IN_PROCESS'
  | 'APPOINTMENT_GRANTED'
  | 'FIRST_CARE_DONE'
  | 'LOST_TO_FOLLOW_UP'
  | 'READMITTED';

/**
 * El resumen clínico de 2 hojas que viaja con el paciente (la "historia
 * clínica de transferencia"). NONE = todavía no se generó, DRAFT = hay un
 * borrador esperando que un médico lo revise, APPROVED = firmado.
 * El documento en sí vive en clinical-summary.entity.ts.
 */
export type ClinicalSummaryStatus = 'NONE' | 'DRAFT' | 'APPROVED';

/**
 * La posta (centro o puesto de salud) que le toca por domicilio. Es el
 * primer nivel de atención: recibe el caso y gestiona la cita en el
 * hospital.
 */
export interface HealthPost {
  id: string;
  /** "C.S. San Juan de Miraflores". */
  name: string;
  district: string;
  /** Distancia al domicilio del paciente, en km — por eso le toca esta y no otra. */
  distanceKm: number;
}

/** La derivación que hace la posta al hospital de adultos. */
export interface HospitalReferral {
  hospital: string;
  specialty: string;
  /** null mientras el hospital no asigne un médico. */
  doctor: string | null;
  /** ISO 8601: cuándo la posta envió la derivación. */
  referredAt: string;
}

export interface Appointment {
  hospital: string;
  specialist: string;
  /** ISO 8601. */
  date: string;
  reason: string;
  /** Qué posta la gestionó — es la que hay que llamar si algo sale mal. */
  managedBy: string;
}

export interface Patient {
  id: string;
  /** Iniciales, no el nombre: la lista es un tablero clínico, no un padrón. */
  initials: string;
  /**
   * El documento del paciente. Es lo que se busca en el tablero: en una
   * cohorte de decenas, el especialista llega con el DNI en la mano (se lo
   * dijo la madre por teléfono, está en la orden), no con las iniciales.
   */
  dni: string;
  medicalRecord: string;
  sex: 'F' | 'M';
  /** Edad ya formateada por el servidor, ej. "17a 11m". */
  age: string;
  /**
   * Meses que le faltan para cumplir 18. Positivo = todavía no los cumplió;
   * 0 o negativo = ya los cumplió (hace ese número de meses). Es el número
   * que ordena todo el tablero, y el que decide si sigue en tutela: en
   * cuanto deja de ser positivo, el paciente sale de la lista del
   * especialista y pasa al panel de seguimiento (ver isInTutelage).
   */
  monthsToEighteen: number;
  /**
   * El día exacto en que cumplió 18 (ISO). Solo viaja para los que ya
   * cruzaron: en tutela alcanza con los meses que faltan, pero del otro lado
   * el panel muestra la fecha — "hace 2 meses" no le sirve a un informe.
   */
  turnedEighteenAt?: string | null;
  diagnosis: string;
  specialty: string;
  attendingDoctor: string;
  /** El distrito donde vive: es lo que decide qué posta le toca. */
  district: string;
  state: TransitionState;
  summaryStatus: ClinicalSummaryStatus;
  /**
   * Cuánto del resumen está armado, 0..1. Lo calcula el servidor a partir
   * del propio documento (cuántos bloques tienen texto), igual que la edad:
   * la lista necesita el número para ordenar y pintar la columna sin
   * bajarse las 2 hojas de cada paciente.
   *
   * Un borrador sin firmar nunca llega a 1 — la firma es lo que falta.
   */
  summaryProgress: number;
  /**
   * La posta que le toca por domicilio. Se sabe desde el día uno —la decide
   * la dirección, no el trámite—, y por eso no es null mientras el caso
   * todavía está en el INSN: el área necesita saber a quién le va a avisar.
   */
  healthPost: HealthPost | null;
  /** ISO 8601: cuándo el área le pasó el caso a la posta (su primer aviso). */
  referredToPostAt: string | null;
  /** Lo que hizo la posta con el caso. null = todavía no lo derivó. */
  hospitalReferral: HospitalReferral | null;
  /** La cita gestionada por la posta — la que ve el paciente en su app. */
  appointment: Appointment | null;
  /** Última acción registrada, ya formateada: "Control ambulatorio · 24 jul". */
  lastAction: string;
  /** Días que la posta lleva con el caso sin cita otorgada. null si no aplica. */
  daysWaitingOnPost: number | null;
  /**
   * Avisos que el área de Referencias le mandó a la posta, del más viejo al
   * más nuevo. El especialista no manda ninguno: mira estos.
   */
  postNotices: PostNotice[];
  /** Reclamos del especialista al área, cuando el aviso o la carta no salieron. */
  referralAlerts: ReferralAlert[];
  /** En qué anda su carta de contrarreferencia (el documento vive aparte). */
  counterReferralStatus: CounterReferralStatus;
  /** Avance del checklist de preparación del propio paciente, 0..1. null si no aplica. */
  checklistProgress: number | null;
}
