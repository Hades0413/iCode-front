import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';
import type { AuthRepositoryPort } from '../ports/auth-repository.port';

/**
 * Orquesta login/logout/perfil — no sabe si "authRepository" pega contra
 * iCode-back por axios o por fetch (recibe el puerto por constructor,
 * como un service de Nest recibiendo su repositorio inyectado). Eso
 * permite testear esta clase con un fake, sin levantar nada de verdad.
 *
 * No guarda el token en ningún lado: iCode-back lo pone en una cookie
 * httpOnly (ver `SESSION_COOKIE_NAME` en el backend) que el navegador
 * maneja solo — enviarla en cada request, no dejarla leer por JS. Antes
 * vivía en localStorage; ese token era legible por cualquier script que
 * lograra correr en la página (XSS). Ver infrastructure/http/api-client.ts
 * (withCredentials) y auth.repository.ts.
 */
export class AuthService {
  private readonly authRepository: AuthRepositoryPort;

  constructor(authRepository: AuthRepositoryPort) {
    this.authRepository = authRepository;
  }

  async login(userName: string, password: string): Promise<AuthenticatedUser> {
    await this.authRepository.login({ userName, password });
    return this.authRepository.getProfile();
  }

  async logout(): Promise<void> {
    await this.authRepository.logout();
  }

  /**
   * Se llama al arrancar la app: ¿hay una sesión válida ya guardada? Sin
   * un token propio que consultar, la única forma de saberlo es
   * preguntarle al servidor — un 401 (nadie logueado, o cookie vencida)
   * es un camino esperado, no un error que haya que loguear.
   */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    try {
      return await this.authRepository.getProfile();
    } catch {
      return null;
    }
  }
}
