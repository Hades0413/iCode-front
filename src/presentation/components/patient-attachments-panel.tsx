import { useState } from 'react';
import type { PatientAttachment } from '../../domain/entities/patient-attachment.entity';
import { PERMISSIONS } from '../../domain/rules/permissions';
import {
  attachmentKind,
  type AttachmentKind,
} from '../../domain/rules/patient-attachment.rules';
import { formatShortDate } from '../../common/utils/format-date';
import { formatFileSize } from '../../common/utils/format-file-size';
import { AttachmentKindIcon } from './attachment-kind-icon';
import { DownloadIcon } from './icons';
import { FilePicker } from './ui/file-picker';
import { Notice } from './ui/notice';
import { Section } from './ui/section';
import { LoadingRows } from './ui/states';
import type { LoadError } from '../hooks/use-async-resource';
import styles from './patient-attachments-panel.module.css';

const ACCEPTED_EXTENSIONS =
  '.jpg,.jpeg,.png,.pdf,.doc,.docx,.mp4,.mov,.webm';

const KIND_ICON_CLASS: Record<AttachmentKind, string> = {
  doc: styles['patient-attachments-panel-item-icon-doc'],
  image: styles['patient-attachments-panel-item-icon-image'],
  video: styles['patient-attachments-panel-item-icon-video'],
};

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
  onRemove,
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
  /** Devuelve si salió bien, para saber si cerrar la confirmación. */
  onRemove: (attachment: PatientAttachment) => Promise<boolean>;
  onRetry: () => void;
}>) {
  const [file, setFile] = useState<File | null>(null);
  /** El adjunto con el "¿Quitar?" armado, o en vuelo. Uno a la vez. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function remove(attachment: PatientAttachment) {
    setRemovingId(attachment.id);
    try {
      await onRemove(attachment);
    } finally {
      setRemovingId(null);
      setConfirmingId(null);
    }
  }

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
                    <div className="row" style={{ gap: 7 }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onDownload(attachment)}
                      >
                        <DownloadIcon /> Descargar
                      </button>
                      {canWrite &&
                        (confirmingId === attachment.id ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm"
                              disabled={removingId !== null}
                              onClick={() => void remove(attachment)}
                            >
                              {removingId === attachment.id && (
                                <i className="spin" />
                              )}
                              {removingId === attachment.id
                                ? 'Quitando…'
                                : '¿Quitar?'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              disabled={removingId !== null}
                              onClick={() => setConfirmingId(null)}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setConfirmingId(attachment.id)}
                          >
                            Quitar
                          </button>
                        ))}
                    </div>
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
