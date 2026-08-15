import { useState } from 'react';
import type { PatientAttachment } from '../../domain/entities/patient-attachment.entity';
import { PERMISSIONS } from '../../domain/rules/permissions';
import { formatShortDate } from '../../common/utils/format-date';
import { formatFileSize } from '../../common/utils/format-file-size';
import { CameraIcon, DocIcon, DownloadIcon, VideoIcon } from './icons';
import { FilePicker } from './ui/file-picker';
import { Notice } from './ui/notice';
import { Section } from './ui/section';
import { LoadingRows } from './ui/states';
import type { LoadError } from '../hooks/use-async-resource';
import styles from './patient-attachments-panel.module.css';

const ACCEPTED_EXTENSIONS =
  '.jpg,.jpeg,.png,.pdf,.doc,.docx,.mp4,.mov,.webm';

type AttachmentKind = 'doc' | 'image' | 'video';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);

/** Documento (PDF/Word) es el valor por defecto: es lo más común del caso. */
function attachmentKind(fileName: string): AttachmentKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return 'doc';
}

const KIND_ICON_CLASS: Record<AttachmentKind, string> = {
  doc: styles['patient-attachments-panel-item-icon-doc'],
  image: styles['patient-attachments-panel-item-icon-image'],
  video: styles['patient-attachments-panel-item-icon-video'],
};

function AttachmentKindIcon({ kind }: Readonly<{ kind: AttachmentKind }>) {
  if (kind === 'image') return <CameraIcon />;
  if (kind === 'video') return <VideoIcon />;
  return <DocIcon />;
}

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
            <p className="mini wrapmax">
              Nada adjunto todavía. Los exámenes de laboratorio, informes e
              imágenes que subas aquí viajan con el caso al hospital de
              adultos.
            </p>
          ) : (
            <ul className={styles['patient-attachments-panel-list']}>
              {attachments.map((attachment) => {
                const kind = attachmentKind(attachment.fileName);
                return (
                  <li
                    key={attachment.id}
                    className={styles['patient-attachments-panel-item']}
                  >
                    <span
                      className={`${styles['patient-attachments-panel-item-icon']} ${KIND_ICON_CLASS[kind]}`}
                      aria-hidden="true"
                    >
                      <AttachmentKindIcon kind={kind} />
                    </span>
                    <div className={styles['patient-attachments-panel-item-text']}>
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
                );
              })}
            </ul>
          )}

          {canWrite ? (
            <div className={styles['patient-attachments-panel-upload']}>
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
                {isUploading && <i className="spin" />}
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
