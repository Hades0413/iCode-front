import type { ReferralReviewStatus } from '../../domain/entities/referral-review.entity';
import type { ReferralStatusFilter } from '../../domain/rules/cohort.rules';
import { REFERRAL_REVIEW_STATUS_LABELS } from '../../domain/rules/referral-review.rules';
import { SearchInput } from './ui/search-input';

const REFERRAL_STATUS_OPTIONS: readonly ReferralReviewStatus[] = [
  'NONE',
  'ACCEPTED',
  'REJECTED',
  'OBSERVED',
];

/**
 * Lo que acota la lista dentro del corte elegido: la revisión del destino
 * (ver referral-review.rules.ts) y el DNI.
 *
 * Aquí no hay filtro de especialidad a propósito: el médico solo ve pacientes
 * de la suya —el recorte lo hace el servidor con su sesión—, así que ofrecerle
 * un selector de especialidades sería un control que siempre tiene una sola
 * opción real. Los cortes (todos · cumplen 18 pronto · sin historia clínica)
 * son las tarjetas de arriba.
 *
 * El selector de revisión es OPCIONAL porque esta barra la comparten cuatro
 * pantallas y solo una tiene esa pregunta: "¿qué dijo el destino sobre la
 * historia firmada?" solo significa algo en la lista del médico. Seguimiento,
 * avisos y contrarreferencias buscan por DNI y nada más — pedirles el filtro
 * sería obligarlas a conocer un concepto que no es suyo.
 */
export function CohortFilterBar({
  query,
  onQueryChange,
  referralStatus = 'ALL',
  onReferralStatusChange,
}: Readonly<{
  query: string;
  onQueryChange: (query: string) => void;
  referralStatus?: ReferralStatusFilter;
  /** Sin esto, la barra es solo la búsqueda por DNI. */
  onReferralStatusChange?: (value: ReferralStatusFilter) => void;
}>) {
  return (
    <div className="filterbar">
      <div className="filterbar-tools">
        {onReferralStatusChange && (
          <label className="select-pill">
            <select
              value={referralStatus}
              aria-label="Filtrar por revisión del destino"
              onChange={(event) =>
                onReferralStatusChange(
                  event.target.value as ReferralStatusFilter,
                )
              }
            >
              <option value="ALL">Revisión del destino: todas</option>
              {REFERRAL_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {REFERRAL_REVIEW_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        )}
        <SearchInput
          value={query}
          onChange={onQueryChange}
          placeholder="Buscar por DNI"
          label="Buscar un paciente por su DNI"
          inputMode="numeric"
          maxLength={8}
        />
      </div>
    </div>
  );
}
