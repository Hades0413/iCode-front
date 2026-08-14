import type {
  ClinicalSummary,
  ClinicalSummarySection,
} from '../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../domain/entities/patient.entity';
import type { ClinicalSummaryResult } from '../dto/clinical-summary-result.dto';

/**
 * Mismo criterio que AuthRepositoryPort: "application" pide pacientes sin
 * saber si salen de iCode-back por HTTP, de una cache o de un fake en un
 * test.
 */
export interface PatientRepositoryPort {
  /** La cohorte en tutela: los que todavía no cumplieron 18. */
  listInTutelage(): Promise<Patient[]>;

  /** Los que ya cruzaron, para el panel de seguimiento. */
  listPostTransition(): Promise<Patient[]>;

  /** La historia clínica de transferencia. null = todavía no se generó. */
  getClinicalSummary(patientId: string): Promise<ClinicalSummary | null>;

  /**
   * El "pase de consulta": resuelve el código único que el paciente generó en
   * su app y devuelve su historia clínica de transferencia — para el médico
   * que lo atiende sin que tenga que decir su documento en voz alta. null =
   * el código no existe o ya venció (indistinguible a propósito, igual que
   * el servidor).
   */
  getClinicalSummaryByConsultationCode(
    code: string,
  ): Promise<ClinicalSummary | null>;

  /**
   * Le pide a la IA el borrador de las 2 hojas. Queda en DRAFT: generar no
   * es firmar.
   */
  generateClinicalSummary(patientId: string): Promise<ClinicalSummaryResult>;

  /** Guarda las correcciones del médico sobre el borrador. */
  saveClinicalSummaryDraft(
    patientId: string,
    sections: readonly ClinicalSummarySection[],
  ): Promise<ClinicalSummaryResult>;

  /** La firma: el borrador pasa a ser un documento clínico. */
  approveClinicalSummary(patientId: string): Promise<ClinicalSummaryResult>;
}
