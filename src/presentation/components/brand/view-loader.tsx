import { LiquidMark } from './liquid-mark';
import '../../styles/loader.css';

/**
 * La cortina de carga de cada vista: el logo líquido respirando al centro,
 * un halo de aurora detrás (cálido arriba-izquierda, frío abajo-derecha,
 * como el propio logo) y el nombre del producto debajo.
 *
 * Es puramente visual: no sabe de rutas ni de tiempos. Quién la muestra y
 * cuándo la retira es asunto de route-loader.tsx — así la misma cortina
 * sirve tal cual si mañana hay que taparla sobre un fetch largo.
 */
interface ViewLoaderProps {
  /** Con true arranca la animación de salida (se disuelve hacia arriba). */
  leaving?: boolean;
}

export function ViewLoader({ leaving = false }: ViewLoaderProps) {
  return (
    <div
      className={leaving ? 'vl is-leaving' : 'vl'}
      role="status"
      aria-live="polite"
    >
      <div className="vl-scene">
        <span className="vl-halo" aria-hidden="true" />
        <LiquidMark animated className="vl-mark" />
        <div className="vl-name">Puente 18+</div>
        <div className="vl-cap" aria-hidden="true">
          Preparando tu vista
          <span className="vl-dots">
            <i />
            <i />
            <i />
          </span>
        </div>
        {/* Lo que lee el lector de pantalla; lo de arriba es decorativo. */}
        <span className="vl-sr">Cargando…</span>
      </div>
    </div>
  );
}
