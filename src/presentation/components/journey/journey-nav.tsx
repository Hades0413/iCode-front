import type { ReactElement } from 'react';

export interface JourneyTab {
  key: string;
  label: string;
  icon: () => ReactElement;
  /** Cosas pendientes en esa pestaña. 0 = sin globito. */
  badge?: number;
}

/**
 * La barra de abajo: una pestaña por pregunta que la persona trae, y el ícono
 * activo flotando en un círculo que "muerde" la barra.
 *
 * Es la navegación de una app de celular a propósito —fija abajo, al alcance
 * del pulgar— porque esta pantalla se abre en un celular. El círculo que
 * sobresale no es decoración: le dice al chico *dónde está parado* sin leer
 * nada, que es lo que un menú de escritorio con texto no logra en una mano.
 *
 * La mordida de la barra es una máscara radial que sigue al círculo; ambos se
 * mueven con la misma variable `--jn-active`, registrada con @property para
 * que el navegador la pueda interpolar y el círculo *viaje* de pestaña a
 * pestaña en vez de teletransportarse. Donde @property no exista, salta sin
 * animación y no se rompe nada.
 */
export function JourneyNav({
  tabs,
  active,
  onSelect,
}: Readonly<{
  tabs: readonly JourneyTab[];
  active: string;
  onSelect: (key: string) => void;
}>) {
  const activeIndex = Math.max(
    tabs.findIndex((tab) => tab.key === active),
    0,
  );
  const ActiveIcon = tabs[activeIndex]?.icon;

  return (
    <nav className="jn-nav" aria-label="Secciones">
      <div
        className="jn-nav-in"
        style={{
          ['--jn-tabs' as string]: tabs.length,
          ['--jn-active' as string]: activeIndex,
        }}
      >
        {/* El círculo flotante con el ícono de donde estás. La key fuerza el
            remonte para que el ícono nuevo entre con su rebote. */}
        <span className="jn-fab" aria-hidden="true">
          {ActiveIcon && (
            <span key={active} className="jn-fab-i">
              <ActiveIcon />
            </span>
          )}
        </span>

        <div className="jn-nav-bar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                className={`jn-tab ${isActive ? 'on' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect(tab.key)}
              >
                <span className="jn-tab-i">
                  <Icon />
                  {(tab.badge ?? 0) > 0 && (
                    <span className="jn-badge">{tab.badge}</span>
                  )}
                </span>
                <span className="jn-tab-l">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
