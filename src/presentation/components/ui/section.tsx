import type { ReactNode } from 'react';
import styles from './section.module.css';

/**
 * Una sección de contenido con su título y, a la derecha, un dato de
 * contexto. El diseño evita las cards para agrupar: separa con un filete y
 * una barrita de acento, y esta es la pieza que lo hace en todas las
 * pantallas.
 */
export function Section({
  title,
  aside,
  children,
  id,
}: Readonly<{
  title?: string;
  /** Lo que va a la derecha del título, en tono menor. */
  aside?: ReactNode;
  children: ReactNode;
  /** Para poder llevar el scroll hasta aquí (ver los KPIs del tablero). */
  id?: string;
}>) {
  return (
    <section className={styles['section-root']} id={id}>
      {title && (
        <div className={styles['section-header']}>
          <h2 className={styles['section-title']}>{title}</h2>
          {aside && <span className="eyebrow">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
