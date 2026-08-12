import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { BridgeGlyph, ExitIcon } from '../components/icons';
import { useAuth } from '../hooks/use-auth';
import '../styles/journey.css';

/**
 * El marco de la app del paciente y de quien lo acompaña.
 *
 * No es el escritorio clínico con su riel: es **una columna**, pensada para
 * un celular sostenido con una mano. El encabezado es fino y queda pegado
 * arriba —dice de quién es el recorrido y poco más— y todo lo demás es
 * contenido que se desplaza.
 *
 * El acento es índigo (`data-role="adu"`) y no teal: esta es la vista del
 * lado de adultos del puente, que es a donde el paciente está yendo.
 */
export function JourneyLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleLogout() {
    setIsLeaving(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <div className="p18 jn" data-role="adu">
      <header className="jn-head">
        <div className="jn-head-in">
          <span className="jn-brand">
            <span className="jn-glyph" aria-hidden="true">
              <BridgeGlyph />
            </span>
            Puente 18+
          </span>

          <span className="jn-user">
            {user ? `${user.firstName} ${user.lastName}` : ''}
          </span>

          <button
            type="button"
            className="jn-out"
            onClick={() => void handleLogout()}
            disabled={isLeaving}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <ExitIcon />
          </button>
        </div>
      </header>

      <main className="jn-main">
        <Outlet />
      </main>
    </div>
  );
}
