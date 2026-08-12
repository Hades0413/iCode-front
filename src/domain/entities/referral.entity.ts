/**
 * El tramo que maneja el **área de Referencias y Contrarreferencias** del INSN
 * San Borja: la oficina que habla con la posta. Ni el especialista ni el
 * paciente lo hacen — ese es justamente el punto.
 *
 * Dos actos, separados por el cumpleaños:
 *
 *   2 meses antes de los 18        el día que cumple 18
 *   ─────────────────────────      ──────────────────────────────
 *   AVISO a la posta               CARTA de contrarreferencia
 *   "vayan tramitando la cita"     (PDF/Word) que devuelve el caso
 *   (solo aviso: la cita se        a la posta. No puede salir antes:
 *    pide recién a los 18)         antes de los 18 el paciente
 *                                  todavía es del hospital de niños.
 *
 * El especialista no puede hacer ninguno de los dos, pero sí **ve si se
 * hicieron** y puede reclamarle al área cuando no (ver ReferralAlert). Esa es
 * la única forma de que un caso no se quede quieto porque nadie miró.
 *
 * Capa pura: sin React, sin axios y sin nada de presentación.
 */

/** Un aviso del área a la posta para que vaya tramitando la cita. */
export interface PostNotice {
  /** ISO 8601. */
  sentAt: string;
  /** Quién lo mandó, del área. */
  sentBy: string;
}

/** Qué le está faltando al área. Es lo que el especialista le reclama. */
export type ReferralAlertReason =
  'POST_NOTICE' | 'COUNTER_REFERRAL' | 'RESCHEDULE';

/** El reclamo del especialista al área de referencias. */
export interface ReferralAlert {
  /** ISO 8601. */
  sentAt: string;
  /** El médico que reclamó. */
  sentBy: string;
  reason: ReferralAlertReason;
}

/**
 * En qué anda la carta de contrarreferencia de un paciente. Viaja en la fila
 * para que la lista no tenga que bajarse el documento de cada uno.
 */
export type CounterReferralStatus = 'NONE' | 'UPLOADED' | 'SENT';

/** Los formatos que acepta el área — la carta se redacta afuera. */
export type CounterReferralFormat = 'PDF' | 'WORD';

/**
 * La carta que devuelve el paciente a la posta.
 *
 * El archivo se redacta en el sistema externo de contrarreferencias y se sube
 * aquí; por eso el documento guarda el nombre y el formato del archivo, no su
 * contenido. Lo que esta app agrega es el registro de **quién** lo subió,
 * **cuándo**, y sobre todo **cuándo salió a la posta** — que es el dato que
 * después nadie puede reconstruir.
 */
export interface CounterReferral {
  patientId: string;
  status: Exclude<CounterReferralStatus, 'NONE'>;
  /** "contrarreferencia-AQ.pdf". */
  fileName: string;
  format: CounterReferralFormat;
  /** Tamaño en bytes, para poder mostrarlo. */
  fileSize: number;
  /** Número de carta del sistema externo, si lo trae. */
  code: string | null;
  /** ISO 8601. */
  uploadedAt: string;
  uploadedBy: string;
  /** Cuándo salió a la posta. null = todavía no se envió. */
  sentAt: string | null;
  sentBy: string | null;
}
