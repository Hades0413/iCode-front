import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { landingRoute } from './workspace-sections';

/**
 * La raíz manda a cada uno a su trabajo: el especialista a la lista de
 * pacientes, el área de Referencias a su bandeja. Una ruta fija dejaría a la
 * mitad de los usuarios entrando por una pantalla que no les toca — y que el
 * servidor, encima, les contestaría con 403.
 *
 * Mientras la sesión se está resolviendo no se decide nada: redirigir antes
 * de saber quién es mandaría a todos al mismo lado.
 */
export function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={landingRoute(user)} replace />;
}
