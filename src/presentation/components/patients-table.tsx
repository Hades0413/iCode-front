import type { Patient } from '../../domain/entities/patient.entity';
import type { CohortSort } from '../../domain/rules/cohort.rules';
import { REFERRAL_REVIEW_STATUS_LABELS } from '../../domain/rules/referral-review.rules';
import {
  rowUrgency,
  timeToEighteen,
} from '../../domain/rules/transition.rules';
import { ChevronIcon, DownloadIcon, TemplateIcon } from './icons';
import styles from './patients-table.module.css';

const REFERRAL_CHIP_CLASS: Record<Patient['referralReviewStatus'], string> = {
  NONE: 'chip none',
  ACCEPTED: 'chip ok',
  OBSERVED: 'chip review',
  REJECTED: 'chip crit',
};

const URGENT_ROW_CLASS: Record<'crit' | 'warn', string> = {
  crit: styles['patients-table-urgent-critical'],
  warn: styles['patients-table-urgent-warning'],
};

const TIME_LEFT_URGENCY_CLASS: Record<'crit' | 'warn', string> = {
  crit: styles['patients-table-time-left-critical'],
  warn: styles['patients-table-time-left-warning'],
};

/**
 * La tabla densa del tablero. Cada fila es un paciente y el filete de color
 * de la izquierda es la urgencia — que no es lo mismo que el tiempo
 * restante: a alguien ya derivado no le urge el cumpleaños, le urge que la
 * posta se entere (ver rowUrgency).
 *
 * Las columnas son lo que el médico decide mirando la lista: quién es, cuánto
 * falta, su diagnóstico, en qué está su **historia clínica** (abrirla para
 * generarla o revisarla) y qué dijo el destino sobre ella ("Estado
 * referencia": pendiente, aceptada, observada o rechazada).
 * Todo lo demás vive en la ficha, que es donde se mira un caso puntual.
 */
export function PatientsTable({
  patients,
  sort,
  onSortChange,
  onOpen,
  onViewReferralReviewDocument,
}: Readonly<{
  patients: readonly Patient[];
  sort: CohortSort;
  onSortChange: (sort: CohortSort) => void;
  onOpen: (patient: Patient) => void;
  /** "Ver PDF" de una observación, directo desde la fila. */
  onViewReferralReviewDocument: (patient: Patient) => void;
}>) {
  return (
    <div className={styles['patients-table-wrapper']}>
      <table className={styles['patients-table']}>
        <thead>
          <tr>
            <th style={{ paddingLeft: 18 }}>Paciente</th>
            <th className="s">
              <button type="button" onClick={() => onSortChange('meses')}>
                Cumple 18 en
                <span className={styles['patients-table-sort-arrow']}>
                  {sort === 'meses' ? '↑' : ''}
                </span>
              </button>
            </th>
            <th>Diagnóstico</th>
            <th>Resumen de historia clínica</th>
            <th>Estado referencia</th>
          </tr>
        </thead>
        <tbody>
          {patients.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="empty-s">
                  Ningún paciente coincide con este filtro.
                </div>
              </td>
            </tr>
          ) : (
            patients.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                onOpen={onOpen}
                onViewReferralReviewDocument={onViewReferralReviewDocument}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PatientRow({
  patient,
  onOpen,
  onViewReferralReviewDocument,
}: Readonly<{
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onViewReferralReviewDocument: (patient: Patient) => void;
}>) {
  const time = timeToEighteen(patient);
  const urgency = rowUrgency(patient);
  const isSummaryEmpty = patient.summaryStatus === 'NONE';

  return (
    <tr
      className={urgency ? URGENT_ROW_CLASS[urgency] : ''}
      onClick={() => onOpen(patient)}
    >
      <td className={styles['patients-table-stripe-cell']}>
        <div className={styles['patients-table-initials']}>
          {patient.initials}
        </div>
        {/* El DNI va a la vista porque es por lo que se busca: si tipeas uno
            y la fila no lo muestra, no hay forma de confirmar que es él. */}
        <div className={styles['patients-table-hint']}>
          {patient.medicalRecord} · DNI {patient.dni}
        </div>
      </td>
      <td>
        <div
          className={`${styles['patients-table-time-left']} ${
            time.urgency ? TIME_LEFT_URGENCY_CLASS[time.urgency] : ''
          }`}
        >
          {time.isCountdown ? (
            <b>{time.text}</b>
          ) : (
            <span className="dim">
              {time.prefix} {time.text}
            </span>
          )}
        </div>
        <div className={styles['patients-table-hint']}>{patient.age}</div>
      </td>
      <td>
        <div
          className={styles['patients-table-diagnosis']}
          title={patient.diagnosis}
        >
          {patient.diagnosis}
        </div>
      </td>
      <td>
        <div className={styles['patients-table-row-actions']}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(patient);
            }}
            title={`Abrir la historia clínica de transferencia de ${patient.initials}`}
          >
            {!isSummaryEmpty && <TemplateIcon />}
            {isSummaryEmpty ? 'Vacía' : 'Ver'}
          </button>
        </div>
      </td>
      <td>
        <div className={styles['patients-table-row-actions']}>
          {patient.referralReviewStatus === 'OBSERVED' ? (
            <button
              type="button"
              className={`${REFERRAL_CHIP_CLASS.OBSERVED} ${styles['patients-table-referral-observed']}`}
              onClick={(event) => {
                event.stopPropagation();
                onViewReferralReviewDocument(patient);
              }}
              title={`Ver el PDF de la observación de ${patient.initials}`}
            >
              <i className="dot" />
              {REFERRAL_REVIEW_STATUS_LABELS.OBSERVED} ·{' '}
              <span className={styles['patients-table-referral-pdf']}>
                <DownloadIcon /> Ver PDF
              </span>
            </button>
          ) : (
            <span
              className={REFERRAL_CHIP_CLASS[patient.referralReviewStatus]}
              title="Qué dijo el destino sobre la historia clínica ya firmada"
            >
              {patient.referralReviewStatus !== 'NONE' && (
                <i className="dot" />
              )}
              {REFERRAL_REVIEW_STATUS_LABELS[patient.referralReviewStatus]}
            </span>
          )}
          <button
            type="button"
            className={styles['patients-table-row-open-icon']}
            aria-label={`Abrir la ficha de ${patient.initials}`}
          >
            <ChevronIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}
