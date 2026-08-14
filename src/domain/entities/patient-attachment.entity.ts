/**
 * "Exámenes y documentos" de la ficha del paciente — imágenes, PDF, Word o
 * video sueltos del caso (radiografías, informes de laboratorio, videos de
 * una evaluación). Muchos por paciente, a diferencia de la historia
 * clínica o la carta de contrarreferencia (esos son 1:1): acá no hay un
 * documento "vigente", son todos los que se fueron sumando.
 */
export interface PatientAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  /** ISO 8601. */
  uploadedAt: string;
}
