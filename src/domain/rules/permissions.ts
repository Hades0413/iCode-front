import type { AuthenticatedUser } from '../entities/authenticated-user.entity';

/**
 * Catálogo de permisos de Puente 18+. Está en domain porque es vocabulario
 * del negocio, no del transporte: lo usan igual el backend simulado (para
 * contestar 403) y la UI (para no ofrecer una acción que va a fallar).
 *
 * TODO(back): sincronizar con el seed real de iCode-back cuando esté
 * disponible — los códigos son plausibles pero inventados.
 */
export const PERMISSIONS = {
  /* --- el especialista de pediatría --- */
  /** Ver la cohorte de pacientes en tutela. */
  patientsRead: 'PATIENTS_READ',
  /** Editar la ficha, generar y aprobar el resumen clínico. */
  patientsWrite: 'PATIENTS_WRITE',
  /** Ver el panel de seguimiento post-transición. */
  reportsRead: 'REPORTS_READ',
  /**
   * Reclamarle al área de Referencias que no hizo lo suyo. Es lo único que
   * el médico puede hacer sobre ese tramo: él no habla con la posta.
   */
  referralAreaNotify: 'REFERRAL_AREA_NOTIFY',

  /* --- el área de Referencias y Contrarreferencias --- */
  /** Ver las bandejas del área (por avisar y por contrarreferir). */
  referralsRead: 'REFERRALS_READ',
  /** Mandarle el aviso a la posta, 2 meses antes de los 18. */
  healthPostNotify: 'HEALTH_POST_NOTIFY',
  /** Subir la carta de contrarreferencia y enviarla a la posta. */
  counterReferralManage: 'COUNTER_REFERRAL_MANAGE',

  /* --- el paciente y quien lo acompaña --- */
  /** Ver el propio recorrido (o el de quien acompaña). */
  journeyRead: 'JOURNEY_READ',
  /** Marcar ítems del checklist de preparación. Solo el dueño de la info. */
  checklistWrite: 'CHECKLIST_WRITE',
  /** Mandarle un recordatorio al paciente. Solo quien acompaña. */
  guardianRemind: 'GUARDIAN_REMIND',
  /** Dar y quitar el acceso del tutor. Solo el dueño de la info. */
  guardianAccessManage: 'GUARDIAN_ACCESS_MANAGE',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Esconder un botón NO es autorización — la decide siempre el servidor
 * (OWASP A01). Esto sirve para lo otro: no ofrecerle a alguien una acción
 * que sabemos que le van a rechazar.
 */
export function hasPermission(
  user: AuthenticatedUser | null,
  permission: PermissionCode,
): boolean {
  return user?.permissions.includes(permission) ?? false;
}
