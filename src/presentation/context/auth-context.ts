import { createContext } from 'react';
import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';

export interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  /** Devuelve el perfil recién autenticado: sirve para decidir a dónde ir. */
  login: (userName: string, password: string) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
}

/**
 * Separado de auth.context.tsx (donde vive <AuthProvider>) porque
 * react-refresh exige que un archivo que exporta un componente no
 * exporte también otra cosa (aquí, el Context en sí) — ver
 * presentation/hooks/use-auth.ts, el consumidor de esto.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
