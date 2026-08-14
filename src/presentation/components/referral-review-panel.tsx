import { useState } from 'react';
import type { Patient } from '../../domain/entities/patient.entity';
import type { ReferralReview } from '../../domain/entities/referral-review.entity';
import {
  REFERRAL_REVIEW_STATUS_LABELS,
  canReviewReferral,
} from '../../domain/rules/referral-review.rules';
import { PERMISSIONS } from '../../domain/rules/permissions';
import { formatShortDate } from '../../common/utils/format-date';
import { CheckIcon, DownloadIcon, PaperclipIcon, WarnIcon } from './icons';
import { FilePicker } from './ui/file-picker';
import { Notice, type NoticeTone } from './ui/notice';
import { Section } from './ui/section';
import { LoadingRows } from './ui/states';
import type { LoadError } from '../hooks/use-async-resource';

/** Qué acción de revisión está en vuelo. */
export type ReferralReviewBusy = 'accept' | 'reject' | 'observe' | null;

const TONE_BY_STATUS: Record<ReferralReview['status'], NoticeTone> = {
  ACCEPTED: 'ok',
  REJECTED: 'crit',
  OBSERVED: 'warn',
};

/**
 * "Referencia": qué dijo el destino (posta u hospital) sobre la historia
 * clínica de transferencia ya firmada. Solo tiene sentido después de la
 * firma — antes de eso, la sección explica por qué todavía no aplica.
 */
export function ReferralReviewPanel({
  patient,
  review,
  isLoading,
  error,
  canManage,
  busy,
  onAccept,
  onReject,
  onObserve,
  onViewDocument,
  onRetry,
}: Readonly<{
  patient: Patient;
  review: ReferralReview | null;
  isLoading: boolean;
  error: LoadError | null;
  /** El usuario tiene REFERRAL_REVIEW_MANAGE. */
  canManage: boolean;
  busy: ReferralReviewBusy;
  onAccept: () => void;
  onReject: (notes: string) => void;
  onObserve: (file: File, notes: string | null) => void;
  onViewDocument: () => void;
  onRetry: () => void;
}>) {
  const [mode, setMode] = useState<'reject' | 'observe' | null>(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  function closeForm() {
    setMode(null);
    setNotes('');
    setFile(null);
  }

  return (
    <Section
      title="Referencia"
      aside={REFERRAL_REVIEW_STATUS_LABELS[review?.status ?? 'NONE']}
    >
      {isLoading ? (
        <LoadingRows rows={2} label="Cargando la referencia" />
      ) : error ? (
        <>
          <Notice tone="crit" className="wrapmax">
            <b>No se pudo cargar la referencia.</b> {error.message}
          </Notice>
          <div className="row" style={{ paddingTop: 14 }}>
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              Reintentar
            </button>
          </div>
        </>
      ) : !canReviewReferral(patient) ? (
        <Notice tone="locked" className="wrapmax">
          Todavía no aplica: el destino recién puede revisar la historia
          clínica una vez que esté firmada.
        </Notice>
      ) : (
        <div className="stackv">
          {review ? (
            <Notice tone={TONE_BY_STATUS[review.status]} className="wrapmax">
              <b>{REFERRAL_REVIEW_STATUS_LABELS[review.status]}</b> por{' '}
              {review.reviewedBy} el {formatShortDate(review.reviewedAt)}.
              {review.notes && <> {review.notes}</>}
              {review.fileName && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={onViewDocument}
                  >
                    <DownloadIcon /> Ver PDF
                  </button>
                </>
              )}
            </Notice>
          ) : (
            <Notice className="wrapmax">
              El destino todavía no revisó la historia clínica de{' '}
              {patient.initials}.
            </Notice>
          )}

          {!canManage ? (
            <Notice tone="locked" className="wrapmax">
              Solo el área de Referencias puede registrar la respuesta del
              destino: te falta el permiso{' '}
              <span className="mono">{PERMISSIONS.referralReviewManage}</span>.
            </Notice>
          ) : mode === 'reject' ? (
            <div className="stackv">
              <textarea
                className="ta"
                rows={3}
                placeholder="Motivo del rechazo"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={busy !== null}
              />
              <div className="row" style={{ gap: 9 }}>
                <button
                  type="button"
                  className="btn btn-pri"
                  disabled={busy !== null || notes.trim() === ''}
                  onClick={() => {
                    onReject(notes.trim());
                    closeForm();
                  }}
                >
                  {busy === 'reject' ? <i className="spin" /> : null}
                  {busy === 'reject' ? 'Rechazando…' : 'Confirmar rechazo'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy !== null}
                  onClick={closeForm}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : mode === 'observe' ? (
            <div className="stackv">
              <FilePicker
                label="Elegir el PDF"
                accept=".pdf"
                hint="PDF con lo que falta o hay que corregir"
                file={file}
                onSelect={setFile}
                disabled={busy !== null}
              />
              <textarea
                className="ta"
                rows={2}
                placeholder="Notas adicionales (opcional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={busy !== null}
              />
              <div className="row" style={{ gap: 9 }}>
                <button
                  type="button"
                  className="btn btn-pri"
                  disabled={busy !== null || !file}
                  onClick={() => {
                    if (file) onObserve(file, notes.trim() || null);
                    closeForm();
                  }}
                >
                  {busy === 'observe' ? <i className="spin" /> : null}
                  {busy === 'observe' ? 'Enviando…' : 'Confirmar observación'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy !== null}
                  onClick={closeForm}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-pri"
                disabled={busy !== null}
                onClick={onAccept}
              >
                {busy === 'accept' ? <i className="spin" /> : <CheckIcon />}
                {busy === 'accept' ? 'Aceptando…' : 'Aceptar caso'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={() => setMode('reject')}
              >
                <WarnIcon /> Rechazar
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={() => setMode('observe')}
              >
                <PaperclipIcon /> Observar (adjuntar PDF)
              </button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
