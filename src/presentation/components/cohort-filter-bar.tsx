import { SearchInput } from './ui/search-input';

/**
 * Lo que acota la lista dentro del corte elegido: el DNI.
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
}: Readonly<{
  query: string;
  onQueryChange: (query: string) => void;
}>) {
  return (
    <div className="filterbar">
      <div className="filterbar-tools">
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
