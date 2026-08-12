import type { Patient } from '../../../domain/entities/patient.entity';
import type {
  CounterReferral,
  CounterReferralFormat,
  PostNotice,
  ReferralAlert,
  ReferralAlertReason,
} from '../../../domain/entities/referral.entity';
import { formatShortDate } from '../../../common/utils/format-date';

/**
 * Las "tablas" del área de Referencias y Contrarreferencias en el backend
 * simulado: los avisos que le mandó a la posta, los reclamos que le hizo el
 * especialista, y las cartas de contrarreferencia.
 *
 * Mismo criterio que el resto del mock: se persiste en localStorage porque en
 * el backend real esto vive en la base y un refresh no debería deshacerlo.
 * Para volver al estado inicial de la demo, borra la clave.
 *
 * Del archivo de la carta se guarda **el registro, no el contenido**: nombre,
 * formato, tamaño y quién lo subió. Contra iCode-back esto es un multipart y
 * el PDF termina en el storage del hospital; en el navegador no tiene sentido
 * fingir que guardamos el binario.
 */

/** Lo que el store necesita de un paciente para poder proyectarlo. */
type PatientSeed = Omit<Patient, 'summaryProgress'>;

const STORAGE_KEY = 'icode.mock.referrals';

interface ReferralStore {
  /** Avisos a la posta, por paciente. */
  notices: Record<string, PostNotice[]>;
  /** Reclamos del especialista al área, por paciente. */
  alerts: Record<string, ReferralAlert[]>;
  /** La carta de cada paciente. */
  letters: Record<string, CounterReferral>;
}

const EMPTY: ReferralStore = { notices: {}, alerts: {}, letters: {} };

