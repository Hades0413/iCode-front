import { useCallback, useMemo, useState } from 'react';
import { referralService } from '../../composition-root';
import type { Patient } from '../../domain/entities/patient.entity';
import { searchByDni } from '../../domain/rules/cohort.rules';
import { PERMISSIONS, hasPermission } from '../../domain/rules/permissions';
import {
  NOTICE_MONTHS_BEFORE_18,
  referralSummary,
} from '../../domain/rules/referral.rules';
import { formatLongDate } from '../../common/utils/format-date';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { CohortFilterBar } from '../components/cohort-filter-bar';
import { NoticeQueueTable } from '../components/referral/notice-queue-table';
import { Toasts } from '../components/toasts';
import { Notice } from '../components/ui/notice';
import { PageHeader, PageHeaderStat } from '../components/ui/page-header';
import { Pagination } from '../components/ui/pagination';
import { Section } from '../components/ui/section';
import { StatCard, StatGrid } from '../components/ui/stat-card';
import { LoadErrorState, LoadingRows } from '../components/ui/states';
import { useAuth } from '../hooks/use-auth';
import { usePagination } from '../hooks/use-pagination';
import { useQueue } from '../hooks/use-queue';
import { useToasts } from '../hooks/use-toasts';

const PAGE_SIZE = 10;

const isSamePatient = (a: Patient, b: Patient) => a.id === b.id;

/**
 * "Por avisar a la posta" — la bandeja del área de Referencias y
 * Contrarreferencias.
 *
 * Es la mitad del trabajo del área: dos meses antes del cumpleaños hay que
 * avisarle a la posta del barrio para que vaya tramitando la cita. **Solo
 * avisar**: la cita se pide recién cuando el paciente cumple 18, así que en
 * esta pantalla no hay nada que agendar y no debería haberlo.
 *
 * El corte de 2 meses lo hace el servidor (`/referrals/notice-queue`): la
 * bandeja es su propia pregunta, no un filtro sobre la cohorte del médico.
 */
export function ReferralNoticesPage() {
  const { user } = useAuth();
  const { toasts, push } = useToasts();
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  const load = useCallback(() => referralService.getNoticeQueue(), []);
  const {
    data: patients,
    isLoading,
    error,
    reload,
    apply,
  } = useQueue(load, isSamePatient, 'No se pudo cargar la bandeja.');

  const [query, setQuery] = useState('');

  const summary = referralSummary(patients);
  const canNotify = hasPermission(user, PERMISSIONS.healthPostNotify);
  // La búsqueda corta antes de paginar: se busca sobre toda la bandeja, no
  // sobre la página que casualmente está abierta.
  const visible = useMemo(
    () => searchByDni(patients, query),
    [patients, query],
  );
  const paged = usePagination(visible, PAGE_SIZE);

  async function notify(patient: Patient) {
    setNotifyingId(patient.id);
    try {
      const updated = await referralService.notifyHealthPost(patient);
      apply(updated);
      push({
        tone: 'ok',
        title: `Aviso enviado a ${patient.healthPost?.name}`,
        detail: `${patient.initials} · la posta ya sabe que en ${patient.monthsToEighteen} ${patient.monthsToEighteen === 1 ? 'mes' : 'meses'} tiene que tramitarle la cita.`,
      });
    } catch (err) {
      push({
        tone: 'err',
        title: 'No se pudo enviar el aviso',
        detail: getApiErrorMessage(err),
      });
    } finally {
      setNotifyingId(null);
    }
  }

  return (
    <div className="main enter">
      <PageHeader title="Por avisar a la posta">
        <PageHeaderStat value={summary.inWindow}>
          pacientes cumplen 18 en {NOTICE_MONTHS_BEFORE_18} meses o menos
        </PageHeaderStat>
        {summary.overdue > 0 && (
          <PageHeaderStat value={summary.overdue} tone="flag">
            con el aviso vencido
          </PageHeaderStat>
        )}
        <PageHeaderStat tone="dim">
          Actualizado {formatLongDate(new Date())}
        </PageHeaderStat>
      </PageHeader>

      <div className="page-body">
        {error ? (
          <LoadErrorState
            status={error.status}
            message={error.message}
            permission={PERMISSIONS.referralsRead}
            onRetry={reload}
          />
        ) : isLoading ? (
          <Section>
            <LoadingRows label="Cargando la bandeja" />
          </Section>
        ) : (
          <>
            <StatGrid>
              <StatCard
                label="Falta avisar"
                value={summary.noticeDue}
                total={summary.inWindow}
                hint="la posta todavía no sabe que este paciente va a llegar"
                severity={summary.noticeDue > 0 ? 'crit' : 'ok'}
              />
              <StatCard
                label="Ya avisadas"
                value={summary.noticeSent}
                total={summary.inWindow}
                hint="la posta tiene el caso y espera el cumpleaños"
                severity="ok"
              />
              <StatCard
                label="Vencidos"
                value={summary.overdue}
                total={summary.inWindow}
                hint={
                  summary.overdue > 0
                    ? 'les queda un mes o menos: la cita ya llega justa'
                    : 'ninguno se pasó de plazo'
                }
                severity={summary.overdue > 0 ? 'crit' : 'neutral'}
              />
              <StatCard
                label="Reclamados por el médico"
                value={summary.alerted}
                total={summary.inWindow}
                hint={
                  summary.alerted > 0
                    ? 'el especialista ya avisó que esto está frenado'
                    : 'ningún reclamo pendiente'
                }
                severity={summary.alerted > 0 ? 'warn' : 'neutral'}
              />
            </StatGrid>

            <Section
              title="Quiénes están por cumplir 18"
              aside={`${visible.length} ${visible.length === 1 ? 'paciente' : 'pacientes'}`}
            >
              <CohortFilterBar query={query} onQueryChange={setQuery} />
              <Notice className="wrapmax">
                <b>Esto es un aviso, no una cita.</b> La posta no puede agendar
                nada todavía: el paciente sigue siendo del hospital de niños
                hasta que cumpla 18. Avisar con {NOTICE_MONTHS_BEFORE_18} meses
                es lo que le da tiempo a conseguir el cupo para ese mismo mes.
              </Notice>

              <div style={{ paddingTop: 16 }}>
                <NoticeQueueTable
                  patients={paged.rows}
                  onNotify={(patient) => void notify(patient)}
                  notifyingId={notifyingId}
                  canNotify={canNotify}
                />
              </div>

              <Pagination
                page={paged.page}
                pageCount={paged.pageCount}
                from={paged.from}
                to={paged.to}
                total={paged.total}
                unit={['paciente', 'pacientes']}
                onChange={paged.goToPage}
              />
            </Section>
          </>
        )}
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}
