/**
 * Simula la cookie httpOnly que pone iCode-back en /auth/login (ver
 * SESSION_COOKIE_NAME en el backend real). El mock intercepta el request
 * ANTES de que exista un viaje de red de verdad (ver mock-adapter.ts), así
 * que no hay un header "Set-Cookie" real que el navegador pueda procesar
 * solo — sin esto, ninguna sesión sobrevive entre un POST /auth/login y el
 * GET /auth/me que dispara AuthService.login() a continuación, porque
 * AuthService ya no guarda el token en ningún lado (viajaría en la cookie
 * real contra iCode-back).
 *
 * document.cookie SÍ persiste entre requests dentro de la misma pestaña,
 * que es exactamente lo que hace falta acá. No es httpOnly — JS no puede
 * poner esa flag desde el cliente — pero no importa: esto nunca corre
 * contra un XSS de verdad, es un servidor de mentira para desarrollo.
 */
const MOCK_SESSION_COOKIE = 'icode_mock_session';

export function setMockSessionCookie(token: string, expiresAt: string): void {
  const expires = new Date(expiresAt).toUTCString();
  document.cookie = `${MOCK_SESSION_COOKIE}=${token}; path=/; expires=${expires}; samesite=lax`;
}

export function clearMockSessionCookie(): void {
  document.cookie = `${MOCK_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function readMockSessionCookie(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${MOCK_SESSION_COOKIE}=`));
  return match ? match.slice(MOCK_SESSION_COOKIE.length + 1) : null;
}
