import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';
import type { AuthRepositoryPort } from '../ports/auth-repository.port';
import type { TokenStoragePort } from '../ports/token-storage.port';

/**
 * Orquesta login/logout/perfil — no sabe si "authRepository" pega contra
 * iCode-back por axios o por fetch, ni si "tokenStorage" guarda en
 * localStorage o memoria (recibe ambos por constructor, como un service
 * de Nest recibiendo sus repositorios inyectados). Eso permite testear
 * esta clase con fakes, sin levantar nada de verdad.
 */
export class AuthService {
  private readonly authRepository: AuthRepositoryPort;
  private readonly tokenStorage: TokenStoragePort;

  constructor(
    authRepository: AuthRepositoryPort,
    tokenStorage: TokenStoragePort,
  ) {
    this.authRepository = authRepository;
    this.tokenStorage = tokenStorage;
  }

  async login(userName: string, password: string): Promise<AuthenticatedUser> {
    const { accessToken } = await this.authRepository.login({
      userName,
      password,
    });
    this.tokenStorage.setToken(accessToken);

    try {
      return await this.authRepository.getProfile();
    } catch (error) {
      // Si el login dio token pero /auth/me falla, no dejamos un token
      // "huérfano" guardado.
      this.tokenStorage.clearToken();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authRepository.logout();
    } finally {
      // Se borra el token localmente pase lo que pase con la llamada a
      // /auth/logout — no tiene sentido dejar al usuario "atascado"
      // logueado en el cliente si el request de logout falla por red.
      this.tokenStorage.clearToken();
    }
  }

  /** Se llama al arrancar la app: ¿hay una sesión válida ya guardada? */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    if (!this.tokenStorage.getToken()) {
      return null;
    }
    try {
      return await this.authRepository.getProfile();
    } catch {
      this.tokenStorage.clearToken();
      return null;
    }
  }
}
