import type { ReactNode } from 'react';

/**
 * El encabezado de cualquier pantalla: título, y debajo una fila de datos
 * separados por filetes. Lo usan el tablero, el seguimiento y la ficha, así
 * que la banda con degradado se define una sola vez.
 */
export function PageHeader({
  title,
  children,
  above,
}: Readonly<{
  title: string;
  /** Los datos del subtítulo: <PageHeaderStat> o texto. */
  children?: ReactNode;
  /** Migas de pan o cualquier cosa que vaya arriba del título. */
  above?: ReactNode;
}>) {
  return (
    <header className="page-h">
      {above}
      <h1 className="page-t">{title}</h1>
      {children && <div className="page-sub">{children}</div>}
    </header>
  );
}

/**
 * Un dato del subtítulo. `tone="flag"` lo pinta en rojo: se usa para el
 * número que no debería existir.
 */
export function PageHeaderStat({
  value,
  children,
  tone,
}: Readonly<{
  value?: number | string;
  children: ReactNode;
  tone?: 'flag' | 'dim';
}>) {
  return (
    <span className={tone ?? ''}>
      {value !== undefined && <b>{value}</b>}
      {value !== undefined ? ' ' : ''}
      {children}
    </span>
  );
}
