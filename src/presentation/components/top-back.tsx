import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronIcon } from './icons';
import { useAuth } from '../hooks/use-auth';
import { landingRoute } from '../routes/workspace-sections';

/**
 * El "volver" global de la barra superior. Siempre hay uno, y a dónde lleva
 * depende de dónde estés parado:
 *
 * - En una pantalla interior, deshace el último paso (o va al inicio del rol
 *   si llegaste por un enlace directo — nunca te saca de la app por error).
 * - En la pantalla de inicio del rol ya no hay "atrás" dentro de la app, así
 *   que el botón dice la verdad: **vuelve al ingreso**, cerrando la sesión.
 *   Es el mismo camino que eligió el producto para cambiar de perfil — se
 *   elige quién eres en la puerta, no adentro.
 */
export function TopBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isLeaving, setIsLeaving] = useState(false);

  const landing = landingRoute(user);
  const isHome = location.pathname === landing;

  async function goToLogin() {
    setIsLeaving(true);
    try {
      // Con sesión viva, /login redirige de vuelta al inicio del rol: para
      // volver a la puerta hay que cerrarla de verdad.
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLeaving(false);
    }
  }

  function goBack() {
    // React Router guarda el índice del historial: si hay pasos propios se
    // deshace el último; si no, a la pantalla de inicio del rol.
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (index > 0) {
      navigate(-1);
    } else {
      navigate(landing);
    }
  }

  if (isHome) {
    return (
      <button
        type="button"
        className="topback"
        disabled={isLeaving}
        onClick={() => void goToLogin()}
        title="Cierra tu sesión y vuelve a elegir perfil"
      >
        <span className="topback-i">
          <ChevronIcon />
        </span>
        {isLeaving ? 'Saliendo…' : 'Volver al ingreso'}
      </button>
    );
  }

  return (
    <button type="button" className="topback" onClick={goBack}>
      <span className="topback-i">
        <ChevronIcon />
      </span>
      Volver
    </button>
  );
}
