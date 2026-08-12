import type { Patient } from '../../../domain/entities/patient.entity';
import {
  canNotifyHealthPost,
  hasPostNotice,
  isPostNoticeOverdue,
} from '../../../domain/rules/referral.rules';
import { timeToEighteen } from '../../../domain/rules/transition.rules';
import { BellIcon, PinIcon } from '../icons';
import {
  NoticeDetail,
  ReferralAlertBadge,
  ReferralStageChip,
} from './notice-state';

/**
 * La bandeja del área: quiénes están por cumplir 18 y a qué posta hay que
 * avisarle.
 *
 * Es otra tabla y no la del especialista a propósito. El médico mira
 * diagnósticos y resúmenes; el área mira **plazos y postas** — a qué centro
 * le toca, cuántos días hace que sabe, y si el médico ya vino a reclamar. Las
 * dos listas son los mismos pacientes vistos por dos oficinas que hacen
 * trabajos distintos.
 */
export function NoticeQueueTable({
  patients,
  onNotify,
  notifyingId,
  canNotify,
}: Readonly<{
  patients: readonly Patient[];
  onNotify: (patient: Patient) => void;
  /** Paciente con un aviso en vuelo, para deshabilitar solo ese botón. */
  notifyingId: string | null;
  /** El usuario tiene HEALTH_POST_NOTIFY. */
  canNotify: boolean;
}>) {
  return (
    <div className="tw">
      <table className="dt">
        <thead>
          <tr>
            <th style={{ paddingLeft: 18 }}>Paciente</th>
            <th>Cumple 18 en</th>
            <th>Especialidad</th>
            <th>Posta que le toca</th>
            <th>Aviso</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {patients.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="empty-s">
                  Nadie en esta bandeja: ningún paciente cumple 18 en los
                  próximos 2 meses.
                </div>
              </td>
            </tr>
          ) : (
            patients.map((patient) => (
              <NoticeRow
                key={patient.id}
                patient={patient}
                onNotify={onNotify}
                isNotifying={notifyingId === patient.id}
                canNotify={canNotify}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function NoticeRow({
  patient,
  onNotify,
  isNotifying,
  canNotify,
}: Readonly<{
  patient: Patient;
  onNotify: (patient: Patient) => void;
  isNotifying: boolean;
  canNotify: boolean;
}>) {
  const time = timeToEighteen(patient);
  const overdue = isPostNoticeOverdue(patient);
  const notified = hasPostNotice(patient);

  return (
    <tr className={overdue ? 'u-crit' : notified ? '' : 'u-warn'}>
      <td className="stripe">
        <div className="ini">{patient.initials}</div>
        <div className="hc">
          {patient.medicalRecord} · DNI {patient.dni}
        </div>
      </td>
      <td>
        <div className={`ttl ${time.urgency ?? ''}`}>
          <b>{time.text}</b>
        </div>
        <div className="hc">{patient.age}</div>
      </td>
      <td>
        <span className="mini">
          {patient.specialty.replace(' pediátrica', '')}
        </span>
      </td>
      <td>
        {patient.healthPost ? (
          <>
            <div className="dest">
              <PinIcon />
              {patient.healthPost.name}
            </div>
            <span className="mini">
              {patient.district} · a {patient.healthPost.distanceKm} km
            </span>
          </>
        ) : (
          <span className="mini">Sin posta asignada</span>
        )}
      </td>
      <td>
        <div className="stackv-s">
          <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
            <ReferralStageChip patient={patient} />
            <ReferralAlertBadge patient={patient} />
          </div>
          <NoticeDetail patient={patient} />
        </div>
      </td>
      <td>
        <div className="rowact">
          {canNotify && canNotifyHealthPost(patient) && (
            <button
              type="button"
              className={`btn btn-sm ${notified ? '' : 'btn-pri'}`}
              disabled={isNotifying}
              onClick={() => onNotify(patient)}
              title={`Avisarle a ${patient.healthPost?.name} que vaya tramitando la cita`}
            >
              {isNotifying ? <i className="spin" /> : <BellIcon />}
              {isNotifying
                ? 'Avisando…'
                : notified
                  ? 'Volver a avisar'
                  : 'Avisar a la posta'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
