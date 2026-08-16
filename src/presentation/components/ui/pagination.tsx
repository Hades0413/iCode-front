import { ChevronIcon } from '../icons';
import styles from './pagination.module.css';

/**
 * El paginador de una lista larga.
 *
 * Dice **en qué parte del total estás** ("11–20 de 34") y no solo qué página:
 * con 34 pacientes repartidos en cuatro páginas, "página 2 de 4" no le dice a
 * nadie cuántos le faltan por mirar.
 *
 * Las páginas se listan todas mientras sean pocas; si son muchas se recortan
 * con puntos suspensivos alrededor de la actual, para que la barra no crezca
 * sin límite.
 */
export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  unit,
  onChange,
}: Readonly<{
  /** Página actual, 1-based. */
  page: number;
  pageCount: number;
  /** Primer y último elemento visibles, 1-based. */
  from: number;
  to: number;
  total: number;
  /** Qué se está contando: "paciente" / "pacientes". */
  unit: readonly [string, string];
  onChange: (page: number) => void;
}>) {
  if (total === 0) {
    return null;
  }

  return (
    <nav
      className={styles['pagination-root']}
      aria-label="Páginas de la lista"
    >
      <p className={styles['pagination-count']}>
        <b>
          {from}–{to}
        </b>{' '}
        de {total} {total === 1 ? unit[0] : unit[1]}
      </p>

      {pageCount > 1 && (
        <div className={styles['pagination-buttons']}>
          <button
            type="button"
            className={`${styles['pagination-item']} ${styles['pagination-arrow']}`}
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            aria-label="Página anterior"
          >
            <span className={styles['pagination-flip']}>
              <ChevronIcon />
            </span>
          </button>

          {pagesAround(page, pageCount).map((entry, index) =>
            entry === null ? (
              // key por posición: los huecos no tienen identidad propia.
              <span key={`gap-${index}`} className={styles['pagination-gap']}>
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className={`${styles['pagination-item']} ${
                  entry === page ? styles['pagination-item-current'] : ''
                }`}
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onChange(entry)}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            className={`${styles['pagination-item']} ${styles['pagination-arrow']}`}
            disabled={page === pageCount}
            onClick={() => onChange(page + 1)}
            aria-label="Página siguiente"
          >
            <ChevronIcon />
          </button>
        </div>
      )}
    </nav>
  );
}

/**
 * Los números a mostrar: siempre la primera, la última y la actual con sus
 * vecinas; `null` es un hueco ("…").
 */
function pagesAround(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const shown = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const withGaps: (number | null)[] = [];
  for (const [index, value] of shown.entries()) {
    if (index > 0 && value - (shown[index - 1] ?? 0) > 1) {
      withGaps.push(null);
    }
    withGaps.push(value);
  }
  return withGaps;
}
