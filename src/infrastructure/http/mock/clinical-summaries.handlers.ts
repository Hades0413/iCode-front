import type { ClinicalSummarySection } from '../../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../../domain/entities/patient.entity';
import {
  canApproveSummary,
  canGenerateSummary,
  canRegenerateSummary,
  canReviewSummary,
  signBlockedReason,
  summaryBlockedReason,
} from '../../../domain/rules/clinical-summary.rules';
import { PERMISSIONS } from '../../../domain/rules/permissions';
import {
  approveSummary,
  discardSummaryDraft,
  generateSummary,
  saveSummaryDraft,
  summaryFor,
} from './clinical-summaries.data';
import { requirePermission } from './mock-guards';
import { mockError, type MockHandler, type MockRoute } from './mock-http';
import { findPatient } from './patients.data';

/**
 * La historia clínica de transferencia: generarla con IA, corregirla y
 * firmarla.
 *
 * Los tres verbos de escritura piden PATIENTS_WRITE y validan el estado del
 * caso, igual que haría iCode-back. Que la UI esconda el botón no alcanza:
 * firmar un documento clínico es exactamente la clase de acción donde la
 * autorización tiene que estar del lado del servidor (OWASP A01).
 */

/**
 * Un médico solo toca historias de SU especialidad. Se valida aquí y no solo
 * recortando la lista: sin esto, bastaría conocer el id de un paciente ajeno
 * para generarle o firmarle el documento.
 */
function outsideSpecialty(
  user: { specialty?: string | null },
  specialty: string,
): boolean {
  return Boolean(user.specialty) && user.specialty !== specialty;
}

/** Tope por bloque, como lo tendría un DTO con class-validator. */
const MAX_SECTION_LENGTH = 4000;

/**
 * La generación tarda más que un GET: un modelo escribiendo 2 hojas no
 * contesta en 350 ms. Sin esta espera, el estado "generando" no se ve nunca y
 * queda sin probar justo la pantalla que más lo necesita.
 */
const GENERATION_MS = 1400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** El paciente ya rehidratado después de escribir el documento. */
function reload(patientId: string): Patient | null {
  return findPatient(patientId);
}

/** GET /patients/:patientId/clinical-summary */
const get: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.patientsRead);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }

  const summary = summaryFor(patient);
  if (!summary) {
    // 404 y no un 200 con null: el recurso todavía no existe. El repositorio
    // lo traduce a null, que es lo que la pantalla necesita saber.
    return mockError(
      404,
      'Este paciente todavía no tiene historia clínica de transferencia.',
    );
  }

  return { status: 200, data: summary };
};

/**
 * POST /patients/:patientId/clinical-summary — el borrador con IA.
 *
 * Sirve para generar por primera vez y para volver a generar, pero solo
 * mientras nadie lo haya editado: pisar el texto que escribió un médico con
 * una tirada nueva del modelo sería perder trabajo sin avisar.
 */
const generate: MockHandler = async (request) => {
  const auth = requirePermission(request, PERMISSIONS.patientsWrite);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  if (outsideSpecialty(auth.user, patient.specialty)) {
    return mockError(403, 'Ese paciente no es de tu especialidad.');
  }

  const current = summaryFor(patient);
  const allowed = current
    ? canRegenerateSummary(patient, current)
    : canGenerateSummary(patient);
  if (!allowed) {
    return mockError(
      409,
      summaryBlockedReason(patient) ??
        (current?.status === 'APPROVED'
          ? 'Esta historia clínica ya está firmada: no se vuelve a generar.'
          : 'El borrador tiene correcciones hechas a mano: volver a generarlo las perdería.'),
    );
  }

  await delay(GENERATION_MS);
  const summary = generateSummary(patient);
  const updated = reload(patient.id);
  if (!updated) {
    return mockError(404, 'Ese paciente no existe.');
  }

  return { status: 201, data: { patient: updated, summary } };
};

/** Lo único que el cliente puede cambiar: el texto de cada bloque. */
function readSections(body: unknown): ClinicalSummarySection[] | null {
  if (typeof body !== 'object' || body === null || !('sections' in body)) {
    return null;
  }
  const { sections } = body as { sections: unknown };
  if (!Array.isArray(sections)) {
    return null;
  }

  const parsed: ClinicalSummarySection[] = [];
  for (const section of sections) {
    if (typeof section !== 'object' || section === null) {
      return null;
    }
    const { id, body: text } = section as Partial<ClinicalSummarySection>;
    if (typeof id !== 'string' || typeof text !== 'string') {
      return null;
    }
    if (text.length > MAX_SECTION_LENGTH) {
      return null;
    }
    parsed.push({ id, title: '', hint: '', body: text });
  }
  return parsed;
}

