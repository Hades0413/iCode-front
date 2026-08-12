import type {
  CounterReferralFormat,
  ReferralAlertReason,
} from '../../../domain/entities/referral.entity';
import { PERMISSIONS } from '../../../domain/rules/permissions';
import {
  canNotifyHealthPost,
  canSendCounterReferral,
  canUploadCounterReferral,
  counterReferralBlockedReason,
  isInNoticeWindow,
  pendingReferralAction,
} from '../../../domain/rules/referral.rules';
import { hasTurnedEighteen } from '../../../domain/rules/transition.rules';
import { requirePermission } from './mock-guards';
import { mockError, type MockHandler, type MockRoute } from './mock-http';
import {
  findPatient,
  listInTutelage,
  listPostTransition,
} from './patients.data';
import {
  addPostNotice,
  addReferralAlert,
  counterReferralFor,
  sendCounterReferral,
  uploadCounterReferral,
} from './referrals.data';

/**
 * El área de Referencias y Contrarreferencias: sus dos bandejas y sus tres
 * actos (avisar a la posta, subir la carta, enviarla), más el reclamo que le
 * hace el especialista.
 *
 * Las precondiciones se validan del lado del servidor y no solo escondiendo
 * botones. Una en particular no es una comodidad de la UI sino la regla del
 * proceso: **la carta no puede salir antes de que el paciente cumpla 18**.
 * Si esa validación viviera solo en el front, bastaría un request a mano para
 * devolverle a la posta un paciente que todavía se atiende en el INSN.
 */

/** El tamaño máximo del documento, como lo tendría un pipe de Nest. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** GET /referrals/notice-queue — los que cumplen 18 en 2 meses o menos. */
const noticeQueue: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.referralsRead);
  if ('error' in auth) {
    return auth.error;
  }
  // El corte lo hace el servidor: la bandeja del área es su propia pregunta,
  // no un filtro que el cliente podría aflojar.
  return { status: 200, data: listInTutelage().filter(isInNoticeWindow) };
};

/** GET /referrals/counter-queue — los que ya cumplieron 18. */
const counterQueue: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.referralsRead);
  if ('error' in auth) {
    return auth.error;
  }
  // Se devuelve la carta junto al paciente: la pantalla necesita las dos
  // cosas de todos, y pedirlas de a una sería un request por fila.
  const items = listPostTransition()
    .filter(hasTurnedEighteen)
    .map((patient) => ({
      patient,
      counterReferral: counterReferralFor(patient),
    }));
  return { status: 200, data: items };
};

/**
 * POST /patients/:patientId/post-notices — el aviso a la posta.
 *
 * Es lo ÚNICO que se puede hacer sobre la cita antes de los 18: avisar. La
 * cita la pide la posta cuando el paciente cumple años.
 */
const notifyPost: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.healthPostNotify);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  if (!canNotifyHealthPost(patient)) {
    return mockError(
      409,
      patient.healthPost === null
        ? 'Este paciente todavía no tiene una posta asignada.'
        : 'Todavía no toca avisar: le faltan más de 2 meses para cumplir 18.',
    );
  }

  addPostNotice(patient.id, `${auth.user.firstName} ${auth.user.lastName}`);
  const updated = findPatient(patient.id);
  if (!updated) {
    return mockError(404, 'Ese paciente no existe.');
  }

  return { status: 201, data: updated };
};

/** POST /patients/:patientId/referral-alerts — el reclamo del especialista. */
const alertArea: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.referralAreaNotify);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }

  // La razón se recalcula del estado del caso: si el cliente manda una que no
  // corresponde, el reclamo quedaría diciendo algo falso en el registro.
  const pending = pendingReferralAction(patient);
  if (pending === null) {
    return mockError(409, 'El área ya hizo lo que le tocaba con este caso.');
  }
  const claimed = (request.body as { reason?: ReferralAlertReason } | null)
    ?.reason;
  if (claimed && claimed !== pending) {
    return mockError(409, 'Lo que reclamas no es lo que está faltando.');
  }

  addReferralAlert(
    patient.id,
    pending,
    `${auth.user.firstName} ${auth.user.lastName}`,
  );
  const updated = findPatient(patient.id);
  if (!updated) {
    return mockError(404, 'Ese paciente no existe.');
  }

  return { status: 201, data: updated };
};

