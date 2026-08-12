import type {
  CohortFilterKey,
  CohortKpi,
  KpiPart,
} from '../../domain/rules/cohort.rules';
import { useCountUp } from '../hooks/use-count-up';
import { ChevronIcon } from './icons';

/**
 * Los tres números del tablero, arriba de todo y como tarjetas grandes.
 *
 * Cada una es **un botón que filtra la lista por lo mismo que cuenta**: si el
 * número te alarma, lo que querés es ver esos casos, no leer otro número. Por
 * eso la tarjeta activa queda marcada — el número de arriba y las filas de
 * abajo siempre están diciendo lo mismo.
 *
 * Y no son solo números: cada una lleva la proporción sobre la cohorte (4 de
 * 12 no es lo mismo que 4 de 400) y, cuando el total esconde dos trabajos
 * distintos, la barra que lo parte en dos — "22 sin historia clínica" son 13
 * que hay que generar y 9 que hay que leer y firmar.
 */
export function CohortStats({
  kpis,
  active,
  onSelect,
}: Readonly<{
  kpis: readonly CohortKpi[];
  active: CohortFilterKey;
  onSelect: (key: CohortFilterKey) => void;
}>) {
  return (
    <div className="stats" role="group" aria-label="Resumen de la cohorte">
      {kpis.map((kpi) => (
        <StatTile
          key={kpi.key}
          kpi={kpi}
          isActive={active === kpi.key}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function StatTile({
  kpi,
  isActive,
  onSelect,
}: Readonly<{
  kpi: CohortKpi;
  isActive: boolean;
  onSelect: (key: CohortFilterKey) => void;
}>) {
  const shown = useCountUp(kpi.value);
  const share = kpi.total > 0 ? (kpi.value / kpi.total) * 100 : 0;
  const parts = kpi.parts.filter((part) => part.value > 0);

  return (
    <button
      type="button"
      className={`stat ${isActive ? 'on' : ''}`}
      data-severity={kpi.severity}
      aria-pressed={isActive}
      onClick={() => onSelect(kpi.key)}
    >
      <span className="stat-h">
        <span className="stat-l">{kpi.label}</span>
        <span className="stat-go">
          {isActive ? 'Viendo estos' : 'Ver estos'}
          <ChevronIcon />
        </span>
      </span>

      <span className="stat-v">
        {shown}
        {kpi.total > 0 && kpi.value !== kpi.total && (
          <span className="stat-of">de {kpi.total}</span>
        )}
      </span>

      {parts.length > 1 ? (
        <StatParts parts={parts} total={kpi.total} />
      ) : (
        <span className="stat-m">
          <i style={{ ['--w' as string]: `${share}%` }} />
        </span>
      )}

      <span className="stat-hint">{kpi.hint}</span>
    </button>
  );
}

/**
 * La barra partida: cada pedazo con su color y su etiqueta debajo. Es lo que
 * convierte un total en dos tareas — el ancho ya dice cuál pesa más.
 */
function StatParts({
  parts,
  total,
}: Readonly<{ parts: readonly KpiPart[]; total: number }>) {
  return (
    <span className="stat-parts">
      <span className="stat-m split">
        {parts.map((part) => (
          <i
            key={part.label}
            data-severity={part.severity}
            style={{
              ['--w' as string]: `${total > 0 ? (part.value / total) * 100 : 0}%`,
            }}
          />
        ))}
      </span>
      <span className="stat-legend">
        {parts.map((part) => (
          <span key={part.label} data-severity={part.severity}>
            <b>{part.value}</b> {part.label}
          </span>
        ))}
      </span>
    </span>
  );
}
