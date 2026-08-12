import { useEffect, useRef, useState } from 'react';

/**
 * Anima un número desde el valor anterior hasta el nuevo. Portado del
 * `countUp` del prototipo de diseño: un KPI que aparece contando se lee como
 * un dato que acaba de calcularse, no como una imagen pegada.
 *
 * Si el sistema pide menos movimiento, devuelve el valor final y no monta
 * ninguna animación — no "anima rápido", simplemente no anima.
 */
export function useCountUp(value: number, durationMs = 700): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  // Se lee una sola vez, en el primer render: la preferencia del sistema no
  // cambia en el medio de una sesión, y así el efecto no tiene que hacer
  // setState sincrónico para el caso "no animar".
  const [reduceMotion] = useState(
    () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;

    if (reduceMotion || from === value) {
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // easeOutCubic: arranca rápido y frena, como el prototipo.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduceMotion]);

  return reduceMotion ? value : display;
}
