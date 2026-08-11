import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';
import type { LoginRequest } from '../dto/login.dto';
import type { LoginResponse } from '../dto/login-response.dto';

/**
 * "application" depende de esta interfaz, no de axios ni de ningún
 * cliente HTTP concreto — "infrastructure" es quien la implementa (ver
 * infrastructure/repositories/auth.repository.ts). Así AuthService se
 * puede testear con un fake que cumpla este contrato, sin red de por
 * medio.
 */
export interface AuthRepositoryPort {
  login(credentials: LoginRequest): Promise<LoginResponse>;
  logout(): Promise<void>;
  getProfile(): Promise<AuthenticatedUser>;
}
