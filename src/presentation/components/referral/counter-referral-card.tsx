import { useState } from 'react';
import type { CounterReferral } from '../../../domain/entities/referral.entity';
import type { Patient } from '../../../domain/entities/patient.entity';
import type { CounterReferralUpload } from '../../../application/dto/counter-referral-upload.dto';
import {
  canSendCounterReferral,
  canUploadCounterReferral,
  counterReferralBlockedReason,
} from '../../../domain/rules/referral.rules';
import { formatShortDate } from '../../../common/utils/format-date';
import { formatFileSize } from '../../../common/utils/format-file-size';
import { CheckIcon, LockIcon, PinIcon, SignIcon } from '../icons';
import { Notice } from '../ui/notice';
import { FilePicker } from '../ui/file-picker';

/** Qué acción está en vuelo para este paciente. */
export type LetterBusy = 'upload' | 'send' | null;

/** La clase de la tarjeta según su estado: pinta el filete de la izquierda. */
const STATUS_CLASS: Record<string, string> = {
  NONE: 'st-none',
  UPLOADED: 'st-up',
  SENT: 'st-sent',
};

/**
 * La carta de contrarreferencia de un paciente.
 *
 * Cada tarjeta dice su estado dos veces sin que haya que leerla: el **filete
 * de color** a la izquierda (rojo = falta, ámbar = lista sin enviar, verde =
 * enviada) y el **chip** en la esquina. Y las enviadas se achican a una
 * línea: ya no piden nada de nadie, y ocupar lo mismo que un pendiente es
 * robarle atención al trabajo que sí falta.
 *
 * La regla que la tarjeta deja clarísima: **la carta no sale antes del
 * cumpleaños**. Cuando falta, no hay un botón deshabilitado sin explicación —
 * se dice cuántos meses faltan y por qué.
 */
export function CounterReferralCard({
  patient,
  letter,
  canManage,
  busy,
  onUpload,
  onSend,
}: Readonly<{
  patient: Patient;
  letter: CounterReferral | null;
  /** El usuario tiene COUNTER_REFERRAL_MANAGE. */
  canManage: boolean;
  busy: LetterBusy;
  onUpload: (upload: CounterReferralUpload) => Promise<boolean>;
  onSend: () => void;
}>) {
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState('');

  const blocked = counterReferralBlockedReason(patient);
  const status = patient.counterReferralStatus;
  const sent = letter?.status === 'SENT';

  async function submit() {
    if (!file) return;
    const uploaded = await onUpload({
      file,
      format: file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'WORD',
      code: code.trim() === '' ? null : code.trim(),
    });
    if (uploaded) {
      setFile(null);
      setCode('');
    }
  }

  /* La enviada es una constancia, no una tarea: una sola línea. */
  if (sent && letter) {
    return (
      <article className="crcard done st-sent">
        <div className="crcard-h">
          <div>
            <h3 className="crcard-t">{patient.initials}</h3>
            <p className="mini">
              <span className="mono">{patient.medicalRecord}</span> · DNI{' '}
              {patient.dni}
            </p>
          </div>
          <span className="chip ok">
            <i className="dot" />
            Enviada
          </span>
        </div>
        <p className="mini crcard-sent">
          <CheckIcon />
          {letter.fileName} · {formatFileSize(letter.fileSize)}
          {letter.code && ` · carta ${letter.code}`} · salió el{' '}
          {formatShortDate(letter.sentAt ?? '')} hacia{' '}
          {patient.healthPost?.name ?? 'su posta'} ({letter.sentBy})
        </p>
      </article>
    );
  }

  return (
    <article className={`crcard ${STATUS_CLASS[status]}`}>
      <header className="crcard-h">
        <div>
          <h3 className="crcard-t">{patient.initials}</h3>
          <p className="mini">
            <span className="mono">{patient.medicalRecord}</span> · DNI{' '}
            {patient.dni} · {patient.age} ·{' '}
            {patient.specialty.replace(' pediátrica', '')}
          </p>
        </div>
        <span className={`chip ${status === 'UPLOADED' ? 'draft' : 'crit'}`}>
          <i className="dot" />
          {status === 'UPLOADED' ? 'Lista, sin enviar' : 'Falta la carta'}
        </span>
      </header>

      <div className="crcard-post">
        <PinIcon />
        <span>
          Vuelve a <b>{patient.healthPost?.name ?? 'posta sin asignar'}</b>
          {patient.healthPost && ` · ${patient.healthPost.district}`}
        </span>
      </div>

      {blocked ? (
        // Todavía no cumple 18: se dice por qué, no se esconde el bloque.
        <Notice tone="locked">
          <b>Todavía no se puede.</b> {blocked}
        </Notice>
      ) : (
        <div className="stackv">
          {letter && (
            <Notice tone="warn">
              <b>Carta lista, sin enviar.</b> La subió {letter.uploadedBy} el{' '}
              {formatShortDate(letter.uploadedAt)} ·{' '}
              <span className="mini">
                {letter.fileName} · {formatFileSize(letter.fileSize)}
                {letter.code && ` · carta ${letter.code}`}
              </span>
            </Notice>
          )}

          {canManage ? (
            // La zona de trabajo va en su propio panel hundido: separa "lo
            // que hay que hacer" de los datos del paciente de arriba.
            <div className="crcard-work">
              <div className="crcard-form">
                <FilePicker
                  label={letter ? 'Reemplazar la carta' : 'Elegir la carta'}
                  accept=".pdf,.doc,.docx"
                  hint="Redáctala en el sistema externo · PDF o Word, hasta 10 MB"
                  file={file}
                  onSelect={setFile}
                  disabled={busy !== null}
                />
                <label className="fg crcard-code">
                  <span>N° de carta</span>
                  <input
                    className="inp"
                    value={code}
                    placeholder="CR-2026-00841"
                    disabled={busy !== null}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
              </div>

              <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${letter ? '' : 'btn-pri'}`}
                  disabled={file === null || busy !== null}
                  onClick={() => void submit()}
                >
                  {busy === 'upload' ? <i className="spin" /> : null}
                  {busy === 'upload' ? 'Subiendo…' : 'Subir la carta'}
                </button>

                {letter && (
                  <button
                    type="button"
                    className="btn btn-sm btn-pri"
                    disabled={!canSendCounterReferral(patient) || busy !== null}
                    onClick={onSend}
                    title={`Mandarle la carta a ${patient.healthPost?.name}`}
                  >
                    {busy === 'send' ? <i className="spin" /> : <SignIcon />}
                    {busy === 'send' ? 'Enviando…' : 'Enviar a la posta'}
                  </button>
                )}

                {canUploadCounterReferral(patient) && letter && (
                  <span className="mini">
                    Enviarla es definitivo: el caso vuelve a ser de la posta.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <Notice tone="locked">
              <LockIcon /> Solo el área de Referencias y Contrarreferencias
              puede subir y enviar esta carta.
            </Notice>
          )}
        </div>
      )}
    </article>
  );
}
