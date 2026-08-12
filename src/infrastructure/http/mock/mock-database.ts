import type { AuthenticatedUser } from '../../../domain/entities/authenticated-user.entity';
import { PERMISSIONS } from '../../../domain/rules/permissions';

/**
 * La "base de datos" del backend simulado: usuarios fijos (el equivalente
 * al seed de iCode-back) y sesiones creadas en runtime.
 *
 * Regla importante: "password" e "isActive" viven SOLO aquí adentro, igual
 * que columnas de la tabla users — nunca salen en una respuesta (ver
 * toUserProfile). Así el front no puede leer nada que el backend real no
 * le daría, y el día que se enchufe iCode-back no aparece ninguna sorpresa.
 */

export interface MockUserRow {
  id: number;
  userName: string;
  /** En texto plano solo porque este servidor es de mentira; iCode-back guarda un hash. */
  password: string;
  email: string | null;
  firstName: string;
  lastName: string;
  /** Un usuario desactivado no puede loguearse y sus sesiones dejan de valer. */
  isActive: boolean;
  permissions: string[];
  /**
   * La especialidad del médico, si es médico. Es la que recorta su cohorte:
   * un especialista solo ve pacientes de su servicio. null = sin recorte
   * (el área de referencias y la coordinación ven a todos).
   */
  specialty?: string | null;
}

export interface MockSession {
  token: string;
  userId: number;
  expiresAt: string;
}

/**
 * El seed de usuarios. Los códigos de permiso salen del catálogo de dominio
 * (domain/rules/permissions.ts) — el mismo que consulta la UI para no
 * ofrecer acciones que el servidor va a rechazar.
 *
 * El único dato tomado del README de iCode-back es "admin / Passw0rd1!".
 */
const USERS: readonly MockUserRow[] = [
  {
    id: 1,
    userName: 'admin',
    password: 'Passw0rd1!',
    email: 'admin@puente18.pe',
    firstName: 'Ada',
    lastName: 'Ramírez',
    isActive: true,
    // El de la demo: entra a las dos mitades del hospital.
    permissions: [
      PERMISSIONS.patientsRead,
      PERMISSIONS.patientsWrite,
      PERMISSIONS.reportsRead,
      PERMISSIONS.referralAreaNotify,
      PERMISSIONS.referralsRead,
      PERMISSIONS.healthPostNotify,
      PERMISSIONS.counterReferralManage,
    ],
  },
  {
    id: 5,
    userName: 'medico',
    password: 'Passw0rd1!',
    email: 'medico@puente18.pe',
    firstName: 'Álvaro',
    lastName: 'Solís',
    isActive: true,
    // El especialista: prepara y firma la historia clínica, y puede
    // reclamarle al área. No habla con la posta — eso no es suyo. Solo ve
    // pacientes de SU especialidad: el recorte lo hace el servidor.
    permissions: [
      PERMISSIONS.patientsRead,
      PERMISSIONS.patientsWrite,
      PERMISSIONS.reportsRead,
      PERMISSIONS.referralAreaNotify,
    ],
    specialty: 'Oncología pediátrica',
  },
  {
    id: 6,
    userName: 'referencias',
    password: 'Passw0rd1!',
    email: 'referencias@puente18.pe',
    firstName: 'Lucía',
    lastName: 'Bermúdez',
    isActive: true,
    // El área de Referencias y Contrarreferencias: avisa a la posta y manda
    // la carta. Ve los pacientes, pero no toca la historia clínica.
    permissions: [
      PERMISSIONS.patientsRead,
      PERMISSIONS.referralsRead,
      PERMISSIONS.healthPostNotify,
      PERMISSIONS.counterReferralManage,
    ],
  },
  {
    id: 2,
    userName: 'operador',
    password: 'Passw0rd1!',
    email: 'operador@puente18.pe',
    firstName: 'Beto',
    lastName: 'Quispe',
    isActive: true,
    // Ve el tablero pero no puede firmar ni reclamarle al área: sirve para
    // comprobar que las acciones no aparecen sin permiso (y que el servidor
    // igual las rechazaría con 403).
    permissions: [PERMISSIONS.patientsRead, PERMISSIONS.reportsRead],
  },
  {
    id: 7,
    userName: 'paciente',
    password: 'Passw0rd1!',
    email: null,
    firstName: 'T.',
    lastName: 'D.',
    isActive: true,
    // El dueño de la información: ve su recorrido, marca su preparación y
    // decide quién puede verlo. No entra a ninguna pantalla del hospital.
    permissions: [
      PERMISSIONS.journeyRead,
      PERMISSIONS.checklistWrite,
      PERMISSIONS.guardianAccessManage,
    ],
  },
  {
    id: 8,
    userName: 'tutor',
    password: 'Passw0rd1!',
    email: 'rosa@example.pe',
    firstName: 'Rosa',
    lastName: 'Delgado',
    isActive: true,
    // Quien acompaña: ve lo mismo mientras el paciente le dé acceso, y lo
    // único que puede hacer es recordarle. No marca su checklist.
    permissions: [PERMISSIONS.journeyRead, PERMISSIONS.guardianRemind],
  },
  {
    id: 3,
    userName: 'sinpermisos',
    password: 'Passw0rd1!',
    email: null,
    firstName: 'Carla',
    lastName: 'Núñez',
    isActive: true,
    // Loguea bien pero el servidor le niega la cohorte con un 403: sirve
    // para ver que la pantalla maneja "sin permiso" sin romperse.
    permissions: [],
  },
  {
    id: 4,
    userName: 'inactivo',
    password: 'Passw0rd1!',
    email: 'inactivo@puente18.pe',
    firstName: 'Dante',
    lastName: 'Flores',
    isActive: false,
    permissions: [PERMISSIONS.patientsRead],
  },
];

