import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface RailItem {
  key: string;
  label: string;
  to: string;
  icon: ReactNode;
  /** El número al lado. Se omite cuando no hay nada útil que contar. */
  count?: number;
  /** El color del badge: verde, ámbar o rojo. */
  tone?: 'ok' | 'warn' | 'hot';
  isActive: boolean;
}

export interface RailGroup {
  key: string;
  title: string;
  items: RailItem[];
}

/**
 * La navegación del riel, agrupada por oficina.
 *
 * Es una lista de grupos y no un segmentado fijo porque el escritorio tiene
 * más de un rol: el especialista ve "Consultorio", el área ve "Referencias",
 * y quien tenga los dos permisos ve los dos bloques uno debajo del otro. Con
 * un control de dos posiciones, sumar una oficina obligaba a rediseñarlo.
 */
export function RailNav({
  groups,
}: Readonly<{ groups: readonly RailGroup[] }>) {
  return (
    <nav className="rail-nav" aria-label="Secciones">
      {groups.map((group) => (
        <div key={group.key} className="rail-group">
          <div className="rail-group-t">{group.title}</div>
          {group.items.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`rn ${item.isActive ? 'on' : ''}`}
              aria-current={item.isActive ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className={`rcount ${item.tone ?? ''}`}>
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
