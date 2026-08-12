import { authRoutes } from './auth.handlers';
import { clinicalSummaryRoutes } from './clinical-summaries.handlers';
import type { MockRoute } from './mock-http';
import { journeyRoutes } from './journeys.handlers';
import { patientRoutes } from './patients.handlers';
import { referralRoutes } from './referrals.handlers';

/**
 * Tabla de rutas del backend simulado — el equivalente a los controllers
 * registrados en un módulo de Nest. Para sumar un dominio nuevo: crear
 * "<dominio>.handlers.ts" al lado (exportando su propia lista de MockRoute,
 * como auth.handlers.ts) y agregarlo aquí. Nada más del front necesita
 * enterarse.
 */
export const mockRoutes: readonly MockRoute[] = [
  ...authRoutes,
  ...patientRoutes,
  ...clinicalSummaryRoutes,
  ...referralRoutes,
  ...journeyRoutes,
];
