import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { BridgeGlyph, ExitIcon } from '../components/icons';
import { useAuth } from '../hooks/use-auth';
import '../styles/journey.css';

/**
 * El marco del "pase de consulta": la pantalla del médico del hospital de
 * adultos que atiende a alguien que recién cruzó, sin más contexto que el
 * código que esa persona le muestra.
 *
 * Mismo encabezado fino que "Mi recorrido" (`JourneyLayout`) y el mismo
 * acento índigo (`data-role="adu"`) — es la misma mitad del puente, el lado
 * de adultos — pero es su propio marco: este médico no tiene una cohorte
 * (no tiene `PATIENT_COHORT_READ`), así que no entra al escritorio con riel
 * de `ClinicLayout`.
 */
export function ConsultationLayout() {
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
            <span className="jn-brand-sub">· pase de consulta</span>
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
