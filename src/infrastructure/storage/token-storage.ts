import type { TokenStoragePort } from '../../application/ports/token-storage.port';

const STORAGE_KEY = 'icode.accessToken';

/**
 * localStorage, no una cookie httpOnly: iCode-back expone el token en el
 * body de POST /auth/login (no lo setea como cookie), así que guardarlo
 * en un lugar que el JS del cliente pueda leer es la única opción sin
 * tocar el backend. Tradeoff consciente para un prototipo de hackatón —
 * en un despliegue real conviene que el backend setee una cookie
 * httpOnly+Secure para no exponer el token a un XSS.
 */
class LocalStorageTokenStorage implements TokenStoragePort {
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const tokenStorage = new LocalStorageTokenStorage();
