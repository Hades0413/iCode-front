import { useId } from 'react';
import '../../styles/loader.css';

/**
 * La marca del proyecto dibujada en vivo: dos gotas —una cálida, una fría—
 * unidas por un cuello líquido. No es un PNG del logo: son dos círculos con
 * degradado pasados por un filtro "gooey" (blur + curva de alfa), que es
 * exactamente cómo está construida la forma original. La ventaja de tenerla
 * viva es que puede respirar: con `animated`, las gotas se separan y se
 * vuelven a fundir, y la marca ES el spinner.
 *
 * Los ids de filtro y degradados salen de useId: si hay dos marcas en la
 * misma pantalla (loader + encabezado), cada una usa sus propios defs y no
 * se pisan.
 */
interface LiquidMarkProps {
  /** Con true las gotas respiran (separarse y fundirse en bucle). */
  animated?: boolean;
  /**
   * Con true el lienzo se recorta al borde de la forma: es lo que quiere un
   * chip de 26px, donde el aire del lienzo grande dejaría el logo enano.
   * El lienzo holgado queda para la cortina de carga, que necesita espacio
   * alrededor para que las gotas se separen sin cortarse.
   */
  compact?: boolean;
  className?: string;
}

export function LiquidMark({
  animated = false,
  compact = false,
  className,
}: LiquidMarkProps) {
  const uid = useId();
  const gooId = `${uid}-goo`;
  const warmId = `${uid}-warm`;
  const coolId = `${uid}-cool`;

  return (
    <svg
      viewBox={compact ? '54 26 144 92' : '0 0 240 150'}
      className={['lm', animated ? 'lm-live' : '', className ?? '']
        .join(' ')
        .trim()}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* La gota chica: rojo abajo-izquierda, naranja hacia el cuello. */}
        <linearGradient id={warmId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#f0454a" />
          <stop offset="0.55" stopColor="#f4703f" />
          <stop offset="1" stopColor="#f6a23b" />
        </linearGradient>

        {/* La gota grande: teal donde toca a la cálida, azul profundo al
            fondo. El verde del medio del logo no se pinta: aparece solo
            cuando el blur mezcla naranja con teal. */}
        <linearGradient id={coolId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2bc3a2" />
          <stop offset="0.45" stopColor="#1e8fe0" />
          <stop offset="1" stopColor="#1a4fd6" />
        </linearGradient>

        {/* El truco metaball: desenfocar todo y volver a endurecer el alfa.
            Dos formas cercanas quedan unidas por un cuello suave. */}
        <filter id={gooId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12"
          />
        </filter>
      </defs>

      <g filter={`url(#${gooId})`}>
        {/* En reposo los círculos apenas se tocan: el filtro forma el cuello
            fino del logo. Las clases solo animan transform, así la forma en
            reposo sigue siendo la marca tal cual. */}
        <g className="lm-blob lm-blob-warm">
          <circle cx="86" cy="80" r="26" fill={`url(#${warmId})`} />
        </g>
        <g className="lm-blob lm-blob-cool">
          <circle cx="152" cy="72" r="40" fill={`url(#${coolId})`} />
        </g>

        {/* Gotitas que quedan flotando cuando el cuello se rompe y que el
            líquido reabsorbe al fundirse. En reposo miden cero. */}
        <g className="lm-drop lm-drop-a">
          <circle cx="119" cy="74" r="6" fill="#2bc3a2" />
        </g>
        <g className="lm-drop lm-drop-b">
          <circle cx="112" cy="62" r="4.5" fill="#f6a23b" />
        </g>
      </g>
    </svg>
  );
}
