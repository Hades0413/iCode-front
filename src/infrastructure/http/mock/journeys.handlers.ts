import type { JourneyViewerRole } from '../../../domain/entities/journey.entity';
import { PERMISSIONS } from '../../../domain/rules/permissions';
import { requirePermission } from './mock-guards';
import { mockError, type MockHandler, type MockRoute } from './mock-http';
import {
  addMessage,
  dismissMessage,
  generateConsultationCode,
  journeyFor,
  reportAppointment,
  setChecklistItem,
  setGuardianAccess,
} from './journeys.data';
import type { MockUserRow } from './mock-database';

/**
 * La app del paciente y de quien lo acompaña.
 *
 * Ningún endpoint recibe un id de paciente: el recorrido sale de **la
 * sesión**. Quién es cada uno lo decide el permiso que trae su usuario —
 * CHECKLIST_WRITE es del dueño de la información, GUARDIAN_REMIND es de quien
 * acompaña—, así que un tutor no puede marcarle el checklist a nadie ni
 * cambiando el request: no tiene con qué.
 */

/** Del permiso sale el rol: uno marca su propia lista, el otro recuerda. */
function roleOf(user: MockUserRow): JourneyViewerRole {
  return user.permissions.includes(PERMISSIONS.checklistWrite)
    ? 'OWNER'
    : 'GUARDIAN';
}

/** GET /journey — el recorrido, o el aviso de acceso revocado. */
const get: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.journeyRead);
  if ('error' in auth) {
    return auth.error;
  }
  return { status: 200, data: journeyFor(roleOf(auth.user)) };
};

/**
 * PATCH /journey/checklist/:itemId — marcar o desmarcar un ítem.
 *
 * Pide CHECKLIST_WRITE, que solo tiene el paciente. No es una formalidad: si
 * el padre pudiera tachar ítems, la lista dejaría de decir lo que el chico
 * sabe hacer y pasaría a decir lo que el padre cree que sabe.
 */
const tick: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.checklistWrite);
  if ('error' in auth) {
    return auth.error;
  }

  const done = (request.body as { done?: unknown } | null)?.done;
  if (typeof done !== 'boolean') {
    return mockError(400, 'Falta indicar si el ítem queda hecho o no.');
  }
  if (!setChecklistItem(request.params.itemId, done)) {
    return mockError(404, 'Ese ítem no existe en tu preparación.');
  }

  return { status: 200, data: journeyFor('OWNER') };
};

/** POST /journey/reminders — el recordatorio de quien acompaña. */
const remind: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.guardianRemind);
  if ('error' in auth) {
    return auth.error;
  }

  const text = (request.body as { text?: unknown } | null)?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    return mockError(400, 'Escribe algo para que le llegue.');
  }
  if (text.length > 240) {
    return mockError(400, 'El mensaje no puede pasar de 240 caracteres.');
  }

  // El acceso revocado también corta esto: si el paciente lo sacó, no puede
  // seguir mandándole mensajes por la app.
  const access = journeyFor('GUARDIAN');
  if (access.access === 'REVOKED') {
    return mockError(409, 'Ya no tienes acceso a este recorrido.');
  }

  // Se firma con el parentesco y no con el nombre: al paciente le llega "tu
  // madre te escribió", que es como lo diría él.
  addMessage(text.trim(), `tu ${access.viewer.relationship}`);
  return { status: 201, data: journeyFor('GUARDIAN') };
};

/** PUT /journey/guardian-access — el paciente da o quita el acceso. */
const access: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.guardianAccessManage);
  if ('error' in auth) {
    return auth.error;
  }

  const hasAccess = (request.body as { hasAccess?: unknown } | null)?.hasAccess;
  if (typeof hasAccess !== 'boolean') {
    return mockError(400, 'Falta indicar si le das o le quitas el acceso.');
  }

  setGuardianAccess(hasAccess);
  return { status: 200, data: journeyFor('OWNER') };
};

/** DELETE /journey/messages/:messageId — el paciente descarta un mensaje. */
const dismiss: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.journeyRead);
  if ('error' in auth) {
    return auth.error;
  }
  if (roleOf(auth.user) !== 'OWNER') {
    return mockError(403, 'Solo el paciente descarta sus mensajes.');
  }

  dismissMessage(request.params.messageId);
  return { status: 200, data: journeyFor('OWNER') };
};

/** PUT /journey/appointment — el paciente registra una cita que consiguió por su cuenta. */
const reportAppointmentHandler: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.appointmentSelfReport);
  if ('error' in auth) {
    return auth.error;
  }

  const body = request.body as
    | { hospital?: unknown; date?: unknown; time?: unknown; doctor?: unknown }
    | null;
  if (
    typeof body?.hospital !== 'string' ||
    typeof body?.date !== 'string' ||
    typeof body?.time !== 'string' ||
    typeof body?.doctor !== 'string'
  ) {
    return mockError(400, 'Completa el hospital, la fecha, la hora y el doctor.');
  }

  const saved = reportAppointment({
    hospital: body.hospital,
    date: body.date,
    time: body.time,
    doctor: body.doctor,
  });
  if (!saved) {
    return mockError(409, 'Ya tienes una cita registrada.');
  }
  return { status: 200, data: journeyFor('OWNER') };
};

/** POST /journey/consultation-code — genera (o regenera) el código único de consulta. */
const generateCode: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.consultationCodeManage);
  if ('error' in auth) {
    return auth.error;
  }

  generateConsultationCode();
  return { status: 201, data: journeyFor('OWNER') };
};

export const journeyRoutes: readonly MockRoute[] = [
  { method: 'GET', path: '/journey', handler: get },
  { method: 'PATCH', path: '/journey/checklist/:itemId', handler: tick },
  { method: 'POST', path: '/journey/reminders', handler: remind },
  { method: 'PUT', path: '/journey/guardian-access', handler: access },
  { method: 'DELETE', path: '/journey/messages/:messageId', handler: dismiss },
  {
    method: 'PUT',
    path: '/journey/appointment',
    handler: reportAppointmentHandler,
  },
  {
    method: 'POST',
    path: '/journey/consultation-code',
    handler: generateCode,
  },
];
