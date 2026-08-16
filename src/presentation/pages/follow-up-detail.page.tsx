import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientService, referralService } from '../../composition-root';
import type { Patient } from '../../domain/entities/patient.entity';
import { PERMISSIONS, hasPermission } from '../../domain/rules/permissions';
import {
  REFERRAL_ALERT_LABELS,
  pendingReferralAction,
} from '../../domain/rules/referral.rules';
import {
  followUpAppointment,
  treatmentStatus,
} from '../../domain/rules/transition.rules';
import {
  formatLongDate,
  formatShortDate,
} from '../../common/utils/format-date';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { BellIcon, PinIcon } from '../components/icons';
import { SummaryPreview } from '../components/summary-preview';
import { Toasts } from '../components/toasts';
import { Notice } from '../components/ui/notice';
import { Section } from '../components/ui/section';
import { useAsyncResource } from '../hooks/use-async-resource';
import { useAuth } from '../hooks/use-auth';
import { useToasts } from '../hooks/use-toasts';
import styles from './follow-up-detail.page.module.css';

const NO_PATIENTS: Patient[] = [];

/** "5 de junio de 2026" a partir del ISO del cumpleaños. */
function longDate(iso: string): string {
  const [date] = iso.split('T');
  const [year, month, day] = date.split('-').map(Number);
  return formatLongDate(new Date(year, month - 1, day));
}

/**
 * La ficha de un paciente que **ya cumplió 18**: el resumen de su caso, la
 * fecha del cumpleaños, cómo terminó su cita y su historia clínica en modo
 * lectura.
 *
 * Es otra ficha que la de tutela a propósito. Aquel es un caso que el médico
 * todavía trabaja (generar, editar, firmar); este ya cruzó — lo que queda es
 * mirar cómo le fue y, si su cita se perdió y nadie la reprogramó, empujar al
 * área de Referencias para que la consiga. Una sola ficha con las dos vidas
 * terminaría llena de botones que casi nunca aplican.
 */
