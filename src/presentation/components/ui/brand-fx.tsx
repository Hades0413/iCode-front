import { useEffect, useRef, useState } from 'react';
import '../../styles/fx.css';

/**
 * Los efectos de marca que cruzan todo el producto, en un solo lugar:
 *
 * 1. **CTA burst** — al hacer click en un botón primario, el botón salpica
 *    partículas líquidas con la paleta del logo. Es la adaptación del
 *    GooeyNav de reactbits (mismos parámetros: 15 partículas, distancias
 *    90→10, 600 ms ± 300 de varianza) pero pasada por el filtro gooey de la
 *    marca, para que las gotas se fundan como el logo.
 * 2. **KPI glow** — al pasar el mouse por una tarjeta de número, un borde
 *    iluminado sigue al cursor (adaptación del BorderGlow de reactbits, en
 *    claro y con los colores de marca). Acá solo se trackea el cursor con
 *    --gx/--gy; el dibujo es 100 % CSS (fx.css).
 *
 * Va montado una sola vez en App y trabaja por delegación: ninguna pantalla
 * tiene que pedir los efectos, y los CTA y KPI nuevos los heredan solos.
 */

/** Qué cuenta como CTA: primarios del escritorio, botones grandes del
    recorrido y los atajos de perfil del ingreso. */
const CTA_SELECTOR = '.btn-pri, .jn-btn, .auth-as';
/** Las dos tarjetas de número del producto. */
const GLOW_SELECTOR = '.kpi, .stat';

/* Parámetros del snippet original de GooeyNav. */
const PARTICLE_COUNT = 15;
const PARTICLE_DISTANCES = [90, 10] as const;
const PARTICLE_R = 100;
const ANIMATION_TIME = 600;
const TIME_VARIANCE = 300;
/* El `colors` del snippet ([1,2,3,1,2,3,1,4]) mapeado a la paleta del logo. */
const COLOR_ORDER = [1, 2, 3, 1, 2, 3, 1, 4] as const;
const PALETTE: Record<number, string> = {
  1: '#2b62d9', // azul de marca
  2: '#14bb9a', // teal
  3: '#f0454a', // coral
  4: '#f6a23b', // ámbar
};

const noise = (n: number) => n / 2 - Math.random() * n;

interface BurstParticle {
  key: number;
  color: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  time: number;
  delay: number;
  size: number;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  particles: BurstParticle[];
}

function makeBurst(id: number, x: number, y: number): Burst {
  const particles: BurstParticle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Reparto en abanico completo con un poco de ruido, como el original:
    // parejo para que el estallido se lea redondo, ruidoso para que dos
    // clicks nunca se vean iguales.
    const angle = ((360 / PARTICLE_COUNT) * i + noise(24)) * (Math.PI / 180);
    const far = PARTICLE_DISTANCES[0] + noise(PARTICLE_R / 5);
    const near = PARTICLE_DISTANCES[1] + noise(6);
    particles.push({
      key: i,
      color: PALETTE[COLOR_ORDER[i % COLOR_ORDER.length]],
      sx: Math.cos(angle) * far,
      sy: Math.sin(angle) * far,
      ex: Math.cos(angle) * near,
      ey: Math.sin(angle) * near,
      time: ANIMATION_TIME + Math.abs(noise(TIME_VARIANCE * 2)),
      delay: Math.abs(noise(90)),
      // No menos de ~13px: el goo desenfoca y vuelve a endurecer el alfa,
      // y una gota demasiado chica queda con alfa bajo el umbral de la
      // matriz — existe en el DOM pero no pinta ni un pixel.
      size: 13 + Math.abs(noise(8)),
    });
  }
  return { id, x, y, particles };
}

export function BrandFx() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (reduced.current) return;
      const target = event.target as Element | null;
      const cta = target?.closest?.(CTA_SELECTOR);
      if (!cta || (cta as HTMLButtonElement).disabled) return;

      // El estallido nace del centro del botón, no del puntero: es el botón
      // el que salpica, igual que en el GooeyNav original.
      const rect = cta.getBoundingClientRect();
      const id = nextId.current++;
      setBursts((current) => [
        ...current,
        makeBurst(id, rect.left + rect.width / 2, rect.top + rect.height / 2),
      ]);
      window.setTimeout(
        () => setBursts((current) => current.filter((b) => b.id !== id)),
        ANIMATION_TIME + TIME_VARIANCE + 250,
      );
    }

    // Delegado y pasivo: una sola escucha para todas las tarjetas de número
    // de todas las pantallas. Solo mueve dos variables CSS, sin re-render.
    function onMove(event: PointerEvent) {
      const card = (event.target as Element | null)?.closest?.(
        GLOW_SELECTOR,
      ) as HTMLElement | null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--gx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--gy', `${event.clientY - rect.top}px`);
    }

    document.addEventListener('click', onClick);
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div className="fxb-layer" aria-hidden="true">
      {/* El mismo truco metaball del logo, para que las partículas se fundan
          entre sí al nacer y al morir. */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        {/* Blur suave y umbral bajo a propósito: las gotas de un estallido
            son chicas, y con los valores del logo (σ=8, 24/−12) su alfa no
            llega al corte y desaparecen. */}
        <filter id="fxb-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
          />
        </filter>
      </svg>

      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="fxb"
          style={{ left: burst.x, top: burst.y }}
        >
          {burst.particles.map((p) => (
            <i
              key={p.key}
              style={{
                ['--c' as string]: p.color,
                ['--s' as string]: `${p.size}px`,
                ['--sx' as string]: `${p.sx}px`,
                ['--sy' as string]: `${p.sy}px`,
                ['--ex' as string]: `${p.ex}px`,
                ['--ey' as string]: `${p.ey}px`,
                ['--t' as string]: `${p.time}ms`,
                ['--d' as string]: `${p.delay}ms`,
              }}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