/** GET /patients/:patientId/counter-referral */
const getLetter: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.patientsRead);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  const letter = counterReferralFor(patient);
  if (!letter) {
    // Igual que la historia clínica: que no exista todavía es lo normal, y el
    // repositorio lo traduce a null.
    return mockError(404, 'Este paciente todavía no tiene carta.');
  }
  return { status: 200, data: letter };
};

/** Lo que se acepta del multipart: un PDF o un Word, y nada más. */
function readUpload(
  body: unknown,
): { file: File; format: CounterReferralFormat; code: string | null } | string {
  if (!(body instanceof FormData)) {
    return 'Falta el archivo de la carta.';
  }
  const file = body.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return 'Falta el archivo de la carta.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'El archivo pesa más de 10 MB.';
  }

  const name = file.name.toLowerCase();
  const format: CounterReferralFormat | null = name.endsWith('.pdf')
    ? 'PDF'
    : name.endsWith('.doc') || name.endsWith('.docx')
      ? 'WORD'
      : null;
  if (format === null) {
    return 'La carta tiene que ser un PDF o un Word (.pdf, .doc, .docx).';
  }

  const code = body.get('code');
  return { file, format, code: typeof code === 'string' ? code : null };
}

/** POST /patients/:patientId/counter-referral — subir la carta. */
const upload: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.counterReferralManage);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  if (!canUploadCounterReferral(patient)) {
    return mockError(
      409,
      counterReferralBlockedReason(patient) ??
        'No se puede subir la carta de este paciente.',
    );
  }

  const parsed = readUpload(request.body);
  if (typeof parsed === 'string') {
    return mockError(400, parsed);
  }

  const letter = uploadCounterReferral(
    patient.id,
    {
      fileName: parsed.file.name,
      format: parsed.format,
      fileSize: parsed.file.size,
      code: parsed.code,
    },
    `${auth.user.firstName} ${auth.user.lastName}`,
  );
  const updated = findPatient(patient.id);
  if (!updated) {
    return mockError(404, 'Ese paciente no existe.');
  }

  return { status: 201, data: { patient: updated, counterReferral: letter } };
};

/**
 * POST /patients/:patientId/counter-referral/delivery — mandarla a la posta.
 * Aquí vive la regla que no se puede negociar: nunca antes de los 18.
 */
const send: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.counterReferralManage);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  if (!canSendCounterReferral(patient)) {
    return mockError(
      409,
      counterReferralBlockedReason(patient) ??
        'Primero hay que subir la carta.',
    );
  }

  const letter = sendCounterReferral(
    patient,
    `${auth.user.firstName} ${auth.user.lastName}`,
  );
  const updated = findPatient(patient.id);
  if (!letter || !updated) {
    return mockError(409, 'No se pudo enviar la carta.');
  }

  return { status: 201, data: { patient: updated, counterReferral: letter } };
};

export const referralRoutes: readonly MockRoute[] = [
  { method: 'GET', path: '/referrals/notice-queue', handler: noticeQueue },
  { method: 'GET', path: '/referrals/counter-queue', handler: counterQueue },
  {
    method: 'POST',
    path: '/patients/:patientId/post-notices',
    handler: notifyPost,
  },
  {
    method: 'POST',
    path: '/patients/:patientId/referral-alerts',
    handler: alertArea,
  },
  {
    method: 'GET',
    path: '/patients/:patientId/counter-referral',
    handler: getLetter,
  },
  {
    method: 'POST',
    path: '/patients/:patientId/counter-referral',
    handler: upload,
  },
  {
    method: 'POST',
    path: '/patients/:patientId/counter-referral/delivery',
    handler: send,
  },
];
