import type { ClinicalSummary } from '../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../domain/entities/patient.entity';

/**
 * Lo que contesta el servidor cuando se genera, se edita o se firma la
 * historia clínica: el documento **y** la fila del paciente.
 *
 * Van juntos porque cambian juntos — firmar mueve `summaryStatus` a APPROVED
 * y `summaryProgress` a 1, y la tabla, el riel y los KPIs leen esos dos
 * campos. Devolver solo el documento obligaría a recargar la cohorte entera
 * después de cada acción, que es tirar todo el estado de la pantalla para
 * enterarse de algo que el servidor ya sabía.
 */
export interface ClinicalSummaryResult {
  patient: Patient;
  summary: ClinicalSummary;
}
