import { useMemo, useState } from 'react';

export interface Paged<T> {
  /** Página actual, 1-based y siempre dentro de rango. */
  page: number;
  pageCount: number;
  /** Solo las filas de esta página. */
  rows: T[];
  /** Primer y último elemento visibles, 1-based (0 si no hay nada). */
  from: number;
  to: number;
  total: number;
  goToPage: (page: number) => void;
}

/**
 * Paginar una lista que ya está en memoria.
 *
 * La página se acota a lo que hay en cada render en lugar de resetearse con
 * un efecto: si estabas en la 3 y un filtro deja una sola página, la vista se
 * corrige sola sin un render intermedio con la tabla vacía.
 *
 * El tablero de pacientes no usa esto porque su página viaja en la URL (se
 * comparte junto con el filtro); para las bandejas del área, que son una
 * pantalla de trabajo y no algo que se linkea, alcanza con estado local.
 */
export function usePagination<T>(
  items: readonly T[],
  pageSize: number,
): Paged<T> {
  const [requested, setRequested] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requested, 1), pageCount);
  const rows = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    pageCount,
    rows,
    from: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, items.length),
    total: items.length,
    goToPage: setRequested,
  };
}
