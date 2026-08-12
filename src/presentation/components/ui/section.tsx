import type { ReactNode } from 'react';

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
    <section className="sec" id={id}>
      {title && (
        <div className="sec-h">
          <h2 className="sec-t">{title}</h2>
          {aside && <span className="eyebrow">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
