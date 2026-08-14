import type { PatientAttachment } from '../../domain/entities/patient-attachment.entity';

/**
 * "Exámenes y documentos" de la ficha — un puerto propio porque es un
 * recurso de muchos-por-paciente, sin el ciclo de vida (borrador/firma) de
 * PatientRepositoryPort ni el de ReferralRepositoryPort.
 */
export interface PatientAttachmentRepositoryPort {
  listAttachments(patientId: string): Promise<PatientAttachment[]>;

  uploadAttachment(
    patientId: string,
    file: File,
  ): Promise<PatientAttachment>;

  downloadAttachmentDocument(
    patientId: string,
    attachmentId: string,
  ): Promise<Blob>;
}