const SESSIONS_STORAGE_KEY = 'icode.mock.sessions';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Las sesiones se persisten en localStorage porque en el backend real
 * viven en la base: si las guardáramos en una variable de módulo, cada
 * refresh o hot-reload te desloguearía y el front parecería roto por algo
 * que nunca pasaría contra iCode-back. Esta clave es la "tabla sessions"
 * del servidor falso, no estado de la app — el token del usuario lo sigue
 * guardando infrastructure/storage/token-storage.ts, aparte.
 */
function readSessions(): Record<string, MockSession> {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MockSession>) : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, MockSession>): void {
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}

/** Token opaco, como el de iCode-back: aleatorio y sin nada codificado adentro. */
function generateOpaqueToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/**
 * Devuelve el usuario solo si existe, el password coincide Y está activo.
 * Un único "null" para los tres casos a propósito: el handler contesta el
 * mismo 401 sin revelar cuál falló (user enumeration).
 */
export function authenticate(
  userName: string,
  password: string,
): MockUserRow | null {
  const user = USERS.find(
    (candidate) => candidate.userName.toLowerCase() === userName.toLowerCase(),
  );
  if (!user || user.password !== password || !user.isActive) {
    return null;
  }
  return user;
}

export function findActiveUserById(id: number): MockUserRow | null {
  return USERS.find((user) => user.id === id && user.isActive) ?? null;
}

export function createSession(userId: number): MockSession {
  const session: MockSession = {
    token: generateOpaqueToken(),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  const sessions = readSessions();
  sessions[session.token] = session;
  writeSessions(sessions);
  return session;
}

/** null si el token no existe o ya venció (y en ese caso la borra, como haría el server). */
export function findValidSession(token: string): MockSession | null {
  const sessions = readSessions();
  const session = sessions[token];
  if (!session) {
    return null;
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    revokeSession(token);
    return null;
  }
  return session;
}

export function revokeSession(token: string): void {
  const sessions = readSessions();
  if (sessions[token]) {
    delete sessions[token];
    writeSessions(sessions);
  }
}

/** Proyección de una fila a lo que expone GET /auth/me — sin password ni isActive. */
export function toUserProfile(user: MockUserRow): AuthenticatedUser {
  return {
    id: user.id,
    userName: user.userName,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    permissions: [...user.permissions],
  };
}
