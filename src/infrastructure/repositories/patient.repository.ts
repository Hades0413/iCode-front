import type {
  ClinicalSummary,
  ClinicalSummarySection,
} from '../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../domain/entities/patient.entity';
import type { AppointmentReport } from '../../domain/entities/journey.entity';
import type { ClinicalSummaryResult } from '../../application/dto/clinical-summary-result.dto';
import type { PatientRepositoryPort } from '../../application/ports/patient-repository.port';
import { getApiErrorStatus } from '../../common/utils/get-api-error-message';
import { apiClient } from '../http/api-client';

/** El recurso de las 2 hojas de un paciente. */
function summaryUrl(patientId: string): string {
  return `/patients/${encodeURIComponent(patientId)}/clinical-summary`;
}

/** Implementación real de PatientRepositoryPort contra la API de iCode-back. */
class HttpPatientRepository implements PatientRepositoryPort {
  async listInTutelage(): Promise<Patient[]> {
    const { data } = await apiClient.get<Patient[]>('/patients/in-tutelage');
    return data;
  }

  async listPostTransition(): Promise<Patient[]> {
    const { data } = await apiClient.get<Patient[]>(
      '/patients/post-transition',
    );
    return data;
  }

  /**
   * El 404 se traduce a null y no se propaga: "todavía no tiene historia
   * clínica" es un estado normalísimo del paciente (la mayoría arranca así),
   * no un error que la pantalla tenga que mostrar. El resto de los errores sí
   * suben — un 403 tiene que verse.
   */
  async getClinicalSummary(patientId: string): Promise<ClinicalSummary | null> {
    try {
      const { data } = await apiClient.get<ClinicalSummary>(
        summaryUrl(patientId),
      );
      return data;
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  async getClinicalSummaryByConsultationCode(
    code: string,
  ): Promise<ClinicalSummary | null> {
    try {
      const { data } = await apiClient.get<ClinicalSummary>(
        `/patients/consultation/${encodeURIComponent(code)}/clinical-summary`,
      );
      return data;
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  async getPatientByConsultationCode(code: string): Promise<Patient | null> {
    try {
      const { data } = await apiClient.get<Patient>(
        `/patients/consultation/${encodeURIComponent(code)}`,
      );
      return data;
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  async registerConsultationVisit(
    code: string,
    report: AppointmentReport,
  ): Promise<Patient> {
    const { data } = await apiClient.post<Patient>(
      `/patients/consultation/${encodeURIComponent(code)}/visit`,
      report,
    );
    return data;
  }

  async generateClinicalSummary(
    patientId: string,
  ): Promise<ClinicalSummaryResult> {
    const { data } = await apiClient.post<ClinicalSummaryResult>(
      summaryUrl(patientId),
    );
    return data;
  }

  async saveClinicalSummaryDraft(
    patientId: string,
    sections: readonly ClinicalSummarySection[],
  ): Promise<ClinicalSummaryResult> {
    const { data } = await apiClient.put<ClinicalSummaryResult>(
      summaryUrl(patientId),
      { sections },
    );
    return data;
  }

  /**
   * La firma es su propio sub-recurso (POST .../approval) y no un PATCH del
   * estado: firmar no es "editar un campo", es un acto con autor y fecha que
   * el servidor registra. Un PATCH { status: 'APPROVED' } invitaría a
   * escribir ese estado desde cualquier otro lado.
   */
  async approveClinicalSummary(
    patientId: string,
  ): Promise<ClinicalSummaryResult> {
    const { data } = await apiClient.post<ClinicalSummaryResult>(
      `${summaryUrl(patientId)}/approval`,
    );
    return data;
  }
}

export const patientRepository = new HttpPatientRepository();
