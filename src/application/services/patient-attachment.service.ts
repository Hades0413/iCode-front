import type { PatientAttachment } from '../../domain/entities/patient-attachment.entity';
import type { PatientAttachmentRepositoryPort } from '../ports/patient-attachment-repository.port';

/**
 * "Exámenes y documentos" de la ficha — sin ciclo de vida propio (se suben
 * y se listan, nada más), por eso el service es un pasamanos casi directo
 * al puerto en vez de tener reglas de negocio propias.
 */
export class PatientAttachmentService {
  private readonly patientAttachmentRepository: PatientAttachmentRepositoryPort;

  constructor(patientAttachmentRepository: PatientAttachmentRepositoryPort) {
    this.patientAttachmentRepository = patientAttachmentRepository;
  }

  async listAttachments(patientId: string): Promise<PatientAttachment[]> {
    return this.patientAttachmentRepository.listAttachments(patientId);
  }

  async uploadAttachment(
    patientId: string,
    file: File,
  ): Promise<PatientAttachment> {
    return this.patientAttachmentRepository.uploadAttachment(patientId, file);
  }

  async downloadAttachmentDocument(
    patientId: string,
    attachmentId: string,
  ): Promise<Blob> {
    return this.patientAttachmentRepository.downloadAttachmentDocument(
      patientId,
      attachmentId,
    );
  }

  async removeAttachment(
    patientId: string,
    attachmentId: string,
  ): Promise<void> {
    return this.patientAttachmentRepository.removeAttachment(
      patientId,
      attachmentId,
    );
  }

  /** "Pase de consulta" — mismo código que resuelve la historia clínica de transferencia. */
  async listAttachmentsByConsultationCode(
    code: string,
  ): Promise<PatientAttachment[]> {
    return this.patientAttachmentRepository.listAttachmentsByConsultationCode(
      code,
    );
  }
}
