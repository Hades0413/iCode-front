/**
 * Igual que AuthRepositoryPort: "application" no sabe si el token vive en
 * localStorage, sessionStorage o memoria — solo pide guardarlo/leerlo/
 * borrarlo. La implementación concreta vive en infrastructure/storage.
 */
export interface TokenStoragePort {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
}
