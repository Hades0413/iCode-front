import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/use-auth';

/**
 * Esto es solo UX (ocultar/redirigir en la UI) — igual que dice el
 * README de iCode-back sobre RoleMenu: la autorización de verdad la
 * decide siempre el servidor (OWASP A01), nunca un guard del lado del
 * cliente. Si alguien fuerza la navegación sin sesión, cada request a la
 * API va a fallar con 401 igual.
 */
export function ProtectedRoute({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p>Cargando…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
