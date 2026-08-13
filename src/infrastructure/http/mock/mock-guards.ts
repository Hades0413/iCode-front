import {
  findActiveUserById,
  findValidSession,
  revokeSession,
  type MockUserRow,
} from './mock-database';
import { readMockSessionCookie } from './mock-cookies';
import { mockError, type MockRequest, type MockResponse } from './mock-http';

/**
 * Guards del backend simulado, compartidos por todos los handlers.
 *
 * Son funciones que reciben el request y devuelven "el usuario" o "la
 * respuesta de error", en lugar de decoradores que envuelven al handler.
 * Es a propósito: un `const handler = authenticated(...)` es una llamada en
 * el tope del módulo, y eso cuenta como efecto secundario para el bundler —
 * con esa forma, rolldown no puede tirar la carpeta mock/ del build de
 * producción y los usuarios de prueba (con sus passwords) terminan dentro
 * del bundle. Así el módulo no ejecuta nada al cargarse y desaparece limpio
 * cuando la flag está apagada.
 */

/** "Authorization: Bearer <token>" -> "<token>". */
export function readBearerToken(authorization: string | null): string | null {
  const [scheme, token] = (authorization ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * El token puede llegar por header Authorization (así probás el mock con
 * curl/Postman sin cookies) o por la cookie simulada que pone
 * auth.handlers.ts en el login — mismo orden de prioridad que
 * SessionAuthGuard en iCode-back. En el navegador, con api-client.ts
 * actual, siempre va a ser la cookie: nada arma el header desde que
 * AuthService dejó de guardar el token.
 */
export function readSessionToken(request: MockRequest): string | null {
  return readBearerToken(request.authorization) ?? readMockSessionCookie();
}

/** O el usuario de la sesión, o el error que hay que devolver. */
export type GuardResult = { user: MockUserRow } | { error: MockResponse };

/**
 * Espejo de SessionAuthGuard en iCode-back: valida el token opaco y contesta
 * 401 si la sesión no existe, venció, fue revocada por un logout, o el
 * usuario quedó desactivado. Ese 401 es el que dispara
 * icode:session-expired en api-client, así que este guard es lo que hace
 * que ese camino se pueda probar sin backend.
 */
export function requireSession(request: MockRequest): GuardResult {
  const token = readSessionToken(request);
  const session = token ? findValidSession(token) : null;
  if (!session) {
    return { error: mockError(401, 'Sesión inválida o expirada.') };
  }

  const user = findActiveUserById(session.userId);
  if (!user) {
    revokeSession(session.token);
    return { error: mockError(401, 'Sesión inválida o expirada.') };
  }

  return { user };
}

/**
 * Sesión válida Y con el permiso pedido. La diferencia importa: 401 es "no
 * sé quién eres", 403 es "sé quién eres y no te toca". Que el permiso se
 * valide aquí (del lado del servidor) y no escondiendo botones es el punto
 * del README sobre OWASP A01.
 */
export function requirePermission(
  request: MockRequest,
  permission: string,
): GuardResult {
  const result = requireSession(request);
  if ('error' in result) {
    return result;
  }
  if (!result.user.permissions.includes(permission)) {
    return { error: mockError(403, `No tienes el permiso ${permission}.`) };
  }
  return result;
}
