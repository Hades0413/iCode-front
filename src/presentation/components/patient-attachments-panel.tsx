import { useState } from 'react';
import type { PatientAttachment } from '../../domain/entities/patient-attachment.entity';
import { PERMISSIONS } from '../../domain/rules/permissions';
import { formatShortDate } from '../../common/utils/format-date';
import { formatFileSize } from '../../common/utils/format-file-size';
import { DownloadIcon, PaperclipIcon } from './icons';
import { FilePicker } from './ui/file-picker';
import { Notice } from './ui/notice';
import { Section } from './ui/section';
import { EmptyState, LoadingRows } from './ui/states';
import type { LoadError } from '../hooks/use-async-resource';

const ACCEPTED_EXTENSIONS =
  '.jpg,.jpeg,.png,.pdf,.doc,.docx,.mp4,.mov,.webm';

/**
 * "Exámenes y documentos" de la ficha: imágenes, PDF, Word o video sueltos
 * del caso — aparte de la historia clínica y la carta de contrarreferencia,
 * que tienen su propio ciclo de vida.
 */
export function PatientAttachmentsPanel({
  attachments,
  isLoading,
  error,
  canWrite,
  isUploading,
  onUpload,
  onDownload,
  onRetry,
}: Readonly<{
  attachments: PatientAttachment[];
  isLoading: boolean;
  error: LoadError | null;
  /** El usuario tiene PATIENTS_WRITE. */
  canWrite: boolean;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDownload: (attachment: PatientAttachment) => void;
  onRetry: () => void;
}>) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <Section
      title="Exámenes y documentos"
      aside={attachments.length > 0 ? `${attachments.length} adjuntos` : undefined}
    >
      {isLoading ? (
        <LoadingRows rows={3} label="Cargando adjuntos" />
      ) : error ? (
        <>
          <Notice tone="crit" className="wrapmax">
            <b>No se pudieron cargar los adjuntos.</b> {error.message}
          </Notice>
          <div className="row" style={{ paddingTop: 14 }}>
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              Reintentar
            </button>
          </div>
        </>
      ) : (
        <div className="stackv">
          {attachments.length === 0 ? (
            <EmptyState>Todavía no se adjuntó ningún examen o documento.</EmptyState>
          ) : (
            <ul className="attlist">
              {attachments.map((attachment) => (
                <li key={attachment.id} className="attitem">
                  <PaperclipIcon />
                  <div className="attitem-t">
                    <b>{attachment.fileName}</b>
                    <span className="mini">
                      {formatFileSize(attachment.fileSize)} · subido por{' '}
                      {attachment.uploadedBy} el{' '}
                      {formatShortDate(attachment.uploadedAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onDownload(attachment)}
                  >
                    <DownloadIcon /> Descargar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {canWrite ? (
            <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FilePicker
                label="Elegir archivo"
                accept={ACCEPTED_EXTENSIONS}
                hint="Imagen, PDF, Word o video, hasta 25 MB"
                file={file}
                onSelect={setFile}
                disabled={isUploading}
              />
              <button
                type="button"
                className="btn btn-pri"
                disabled={isUploading || !file}
                onClick={() => {
                  if (file) {
                    onUpload(file);
                    setFile(null);
                  }
                }}
              >
                {isUploading ? <i className="spin" /> : <PaperclipIcon />}
                {isUploading ? 'Adjuntando…' : 'Adjuntar'}
              </button>
            </div>
          ) : (
            <Notice tone="locked" className="wrapmax">
              Tu usuario no puede adjuntar archivos: te falta el permiso{' '}
              <span className="mono">{PERMISSIONS.patientsWrite}</span>.
            </Notice>
          )}
        </div>
      )}
    </Section>
  );
}
