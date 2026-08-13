import type { LoginRequest } from '../../../application/dto/login.dto';
import type { LoginResponse } from '../../../application/dto/login-response.dto';
import {
  authenticate,
  createSession,
  revokeSession,
  toUserProfile,
} from './mock-database';
import { readSessionToken, requireSession } from './mock-guards';
import { setMockSessionCookie, clearMockSessionCookie } from './mock-cookies';
import { mockError, type MockHandler, type MockRoute } from './mock-http';

const login: MockHandler = (request) => {
  const credentials = request.body as Partial<LoginRequest> | null;
  const userName = credentials?.userName?.trim();
  const password = credentials?.password;

  // Equivalente al ValidationPipe de Nest sobre LoginDto.
  if (!userName || !password) {
    return mockError(400, 'userName y password son obligatorios.');
  }

  const user = authenticate(userName, password);
  if (!user) {
    // Un solo mensaje para "no existe", "password incorrecto" y "usuario
    // desactivado": no le decimos al cliente cuál de los tres fue.
    return mockError(401, 'Usuario o contraseña inválidos.');
  }

  const session = createSession(user.id);
  // Simula lo que hace iCode-back con res.cookie(SESSION_COOKIE_NAME, ...):
  // sin esto, el GET /auth/me que AuthService.login() dispara justo
  // después no tiene de dónde sacar la sesión (el front ya no guarda el
  // token en ningún lado, ver api-client.ts).
  setMockSessionCookie(session.token, session.expiresAt);
  const body: LoginResponse = {
    accessToken: session.token,
    tokenType: 'Bearer',
    expiresAt: session.expiresAt,
  };
  return { status: 200, data: body };
};

const logout: MockHandler = (request) => {
  // Sin authenticated(): un logout con token ya inválido no es un error
  // para el cliente, la sesión igual queda cerrada (idempotente).
  const token = readSessionToken(request);
  if (token) {
    revokeSession(token);
  }
  clearMockSessionCookie();
  return { status: 204 };
};

const getProfile: MockHandler = (request) => {
  const auth = requireSession(request);
  if ('error' in auth) {
    return auth.error;
  }
  return { status: 200, data: toUserProfile(auth.user) };
};

export const authRoutes: readonly MockRoute[] = [
  { method: 'POST', path: '/auth/login', handler: login },
  { method: 'POST', path: '/auth/logout', handler: logout },
  { method: 'GET', path: '/auth/me', handler: getProfile },
];
