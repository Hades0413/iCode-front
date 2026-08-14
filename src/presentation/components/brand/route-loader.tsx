import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewLoader } from './view-loader';

/**
 * El que decide CUÁNDO se ve la cortina de carga: al primer ingreso y cada
 * vez que cambia el pathname (entrar a una vista, no cambiar un filtro:
 * search y hash no cuentan).
 *
 * Los tiempos son fijos y no dependen de si la vista "terminó" de cargar:
 * los datos llegan por sus propios hooks y cada pantalla ya tiene sus
 * estados vacíos. Esta cortina es la transición de marca, y una transición
 * que a veces dura 200ms y a veces 3s se siente rota. Un ciclo del líquido
 * (~1s) + la disolución es suficiente para que se lea el logo sin estorbar.
 *
 * Si el usuario pidió menos movimiento, la cortina apenas se asoma: el
 * respeto a prefers-reduced-motion no es solo quitar keyframes en CSS,
 * también es no retenerlo un segundo mirando una pantalla quieta.
 */
const HOLD_MS = 1050;
const FADE_MS = 460;
const REDUCED_HOLD_MS = 260;

type Phase = 'shown' | 'leaving' | 'hidden';

export function RouteLoader() {
  const { pathname } = useLocation();
  // La primera pintura ya arranca en 'shown': si esperáramos a un efecto,
  // la vista se vería un frame antes que la cortina.
  const [phase, setPhase] = useState<Phase>('shown');
  const [seenPath, setSeenPath] = useState(pathname);
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Cambió la vista: la cortina vuelve a 'shown' en este mismo render, sin
  // pasar por un efecto (el patrón de "ajustar estado cuando cambia una
  // prop" de la doc de React).
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPhase('shown');
  }

  useEffect(() => {
    const hold = reduced.current ? REDUCED_HOLD_MS : HOLD_MS;
    const toLeave = window.setTimeout(() => setPhase('leaving'), hold);
    const toHide = window.setTimeout(
      () => setPhase('hidden'),
      hold + FADE_MS,
    );
    return () => {
      window.clearTimeout(toLeave);
      window.clearTimeout(toHide);
    };
  }, [pathname]);

  if (phase === 'hidden') return null;
  return <ViewLoader leaving={phase === 'leaving'} />;
}
