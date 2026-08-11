import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AuthService } from '../../application/services/auth.service';
import { authRepository } from '../../infrastructure/repositories/auth.repository';
import { tokenStorage } from '../../infrastructure/storage/token-storage';
import { SESSION_EXPIRED_EVENT } from '../../infrastructure/http/api-client';
import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';
import { AuthContext } from './auth-context';

/**
 * Composition root: acá es donde se "inyectan" las implementaciones
 * concretas (HttpAuthRepository, LocalStorageTokenStorage) en el
 * servicio de application — el único lugar de todo el front que conoce
 * ambos lados. Un DI container sería sobre-diseño para esta escala.
 */
const authService = new AuthService(authRepository, tokenStorage);

export function AuthProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authService.getCurrentUser().then((current) => {
      if (!cancelled) {
        setUser(current);
        setIsLoading(false);
      }
    });

    // Si un 401 llega en cualquier request (sesión revocada/expirada/
    // usuario desactivado del lado de iCode-back), reflejarlo acá sin
    // esperar a la próxima navegación.
    const handleSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  const login = useCallback(async (userName: string, password: string) => {
    const profile = await authService.login(userName, password);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