/** PUT /patients/:patientId/clinical-summary — las correcciones del médico. */
const saveDraft: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.patientsWrite);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  if (outsideSpecialty(auth.user, patient.specialty)) {
    return mockError(403, 'Ese paciente no es de tu especialidad.');
  }
  if (!canReviewSummary(patient)) {
    return mockError(
      409,
      patient.summaryStatus === 'APPROVED'
        ? 'La historia clínica ya está firmada: no se edita.'
        : 'Todavía no hay un borrador que editar.',
    );
  }

  const sections = readSections(request.body);
  if (!sections) {
    return mockError(
      400,
      `Cada bloque necesita "id" y "body" de texto, de hasta ${MAX_SECTION_LENGTH} caracteres.`,
    );
  }

  const summary = saveSummaryDraft(
    patient,
    sections,
    `${auth.user.firstName} ${auth.user.lastName}`,
  );
  const updated = reload(patient.id);
  if (!summary || !updated) {
    return mockError(409, 'No se pudo guardar el borrador.');
  }

  return { status: 200, data: { patient: updated, summary } };
};

/**
 * POST /patients/:patientId/clinical-summary/approval — la firma.
 *
 * Es un sub-recurso propio y no un PATCH del estado porque firmar es un acto
 * con autor y fecha: el que queda registrado es el usuario de la sesión, no
 * uno que venga en el body.
 */
const approve: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.patientsWrite);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  if (outsideSpecialty(auth.user, patient.specialty)) {
    return mockError(403, 'Ese paciente no es de tu especialidad.');
  }
  // La regla del calendario también vive en el servidor: firmar antes de
  // tiempo congelaría un documento que todavía puede tener que cambiar.
  if (!canApproveSummary(patient)) {
    return mockError(
      409,
      signBlockedReason(patient) ??
        (patient.summaryStatus === 'APPROVED'
          ? 'Esta historia clínica ya está firmada.'
          : 'No hay borrador para firmar: primero hay que generarlo.'),
    );
  }

  const summary = approveSummary(
    patient,
    `${auth.user.firstName} ${auth.user.lastName}`,
  );
  const updated = reload(patient.id);
  if (!summary || !updated) {
    return mockError(409, 'No se pudo firmar la historia clínica.');
  }

  return { status: 201, data: { patient: updated, summary } };
};

/**
 * DELETE /patients/:patientId/clinical-summary — descartar el borrador.
 *
 * Sub-recurso propio en el sentido inverso a la firma: en vez de agregar un
 * estado, borra el documento entero y vuelve a NONE. Igual que
 * generar/plantilla/subir, nunca sobre uno ya firmado.
 */
const discard: MockHandler = (request) => {
  const auth = requirePermission(request, PERMISSIONS.patientsWrite);
  if ('error' in auth) {
    return auth.error;
  }

  const patient = findPatient(request.params.patientId);
  if (!patient) {
    return mockError(404, 'Ese paciente no existe.');
  }
  if (outsideSpecialty(auth.user, patient.specialty)) {
    return mockError(403, 'Ese paciente no es de tu especialidad.');
  }
  if (!canReviewSummary(patient)) {
    return mockError(
      409,
      patient.summaryStatus === 'APPROVED'
        ? 'La historia clínica ya está firmada: no se puede descartar.'
        : 'Todavía no hay un borrador que descartar.',
    );
  }

  discardSummaryDraft(patient);
  const updated = reload(patient.id);
  if (!updated) {
    return mockError(404, 'Ese paciente no existe.');
  }

  return { status: 200, data: { patient: updated } };
};

export const clinicalSummaryRoutes: readonly MockRoute[] = [
  {
    method: 'GET',
    path: '/patients/:patientId/clinical-summary',
    handler: get,
  },
  {
    method: 'POST',
    path: '/patients/:patientId/clinical-summary',
    handler: generate,
  },
  {
    method: 'PUT',
    path: '/patients/:patientId/clinical-summary',
    handler: saveDraft,
  },
  {
    method: 'POST',
    path: '/patients/:patientId/clinical-summary/approval',
    handler: approve,
  },
  {
    method: 'DELETE',
    path: '/patients/:patientId/clinical-summary',
    handler: discard,
  },
];