export function FollowUpDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, push } = useToasts();
  const [showSummary, setShowSummary] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);

  const load = useCallback(() => patientService.getPostTransition(), []);
  const { data, isLoading, setData } = useAsyncResource(
    load,
    NO_PATIENTS,
    'No se pudo cargar el seguimiento.',
  );

  const patient = data.find((candidate) => candidate.id === patientId);
  const canAlertArea = hasPermission(user, PERMISSIONS.referralAreaNotify);

  async function alertArea(current: Patient) {
    setIsAlerting(true);
    try {
      const updated = await referralService.alertReferralArea(current);
      setData(data.map((row) => (row.id === updated.id ? updated : row)));
      push({
        tone: 'ok',
        title: 'Aviso enviado al área de referencias',
        detail: `${current.initials} · ellos gestionan la nueva cita con la posta.`,
      });
    } catch (error) {
      push({
        tone: 'err',
        title: 'No se pudo avisar al área',
        detail: getApiErrorMessage(error),
      });
    } finally {
      setIsAlerting(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles['follow-up-detail-main']}>
        <div className={styles['follow-up-detail-page-body']}>
          <div className="empty-s">Cargando…</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className={`${styles['follow-up-detail-main']} enter`}>
        <div className={styles['follow-up-detail-page-body']}>
          <div
            className={styles['follow-up-detail-crumb']}
            style={{ paddingTop: 24 }}
          >
            <button type="button" onClick={() => navigate('/seguimiento')}>
              Referencias aceptadas
            </button>
          </div>
          <div className="empty-s">Ese paciente no está en tu seguimiento.</div>
        </div>
      </div>
    );
  }

  const treatment = treatmentStatus(patient);
  const appointment = followUpAppointment(patient);
  const pending = pendingReferralAction(patient);
  const hospital =
    patient.appointment?.hospital ?? patient.hospitalReferral?.hospital ?? null;

  return (
    <div className={`${styles['follow-up-detail-main']} enter`}>
      <div className={styles['follow-up-detail-page-h']}>
        <div className={styles['follow-up-detail-crumb']}>
          <button type="button" onClick={() => navigate('/seguimiento')}>
            Referencias aceptadas
          </button>
          <span>/</span>
          <span>{patient.initials}</span>
        </div>
        <h1 className={styles['follow-up-detail-page-t']}>
          {patient.initials}
        </h1>
        <div className={styles['follow-up-detail-page-sub']}>
          <span className="mono">{patient.medicalRecord}</span>
          <span>DNI {patient.dni}</span>
          <span>{patient.age}</span>
          {patient.turnedEighteenAt && (
            <span>
              cumplió 18 el <b>{longDate(patient.turnedEighteenAt)}</b>
            </span>
          )}
          <span>{patient.specialty.replace(' pediátrica', '')}</span>
        </div>
      </div>

      <div className={styles['follow-up-detail-page-body']}>
        {/* El resumen del caso: qué tiene, quién lo siguió y dónde está hoy. */}
        <Section title="Resumen">
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <span className={`chip ${CHIP_BY_TONE[treatment.tone]}`}>
              <i className="dot" />
              {treatment.label}
            </span>
          </div>
          <p style={{ paddingTop: 16, maxWidth: 720 }}>{patient.diagnosis}</p>
          <p className="mini" style={{ paddingTop: 8 }}>
            Lo siguió {patient.attendingDoctor} en el INSN
            {hospital && (
              <>
                {' '}
                · hoy su control es en <b>{hospital}</b>
                {patient.healthPost &&
                  ` (lo derivó ${patient.healthPost.name})`}
              </>
            )}
          </p>
        </Section>

        {/* La cita: asistió, se la reprogramaron, o quedó en el aire. */}
        <Section title="Su cita en el hospital de adultos">
          {appointment.kind === 'ATTENDED' && patient.appointment && (
            <Notice tone="ok" className="wrapmax">
              <b>
                Asistió a su cita del{' '}
                {formatShortDate(patient.appointment.date)}
              </b>{' '}
              en {patient.appointment.hospital} (
              {patient.appointment.specialist}). Sigue en control del otro lado:
              el puente funcionó.
            </Notice>
          )}

          {appointment.kind === 'RESCHEDULED' && patient.appointment && (
            <Notice tone="warn" className="wrapmax">
              <b>
                Su cita fue reprogramada para el{' '}
                {formatShortDate(patient.appointment.date)}
              </b>{' '}
              en {patient.appointment.hospital}, gestionada por{' '}
              {patient.appointment.managedBy}. Perdió citas antes: conviene no
              perderle el rastro hasta que asista.
            </Notice>
          )}

          {appointment.kind === 'MISSED' && (
            <div className="stackv">
              <Notice tone="crit" className="wrapmax">
                <b>
                  No asistió
                  {patient.appointment &&
                    ` a su cita del ${formatShortDate(patient.appointment.date)}`}{' '}
                  y nadie reprogramó una nueva.
                </b>{' '}
                Está sin control desde entonces — es exactamente el caso que
                este panel existe para no perder.
              </Notice>

              {/* El CTA: la nueva cita la consigue el área con la posta; lo
                  que puede hacer el médico es empujar, con registro. La razón
                  no la elige esta pantalla — es lo que el área efectivamente
                  debe primero (si la carta nunca salió, eso va antes). */}
              {canAlertArea && pending !== null && (
                <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-pri"
                    disabled={isAlerting}
                    onClick={() => void alertArea(patient)}
                  >
                    {isAlerting ? <i className="spin" /> : <BellIcon />}
                    {isAlerting
                      ? 'Avisando…'
                      : 'Notificar al área de referencias'}
                  </button>
                  <span className="mini wrapmax">
                    {REFERRAL_ALERT_LABELS[pending]}. El aviso queda registrado
                    con tu nombre y lo ven en su bandeja.
                  </span>
                </div>
              )}

              {patient.referralAlerts.length > 0 && (
                <p className="mini">
                  Ya se le reclamó {patient.referralAlerts.length}{' '}
                  {patient.referralAlerts.length === 1 ? 'vez' : 'veces'} ·
                  último el{' '}
                  {formatShortDate(patient.referralAlerts.at(-1)?.sentAt ?? '')}
                </p>
              )}
            </div>
          )}

          {appointment.kind === 'UNCONFIRMED' && (
            <Notice tone="warn" className="wrapmax">
              <b>Su cita todavía no fue confirmada.</b>{' '}
              {patient.healthPost
                ? `${patient.healthPost.name} está gestionándola con el hospital de adultos.`
                : 'Su posta todavía no la gestiona.'}
            </Notice>
          )}

          {patient.appointment && appointment.kind !== 'MISSED' && (
            <p className="mini" style={{ paddingTop: 12 }}>
              <PinIcon /> {patient.appointment.hospital} ·{' '}
              {patient.appointment.reason} · la gestionó{' '}
              {patient.appointment.managedBy}
            </p>
          )}
        </Section>

        {/* Las 2 hojas, en modo lectura: es una constancia, no un borrador. */}
        <Section
          title="Historia clínica de transferencia"
          aside={showSummary ? 'vista previa' : undefined}
        >
          {showSummary ? (
            <div className="stackv">
              <SummaryPreview patientId={patient.id} />
              <div className="row">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowSummary(false)}
                >
                  Cerrar la vista previa
                </button>
              </div>
            </div>
          ) : (
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowSummary(true)}
              >
                Previsualizar historia clínica
              </button>
              <span className="mini wrapmax">
                El documento que viajó con {patient.initials} a su posta y al
                hospital de adultos. Ya está firmado: solo se mira.
              </span>
            </div>
          )}
        </Section>
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}

const CHIP_BY_TONE = { ok: 'ok', warn: 'draft', crit: 'crit' } as const;
