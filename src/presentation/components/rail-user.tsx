import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExitIcon } from './icons';
import { useAuth } from '../hooks/use-auth';
import { workspaceLabel } from '../routes/workspace-sections';

/**
 * Quién está adentro, abajo de todo en el riel: nombre, oficina y la salida.
 *
 * Acá **no se cambia de usuario**. Cambiar de perfil es volver a entrar: se
 * cierra la sesión y se elige en el ingreso. Un selector dentro de la app
 * daría la idea de que un mismo usuario puede ponerse el sombrero de otra
 * oficina, y no es así — cada uno entra con lo suyo y el servidor le da los
 * permisos que le corresponden.
 *
 * La oficina que se muestra sale de los permisos de la sesión, no de una
 * lista de perfiles de demo: con un usuario real del hospital dice lo mismo.
 */
export function RailUser() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '—';

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="rail-who">
      <span className="rail-avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="who-txt">
        <div className="nm">
          {user ? `${user.firstName} ${user.lastName}` : '—'}
        </div>
        <div className="rl">{workspaceLabel(user) ?? user?.userName}</div>
      </div>
      {/* Salir cuesta un click: del otro lado está el ingreso, que es donde se
          elige con qué perfil entrar. */}
      <button
        type="button"
        className="rail-out"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        title="Salir y entrar con otro perfil"
        aria-label="Cerrar sesión"
      >
        <ExitIcon />
      </button>
    </div>
  );
}
