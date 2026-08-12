import { useCallback, type ReactNode } from 'react';
import { patientService } from '../../composition-root';
import type { Patient } from '../../domain/entities/patient.entity';
import { useAsyncResource } from '../hooks/use-async-resource';
import { CohortContext } from './cohort-context';

const NO_PATIENTS: Patient[] = [];

export function CohortProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const load = useCallback(() => patientService.getCohort(), []);
  const { data, isLoading, error, reload, setData } = useAsyncResource(
    load,
    NO_PATIENTS,
    'No se pudo cargar la lista de pacientes.',
  );

  const applyPatient = useCallback(
    (updated: Patient) => {
      setData(
        data.map((patient) => (patient.id === updated.id ? updated : patient)),
      );
    },
    [data, setData],
  );

  return (
    <CohortContext.Provider
      value={{ patients: data, isLoading, error, reload, applyPatient }}
    >
      {children}
    </CohortContext.Provider>
  );
}
