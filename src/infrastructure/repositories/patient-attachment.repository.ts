import type { PatientAttachment } from '../../domain/entities/patient-attachment.entity';
import type { PatientAttachmentRepositoryPort } from '../../application/ports/patient-attachment-repository.port';
import { apiClient } from '../http/api-client';

function attachmentsUrl(patientId: string): string {
  return `/patients/${encodeURIComponent(patientId)}/attachments`;
}

/** Implementación real de PatientAttachmentRepositoryPort contra la API de iCode-back. */
class HttpPatientAttachmentRepository
  implements PatientAttachmentRepositoryPort
{
  async listAttachments(patientId: string): Promise<PatientAttachment[]> {
    const { data } = await apiClient.get<PatientAttachment[]>(
      attachmentsUrl(patientId),
    );
    return data;
  }

  async uploadAttachment(
    patientId: string,
    file: File,
  ): Promise<PatientAttachment> {
    const body = new FormData();
    body.append('file', file);
    const { data } = await apiClient.post<PatientAttachment>(
      attachmentsUrl(patientId),
      body,
    );
    return data;
  }

  async downloadAttachmentDocument(
    patientId: string,
    attachmentId: string,
  ): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(
      `${attachmentsUrl(patientId)}/${encodeURIComponent(attachmentId)}/document`,
      { responseType: 'blob' },
    );
    return data;
  }
}

export const patientAttachmentRepository =
  new HttpPatientAttachmentRepository();
