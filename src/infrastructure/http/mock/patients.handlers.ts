import { PERMISSIONS } from '../../../domain/rules/permissions';
import { requirePermission } from './mock-guards';
import { type MockHandler, type MockRoute } from './mock-http';
import type { Patient } from '../../../domain/entities/patient.entity';
import { listInTutelage, listPostTransition } from './patients.data';
import type { MockUserRow } from './mock-database';

/**
 * El recorte por especialidad, del lado del servidor. Un médico solo ve a los
 * pacientes de su servicio: si esto fuera un filtro de la UI, cualquiera con
 * la sesión de un cardiólogo podría pedir la lista completa a mano.
 */
function visibleTo(user: MockUserRow, patients: Patient[]): Patient[] {
  return user.specialty
    ? patients.filter((patient) => patient.specialty === user.specialty)
    : patients;
}

/**
 * GET /patients/in-tutelage — la cohorte del especialista: los que todavía
 * no cumplieron 18.
 *
 * Que sean dos endpoints y no uno con un filtro es a propósito: son dos
 * responsabilidades distintas del hospital, con permisos distintos
 * (seguimiento pide REPORTS_READ) y con números que significan otra cosa. El
 * tablero no puede mostrar a alguien de 18 años ni por error.
 */
const listTutelage: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.patientsRead);
  if ('error' in auth) {
    return auth.error;
  }
  return { status: 200, data: visibleTo(auth.user, listInTutelage()) };
};

/** GET /patients/post-transition — los que ya cruzaron. */
const listFollowUp: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.reportsRead);
  if ('error' in auth) {
    return auth.error;
  }
  return { status: 200, data: visibleTo(auth.user, listPostTransition()) };
};

/**
 * Las rutas literales van primero: el resolver del adapter matchea en orden,
 * así que "/patients/in-tutelage" tiene que ganarle a cualquier patrón con
 * param que pudiera confundirlo con un id.
 */
export const patientRoutes: readonly MockRoute[] = [
  { method: 'GET', path: '/patients/in-tutelage', handler: listTutelage },
  { method: 'GET', path: '/patients/post-transition', handler: listFollowUp },
];
