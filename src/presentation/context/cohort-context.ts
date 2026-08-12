import { createContext } from 'react';
import type { Patient } from '../../domain/entities/patient.entity';
import type { LoadError } from '../hooks/use-async-resource';

export type CohortError = LoadError;

export interface CohortContextValue {
  /** La cohorte en tutela: todos menores de 18. */
  patients: Patient[];
  isLoading: boolean;
  error: CohortError | null;
  reload: () => void;
  /**
   * Reemplaza un paciente con la versión que devolvió el servidor (por
   * ejemplo después de avisarle a la posta). Evita recargar la cohorte
   * entera para actualizar una fila.
   */
  applyPatient: (patient: Patient) => void;
}

/**
 * Separado de cohort.context.tsx por lo mismo que AuthContext: un archivo
 * que exporta un componente no puede exportar también otra cosa sin romper
 * react-refresh.
 *
 * La cohorte vive en un contexto y no dentro de la página porque el riel de
 * navegación también la necesita: los contadores del riel son los mismos
 * números que la tabla y los KPIs.
 */
export const CohortContext = createContext<CohortContextValue | undefined>(
  undefined,
);
