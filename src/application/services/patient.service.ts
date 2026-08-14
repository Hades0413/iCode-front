import type {
  ClinicalSummary,
  ClinicalSummarySection,
} from '../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../domain/entities/patient.entity';
import type { AppointmentReport } from '../../domain/entities/journey.entity';
import {
  canApproveSummary,
  canGenerateSummary,
  canRegenerateSummary,
  canReviewSummary,
  signBlockedReason,
  summaryBlockedReason,
} from '../../domain/rules/clinical-summary.rules';
import type { ClinicalSummaryResult } from '../dto/clinical-summary-result.dto';
import type { PatientRepositoryPort } from '../ports/patient-repository.port';

/** Se lanza cuando la historia clínica no se puede tocar en este estado. */
export class ClinicalSummaryNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClinicalSummaryNotAllowedError';
  }
}

/**
 * Casos de uso del tablero de pacientes. El filtrado, el orden, los KPIs y
 * las alertas son reglas de dominio (domain/rules/), no del transporte, así
 * que no pasan por aquí.
 *
 * Sin "parameter properties" en el constructor a propósito: el tsconfig usa
 * erasableSyntaxOnly, igual que en AuthService.
 */
export class PatientService {
  private readonly patientRepository: PatientRepositoryPort;

  constructor(patientRepository: PatientRepositoryPort) {
    this.patientRepository = patientRepository;
  }

  /** La cohorte del tablero: en tutela = todavía no cumplieron 18. */
  async getCohort(): Promise<Patient[]> {
    return this.patientRepository.listInTutelage();
  }

  /** Los que ya cruzaron, para el panel de seguimiento. */
  async getPostTransition(): Promise<Patient[]> {
    return this.patientRepository.listPostTransition();
  }

  /* ---------- historia clínica de transferencia ---------- */

  /** Las 2 hojas del paciente. null = todavía no se generaron. */
  async getClinicalSummary(patientId: string): Promise<ClinicalSummary | null> {
    return this.patientRepository.getClinicalSummary(patientId);
  }

  /**
   * El "pase de consulta": el médico escanea (o tipea) el código de 6
   * caracteres que el paciente generó en su app, sin pedirle el documento en
   * voz alta. null = el código no existe o ya venció — no se distingue el
   * motivo, ni acá ni en el servidor, para no darle pistas a quien prueba
   * códigos al azar.
   */
  async getClinicalSummaryByConsultationCode(
    code: string,
  ): Promise<ClinicalSummary | null> {
    return this.patientRepository.getClinicalSummaryByConsultationCode(code);
  }

  /** El encabezado del "pase de consulta" — mismo código, otro recurso. */
  async getPatientByConsultationCode(code: string): Promise<Patient | null> {
    return this.patientRepository.getPatientByConsultationCode(code);
  }

  /** "Registrar esta atención": confirma la consulta de hoy. */
  async registerConsultationVisit(
    code: string,
    report: AppointmentReport,
  ): Promise<Patient> {
    return this.patientRepository.registerConsultationVisit(code, report);
  }

  /**
   * Le pide a la IA el borrador. Lo que vuelve es un DRAFT y nada más: el
   * caso de uso "generar" no aprueba nada, y no existe ningún camino en el
   * front que genere y firme de golpe — la revisión de un médico es el punto
   * del proceso, no un paso opcional.
   */
  async generateClinicalSummary(
    patient: Patient,
    /** El borrador que ya existe, cuando lo que se pide es rehacerlo. */
    current: ClinicalSummary | null = null,
  ): Promise<ClinicalSummaryResult> {
    const allowed = current
      ? canRegenerateSummary(patient, current)
      : canGenerateSummary(patient);
    if (!allowed) {
      throw new ClinicalSummaryNotAllowedError(
        summaryBlockedReason(patient) ??
          (current?.editedAt
            ? 'El borrador tiene correcciones tuyas: volver a generarlo las perdería.'
            : 'Este paciente ya tiene su historia clínica empezada.'),
      );
    }
    return this.patientRepository.generateClinicalSummary(patient.id);
  }

  /** Guarda lo que el médico corrigió del borrador. Solo sobre un DRAFT. */
  async saveClinicalSummaryDraft(
    patient: Patient,
    sections: readonly ClinicalSummarySection[],
  ): Promise<ClinicalSummaryResult> {
    if (!canReviewSummary(patient)) {
      throw new ClinicalSummaryNotAllowedError(
        patient.summaryStatus === 'APPROVED'
          ? 'La historia clínica ya está firmada: no se edita.'
          : 'Todavía no hay un borrador que editar.',
      );
    }
    return this.patientRepository.saveClinicalSummaryDraft(
      patient.id,
      sections,
    );
  }

  /**
   * La firma. Solo en su ventana —1 día antes del cumpleaños—: hasta
   * entonces el borrador tiene que poder seguir cambiando, porque pueden
   * aparecer enfermedades nuevas. Precondición chequeada aquí y también en
   * el servidor (409).
   */
  async approveClinicalSummary(
    patient: Patient,
  ): Promise<ClinicalSummaryResult> {
    if (!canApproveSummary(patient)) {
      throw new ClinicalSummaryNotAllowedError(
        signBlockedReason(patient) ??
          (patient.summaryStatus === 'APPROVED'
            ? 'Esta historia clínica ya está firmada.'
            : 'No hay borrador para firmar: primero hay que generarlo.'),
      );
    }
    return this.patientRepository.approveClinicalSummary(patient.id);
  }
}