function read(): ReferralStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as ReferralStore) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(store: ReferralStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function now(): string {
  return new Date().toISOString();
}

/* ============================================================
   Escrituras — una por acto del proceso
   ============================================================ */

/** El aviso del área a la posta: "vayan tramitando la cita". */
export function addPostNotice(patientId: string, sentBy: string): PostNotice {
  const store = read();
  const notice: PostNotice = { sentAt: now(), sentBy };
  store.notices[patientId] = [...(store.notices[patientId] ?? []), notice];
  write(store);
  return notice;
}

/** El reclamo del especialista al área. */
export function addReferralAlert(
  patientId: string,
  reason: ReferralAlertReason,
  sentBy: string,
): ReferralAlert {
  const store = read();
  const alert: ReferralAlert = { sentAt: now(), sentBy, reason };
  store.alerts[patientId] = [...(store.alerts[patientId] ?? []), alert];
  write(store);
  return alert;
}

export interface UploadedFile {
  fileName: string;
  format: CounterReferralFormat;
  fileSize: number;
  code: string | null;
}

/**
 * Sube (o reemplaza) la carta redactada en el sistema externo. Queda en
 * UPLOADED: subirla no es enviarla, y esa diferencia es justamente la que el
 * proceso pide — la carta existe desde el cumpleaños, pero recién sale
 * cuando alguien la manda.
 */
export function uploadCounterReferral(
  patientId: string,
  file: UploadedFile,
  uploadedBy: string,
): CounterReferral {
  const store = read();
  const letter: CounterReferral = {
    patientId,
    status: 'UPLOADED',
    fileName: file.fileName,
    format: file.format,
    fileSize: file.fileSize,
    code: file.code,
    uploadedAt: now(),
    uploadedBy,
    sentAt: null,
    sentBy: null,
  };
  store.letters[patientId] = letter;
  write(store);
  return letter;
}

/**
 * El envío a la posta. Es el único lugar donde una carta pasa a SENT, y
 * también funciona sobre la carta que trae el seed (T.D. nace con la suya
 * lista sin enviar): se materializa en el store al enviarla.
 */
export function sendCounterReferral(
  patient: PatientSeed,
  sentBy: string,
): CounterReferral | null {
  const store = read();
  const letter = store.letters[patient.id] ?? seedLetter(patient);
  if (!letter || letter.status === 'SENT') {
    return null;
  }
  const sent: CounterReferral = {
    ...letter,
    status: 'SENT',
    sentAt: now(),
    sentBy,
  };
  store.letters[patient.id] = sent;
  write(store);
  return sent;
}

/* ============================================================
   Lecturas y proyección sobre la fila del paciente
   ============================================================ */

/** Quién firma las cartas del seed, igual que los avisos. */
const SEED_STAFF = 'Lucía Bermúdez';

/**
 * La carta que el seed da por existente. Los pacientes que nacen con la fila
 * en UPLOADED o SENT tienen que tener SU documento —con nombre, tamaño y
 * fechas— aunque nadie lo haya subido en esta demo: sin esto, un "enviada"
 * mostraba el formulario de subir como si faltara todo.
 */
function seedLetter(patient: PatientSeed): CounterReferral | null {
  if (patient.counterReferralStatus === 'NONE') {
    return null;
  }
  const uploadedAt = patient.referredToPostAt ?? '2026-06-10T09:00';
  const sent = patient.counterReferralStatus === 'SENT';
  return {
    patientId: patient.id,
    status: patient.counterReferralStatus,
    fileName: `contrarreferencia-${patient.initials.replaceAll('.', '')}.pdf`,
    format: 'PDF',
    // Determinista y distinto por paciente: la demo no sortea nada.
    fileSize: 180_000 + (Number(patient.dni) % 90_000),
    code: `CR-2026-0${patient.dni.slice(-4)}`,
    uploadedAt,
    uploadedBy: SEED_STAFF,
    sentAt: sent ? (patient.hospitalReferral?.referredAt ?? uploadedAt) : null,
    sentBy: sent ? SEED_STAFF : null,
  };
}

/** La carta del paciente: la subida en esta demo, o la que trae el seed. */
export function counterReferralFor(
  patient: PatientSeed,
): CounterReferral | null {
  return read().letters[patient.id] ?? seedLetter(patient);
}

export function postNoticesFor(patient: PatientSeed): PostNotice[] {
  return [...patient.postNotices, ...(read().notices[patient.id] ?? [])];
}

/**
 * Lo que haría el backend al armar la fila: los avisos del seed más los de
 * esta demo, los reclamos, y el estado de la carta —que sale del documento y
 * no se guarda suelto, para que la lista no pueda decir "enviada" mientras la
 * carta no existe.
 *
 * También recalcula el estado y los días en la posta: el aviso del área es lo
 * que pone el caso del otro lado, así que mandarlo tiene que moverlo en el
 * tablero de todos.
 */
export function applyReferrals(patient: PatientSeed): PatientSeed {
  const store = read();
  const notices = postNoticesFor(patient);
  const letter = store.letters[patient.id] ?? null;
  const firstNotice = notices.at(0)?.sentAt ?? null;

  return {
    ...patient,
    postNotices: notices,
    referralAlerts: [
      ...patient.referralAlerts,
      ...(store.alerts[patient.id] ?? []),
    ],
    counterReferralStatus: letter?.status ?? patient.counterReferralStatus,
    // Un caso con aviso está en la posta, aunque el seed lo tuviera antes.
    state:
      notices.length > 0 &&
      (patient.state === 'PENDING' || patient.state === 'IN_PREPARATION')
        ? 'REFERRED_TO_POST'
        : patient.state,
    healthPost: patient.healthPost,
    referredToPostAt: patient.referredToPostAt ?? firstNotice,
    daysWaitingOnPost:
      patient.daysWaitingOnPost ??
      (firstNotice === null ? null : daysSince(firstNotice)),
  };
}

const DAY = 24 * 60 * 60 * 1000;

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY));
}

/** Lo último que hizo el área con este caso, para la columna "Lo último". */
export function referralAction(
  patientId: string,
): { at: string; text: string } | null {
  const store = read();
  const letter = store.letters[patientId] ?? null;
  const notice = store.notices[patientId]?.at(-1) ?? null;
  const alert = store.alerts[patientId]?.at(-1) ?? null;

  const candidates: { at: string; text: string }[] = [];
  if (letter?.sentAt) {
    candidates.push({
      at: letter.sentAt,
      text: `Contrarreferencia enviada a la posta · ${formatShortDate(letter.sentAt)}`,
    });
  } else if (letter) {
    candidates.push({
      at: letter.uploadedAt,
      text: `Carta de contrarreferencia subida · ${formatShortDate(letter.uploadedAt)}`,
    });
  }
  if (notice) {
    candidates.push({
      at: notice.sentAt,
      text: `Aviso del área a la posta · ${formatShortDate(notice.sentAt)}`,
    });
  }
  if (alert) {
    candidates.push({
      at: alert.sentAt,
      text: `Reclamo al área de referencias · ${formatShortDate(alert.sentAt)}`,
    });
  }

  return (
    candidates.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).at(0) ?? null
  );
}
