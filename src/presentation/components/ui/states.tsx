import { Notice } from './notice';
import { Section } from './section';

/** Nada que mostrar, pero por una razón normal (un filtro sin resultados). */
export function EmptyState({ children }: Readonly<{ children: string }>) {
  return <div className="empty-s">{children}</div>;
}

/**
 * Esqueleto de carga. Barras de ancho decreciente: da la sensación de una
 * lista sin fingir una lista concreta.
 */
export function LoadingRows({
  rows = 8,
  label = 'Cargando',
}: Readonly<{ rows?: number; label?: string }>) {
  return (
    <div className="skel" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, row) => (
        <i key={row} style={{ width: `${100 - row * 4}%` }} />
      ))}
    </div>
  );
}

/**
 * Un error de carga. Distingue "no tienes permiso" de "se cayó algo", porque
 * en el primer caso reintentar no sirve para nada y ofrecerlo es mentirle al
 * usuario.
 */
export function LoadErrorState({
  status,
  message,
  permission,
  onRetry,
}: Readonly<{
  status: number | null;
  message: string;
  /** El permiso que falta, para poder nombrarlo en el 403. */
  permission?: string;
  onRetry: () => void;
}>) {
  if (status === 403) {
    return (
      <Section>
        <Notice tone="locked" className="wrapmax">
          <b>No tienes acceso a esta información.</b> Tu usuario no tiene el
          permiso {permission && <span className="mono">{permission}</span>}.
          Pídeselo a quien administre los accesos del hospital.
        </Notice>
      </Section>
    );
  }

  return (
    <Section>
      <Notice tone="crit" className="wrapmax">
        <b>No se pudo cargar la información.</b> {message}
      </Notice>
      <div className="row" style={{ paddingTop: 16 }}>
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </Section>
  );
}
