import type { Patient } from '../../domain/entities/patient.entity';

/**
 * Lo que contesta el servidor al descartar el borrador: vuelve a NONE, así
 * que no hay documento que devolver — solo la fila del paciente, para que
 * la tabla, el riel y los KPIs se enteren de que ya no hay nada empezado.
 */
export interface DiscardClinicalSummaryResult {
  patient: Patient;
}
