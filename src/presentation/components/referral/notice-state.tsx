import type { Patient } from '../../../domain/entities/patient.entity';
import {
  REFERRAL_STAGE_LABELS,
  hasPostNotice,
  isPostNoticeOverdue,
  lastPostNoticeAt,
  referralStage,
} from '../../../domain/rules/referral.rules';
import { formatShortDate } from '../../../common/utils/format-date';

/**
 * En qué anda el trabajo del área con este paciente: si ya le avisó a la
 * posta, si se pasó de plazo, si la carta salió.
 *
 * Lo miran los dos lados —el área para saber qué le falta, el especialista
 * para saber si puede reclamar— y por eso es un componente y no un pedazo de
 * JSX dentro de una tabla.
 */
const CHIP_CLASS: Record<string, string> = {
  NOT_DUE: 'chip none',
  NOTICE_DUE: 'chip review',
  NOTICE_SENT: 'chip ok',
  LETTER_DUE: 'chip review',
  LETTER_UPLOADED: 'chip draft',
  LETTER_SENT: 'chip ok',
};

export function ReferralStageChip({ patient }: Readonly<{ patient: Patient }>) {
  const stage = referralStage(patient);
  const overdue = isPostNoticeOverdue(patient);

  return (
    <span
      className={`${CHIP_CLASS[stage]} ${overdue ? 'late' : ''}`}
      title={
        overdue
          ? 'Le queda un mes o menos y la posta todavía no se enteró'
          : undefined
      }
    >
      {stage !== 'NOT_DUE' && <i className="dot" />}
      {overdue ? 'Aviso vencido' : REFERRAL_STAGE_LABELS[stage]}
    </span>
  );
}

/**
 * La línea que acompaña al chip: cuándo se avisó y quién, o por qué todavía
 * no. Un estado sin fecha no le sirve a nadie — "avisado" hace tres días y
 * "avisado" hace un mes son dos situaciones distintas.
 */
export function NoticeDetail({ patient }: Readonly<{ patient: Patient }>) {
  const noticeAt = lastPostNoticeAt(patient);

  if (hasPostNotice(patient) && noticeAt) {
    const count = patient.postNotices.length;
    return (
      <span className="mini">
        {formatShortDate(noticeAt)}
        {patient.daysWaitingOnPost !== null &&
          ` · hace ${patient.daysWaitingOnPost} días`}
        {count > 1 && ` · ${count} avisos`}
      </span>
    );
  }

  return (
    <span className="mini">
      {patient.healthPost
        ? 'La posta todavía no sabe nada'
        : 'Sin posta asignada'}
    </span>
  );
}

/** Cuántas veces el especialista ya reclamó, para que el área lo vea. */
export function ReferralAlertBadge({
  patient,
}: Readonly<{ patient: Patient }>) {
  const alerts = patient.referralAlerts;
  if (alerts.length === 0) {
    return null;
  }

  const last = alerts.at(-1);
  return (
    <span
      className="chip crit"
      title={`Último reclamo: ${last?.sentBy} · ${last ? formatShortDate(last.sentAt) : ''}`}
    >
      <i className="dot" />
      {alerts.length === 1 ? 'Reclamado' : `${alerts.length} reclamos`}
    </span>
  );
}
