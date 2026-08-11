/**
 * Espejo de LoginResponseDto en iCode-back. "accessToken" es un token
 * opaco (no JWT) — se guarda tal cual, nunca se decodifica en el cliente.
 */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}
