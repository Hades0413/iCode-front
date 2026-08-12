import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authService } from '../../composition-root';
import { SESSION_EXPIRED_EVENT } from '../../infrastructure/http/api-client';
import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.entity';
import { AuthContext } from './auth-context';

/**
 * Estado de sesión para React. El servicio ya viene armado desde el
 * composition root (src/composition-root.ts): este archivo solo se ocupa
 * de reflejarlo en el árbol de componentes.
 *
 * Aquí no hay nada de "modo prototipo": al arrancar solo se pregunta si hay
 * una sesión guardada. Que el formulario de ingreso venga con los datos
 * puestos y no exija nada es asunto de la pantalla de login, no de la
 * sesión — así este archivo se comporta igual con el backend real.
 */
export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
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
    // usuario desactivado del lado de iCode-back), reflejarlo aquí sin
    // esperar a la próxima navegación.
    const handleSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  // Devuelve el perfil además de guardarlo: quien hace login necesita saber
  // a qué pantalla mandar a este usuario, y esperar al próximo render del
  // contexto para leerlo sería adivinar cuándo llegó.
  const login = useCallback(async (userName: string, password: string) => {
    const profile = await authService.login(userName, password);
    setUser(profile);
    return profile;
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
