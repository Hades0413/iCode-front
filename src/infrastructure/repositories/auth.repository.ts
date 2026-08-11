import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';
import type { AuthRepositoryPort } from '../../application/ports/auth-repository.port';
import type { LoginRequest } from '../../application/dto/login.dto';
import type { LoginResponse } from '../../application/dto/login-response.dto';
import { apiClient } from '../http/api-client';

/** Implementación real de AuthRepositoryPort contra la API de iCode-back. */
class HttpAuthRepository implements AuthRepositoryPort {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials,
    );
    return data;
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }

  async getProfile(): Promise<AuthenticatedUser> {
    const { data } = await apiClient.get<AuthenticatedUser>('/auth/me');
    return data;
  }
}

export const authRepository = new HttpAuthRepository();
