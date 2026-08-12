import { useContext } from 'react';
import {
  CohortContext,
  type CohortContextValue,
} from '../context/cohort-context';

export function useCohort(): CohortContextValue {
  const context = useContext(CohortContext);
  if (!context) {
    throw new Error('useCohort debe usarse dentro de <CohortProvider>');
  }
  return context;
}
