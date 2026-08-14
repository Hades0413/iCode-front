import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';
import {
  PERMISSIONS,
  hasPermission,
  type PermissionCode,
} from '../../domain/rules/permissions';

/**
 * Qué pantallas ve cada usuario.
 *
 * En el hospital hay dos oficinas trabajando sobre los mismos pacientes: el
 * **especialista de pediatría**, que prepara y firma la historia clínica, y el
 * **área de Referencias y Contrarreferencias**, que habla con la posta. Cada
 * una entra a lo suyo, y el riel se arma con lo que el usuario puede ver.
 *
 * El permiso es el mismo que exige el endpoint detrás de cada pantalla, así
 * que esto no "da acceso": evita ofrecer una sección que el servidor va a
 * contestar con 403 (OWASP A01 — esconder no es autorizar).
 */
export type WorkspaceKey = 'clinic' | 'referrals' | 'journey';

export interface WorkspaceSection {
  key: string;
  label: string;
  to: string;
  permission: PermissionCode;
  workspace: WorkspaceKey;
}

export const WORKSPACE_LABELS: Record<WorkspaceKey, string> = {
  clinic: 'Consultorio',
  referrals: 'Referencias',
  journey: 'Mi recorrido',
};

export const WORKSPACE_SECTIONS: readonly WorkspaceSection[] = [
  {
    key: 'pacientes',
    label: 'Pacientes',
    to: '/pacientes',
    permission: PERMISSIONS.patientsCohortRead,
    workspace: 'clinic',
  },
  {
    key: 'seguimiento',
    label: 'Ya cumplieron 18',
    to: '/seguimiento',
    permission: PERMISSIONS.reportsRead,
    workspace: 'clinic',
  },
  {
    key: 'avisos',
    label: 'Por avisar a la posta',
    to: '/referencias',
    permission: PERMISSIONS.referralsRead,
    workspace: 'referrals',
  },
  {
    // El paciente y quien lo acompaña no entran al hospital: tienen su propia
    // app, y esta entrada existe para que el ingreso sepa a dónde mandarlos.
    key: 'mi-recorrido',
    label: 'Mi recorrido',
    to: '/mi-recorrido',
    permission: PERMISSIONS.journeyRead,
    workspace: 'journey',
  },
  {
    key: 'contrarreferencias',
    label: 'Contrarreferencias',
    to: '/contrarreferencias',
    permission: PERMISSIONS.referralsRead,
    workspace: 'referrals',
  },
];

export function visibleSections(
  user: AuthenticatedUser | null,
): WorkspaceSection[] {
  return WORKSPACE_SECTIONS.filter((section) =>
    hasPermission(user, section.permission),
  );
}

/**
 * La oficina de este usuario, para mostrarla al lado de su nombre. Sale de
 * sus permisos —los mismos que arman el riel—, así que con un usuario real
 * del hospital dice lo mismo que con uno de la demo. null si no tiene
 * ninguna sección (o todavía no cargó la sesión).
 */
export function workspaceLabel(user: AuthenticatedUser | null): string | null {
  const workspace = visibleSections(user).at(0)?.workspace;
  return workspace ? WORKSPACE_LABELS[workspace] : null;
}

/**
 * A dónde entra este usuario. No es siempre `/pacientes`: quien trabaja en
 * referencias tiene que caer en su bandeja, no en una pantalla que no le toca.
 *
 * "Pase de consulta" (`/consulta`) no es una `WorkspaceSection` más: no es
 * una cohorte propia con su tablero, es una sola acción (resolver un código),
 * así que no compite por el primer lugar del riel — solo es el destino de
 * alguien que tiene `PATIENT_READ` puntual pero ninguna cohorte que ver
 * (ej. el médico del hospital de adultos, sin `PATIENT_COHORT_READ`).
 */
export function landingRoute(user: AuthenticatedUser | null): string {
  const section = visibleSections(user).at(0);
  if (section) {
    return section.to;
  }
  return hasPermission(user, PERMISSIONS.patientsRead)
    ? '/consulta'
    : '/pacientes';
}
