/**
 * Qué tipo de archivo es un adjunto ("exámenes y documentos"), a partir de
 * su extensión — el recurso no guarda un campo `kind` propio. Vive en
 * domain/rules y no en un componente porque lo usan dos pantallas: la ficha
 * del paciente (PatientAttachmentsPanel) y el "pase de consulta" del médico
 * de adultos (ConsultationPage) — las dos tienen que clasificar un mismo
 * archivo de la misma forma.
 */

export type AttachmentKind = 'doc' | 'image' | 'video';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);

/** Documento (PDF/Word) es el valor por defecto: es lo más común del caso. */
export function attachmentKind(fileName: string): AttachmentKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return 'doc';
}

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  doc: 'Documento',
  image: 'Imagen',
  video: 'Video',
};
