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
 */
export function CohortFilterBar({
  query,
  onQueryChange,
  referralStatus,
  onReferralStatusChange,
}: Readonly<{
  query: string;
  onQueryChange: (query: string) => void;
  referralStatus: ReferralStatusFilter;
  onReferralStatusChange: (value: ReferralStatusFilter) => void;
}>) {
  return (
    <div className="filterbar">
      <div className="filterbar-tools">
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
