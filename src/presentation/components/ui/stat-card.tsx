import { useCountUp } from '../../hooks/use-count-up';
import styles from './stat-card.module.css';

export type StatSeverity = 'neutral' | 'ok' | 'warn' | 'crit';

/**
 * Una tarjeta de número: el valor grande, su proporción sobre el total y una
 * línea de contexto.
 *
 * Si recibe `onClick` se renderiza como botón; si no, como bloque. Esa es la
 * diferencia entre un KPI que lleva a los casos que cuenta (el tablero) y un
 * dato de solo lectura (el panel de seguimiento) — mismo componente, misma
 * pinta, sin fingir que algo es clickeable cuando no lo es.
 */
export function StatCard({
  label,
  value,
  suffix,
  hint,
  severity = 'neutral',
  total,
  isActive = false,
  onClick,
}: Readonly<{
  label: string;
  value: number;
  /** La unidad del número ("%"): sin ella, un 100 no dice de qué es. */
  suffix?: string;
  hint?: string;
  severity?: StatSeverity;
  /** Sobre cuántos, para el medidor. Sin esto no se dibuja. */
  total?: number;
  isActive?: boolean;
  onClick?: () => void;
}>) {
  const shown = useCountUp(value);
  const share =
    total !== undefined && total > 0 ? (value / total) * 100 : undefined;

  const body = (
    <>
      <span className={styles['stat-card-kpi-label']}>{label}</span>
      <span className={styles['stat-card-kpi-value']}>
        {shown}
        {suffix && (
          <span className={styles['stat-card-kpi-suffix']}>{suffix}</span>
        )}
      </span>
      {share !== undefined && (
        <span className={styles['stat-card-kpi-meter']}>
          <i style={{ ['--w' as string]: `${share}%` }} />
        </span>
      )}
      {hint && <span className={styles['stat-card-kpi-hint']}>{hint}</span>}
    </>
  );

  // "kpi" se mantiene literal (además de styles['stat-card-kpi']), en las
  // dos variantes: es el selector que usan brand-fx.tsx (GLOW_SELECTOR) y
  // fx.css para el brillo de marca que sigue al cursor, un hook aparte de
  // clinic.css que no migra con este archivo.
  if (!onClick) {
    return (
      <div
        className={`${styles['stat-card-kpi']} ${styles['stat-card-kpi-static']} kpi`}
        data-severity={severity}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles['stat-card-kpi']} kpi ${isActive ? 'on' : ''}`}
      data-severity={severity}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {body}
    </button>
  );
}

/** La grilla que los acomoda. Se adapta sola a 2, 3, 4 o 5 tarjetas. */
export function StatGrid({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={styles['stat-card-grid']}>{children}</div>;
}
