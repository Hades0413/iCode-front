import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { referralService } from '../../composition-root';
import type { CounterReferralQueueItem } from '../../application/dto/counter-referral-queue-item.dto';
import type { CounterReferralUpload } from '../../application/dto/counter-referral-upload.dto';
import { PERMISSIONS, hasPermission } from '../../domain/rules/permissions';
import { searchByDni } from '../../domain/rules/cohort.rules';
import { counterReferralSummary } from '../../domain/rules/referral.rules';
import { formatLongDate } from '../../common/utils/format-date';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { CohortFilterBar } from '../components/cohort-filter-bar';
import {
  CounterReferralCard,
  type LetterBusy,
} from '../components/referral/counter-referral-card';
import { Toasts } from '../components/toasts';
import { Notice } from '../components/ui/notice';
import { PageHeader, PageHeaderStat } from '../components/ui/page-header';
import { Section } from '../components/ui/section';
import { StatCard, StatGrid } from '../components/ui/stat-card';
import {
  EmptyState,
  LoadErrorState,
  LoadingRows,
} from '../components/ui/states';
import { useAuth } from '../hooks/use-auth';
import { useQueue } from '../hooks/use-queue';
import { useToasts } from '../hooks/use-toasts';

const isSameItem = (a: CounterReferralQueueItem, b: CounterReferralQueueItem) =>
  a.patient.id === b.patient.id;

/** El ancla de cada grupo: es a donde lleva el número de arriba. */
const groupAnchor = (key: string) => `cr-${key}`;

const scrollToGroup = (key: string) =>
  document
    .getElementById(groupAnchor(key))
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/**
 * "Contrarreferencias" — la otra mitad del trabajo del área.
 *
 * Cuando el paciente cumple 18, el área redacta la carta en el sistema
 * externo, la sube aquí y se la manda a la posta: es el documento que devuelve
 * formalmente el caso al primer nivel. Antes del cumpleaños no puede salir, y
 * esa regla la valida el servidor además de esta pantalla.
 *
 * Se ordena por lo que falta: primero los que no tienen carta, después los que
 * la tienen sin enviar, y al final los enviados — que son los que ya no
 * necesitan que nadie los mire.
 */
export function CounterReferralsPage() {
  const { user } = useAuth();
  const { toasts, push } = useToasts();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<LetterBusy>(null);

  const load = useCallback(() => referralService.getCounterReferralQueue(), []);
  const {
    data: items,
    isLoading,
    error,
    reload,
    apply,
  } = useQueue(
    load,
    isSameItem,
    'No se pudieron cargar las contrarreferencias.',
  );

  const canManage = hasPermission(user, PERMISSIONS.counterReferralManage);
  const summary = counterReferralSummary(items.map((item) => item.patient));

  // La búsqueda por DNI corta ANTES de agrupar: con un documento tipeado,
  // cada grupo muestra solo lo suyo (y el vacío desaparece solo).
  const [query, setQuery] = useState('');
  const visible = useMemo(
    () =>
      searchByDni(
        items.map((item) => item.patient),
        query,
      ).map((patient) => items.find((item) => item.patient.id === patient.id)!),
    [items, query],
  );

  // Tres grupos con título en vez de una lista corrida: "falta", "lista sin
  // enviar" y "enviada" son tres momentos distintos del trabajo, y mezclados
  // se leían como una sola masa de tarjetas blancas.
  const groups = [
    {
      key: 'NONE',
      title: 'Falta la carta',
      tone: 'crit' as const,
      items: visible.filter(
        (item) => item.patient.counterReferralStatus === 'NONE',
      ),
    },
    {
      key: 'UPLOADED',
      title: 'Listas para enviar',
      tone: 'warn' as const,
      items: visible.filter(
        (item) => item.patient.counterReferralStatus === 'UPLOADED',
      ),
    },
    {
      key: 'SENT',
      title: 'Ya enviadas',
      tone: 'ok' as const,
      items: visible.filter(
        (item) => item.patient.counterReferralStatus === 'SENT',
      ),
    },
  ];

  /**
   * Los números de arriba llevan a las cartas que cuentan. Sin esto, tocar
   * "Falta la carta: 4" no hacía nada: las tarjetas estaban abajo del pliegue
   * y había que ir a buscarlas a mano.
   *
   * Si un DNI tipeado dejó ese grupo sin nada que mostrar, se limpia la
   * búsqueda y el salto queda pendiente para el próximo pintado — llevarlo a
   * un grupo vacío sería peor que no moverse.
   */
  const pendingGroup = useRef<string | null>(null);

  useEffect(() => {
    if (pendingGroup.current === null) return;
    scrollToGroup(pendingGroup.current);
    pendingGroup.current = null;
  }, [visible]);

  function goToGroup(key: string) {
    if (document.getElementById(groupAnchor(key))) {
      scrollToGroup(key);
      return;
    }
    pendingGroup.current = key;
    setQuery('');
  }

  async function upload(
    item: CounterReferralQueueItem,
    file: CounterReferralUpload,
  ): Promise<boolean> {
    setBusyId(item.patient.id);
    setBusyKind('upload');
    try {
      const result = await referralService.uploadCounterReferral(
        item.patient,
        file,
      );
      apply({
        patient: result.patient,
        counterReferral: result.counterReferral,
      });
      push({
        tone: 'ok',
        title: `Carta de ${item.patient.initials} subida`,
        detail: 'Todavía no salió: falta enviarla a la posta.',
      });
      return true;
    } catch (err) {
      push({
        tone: 'err',
        title: 'No se pudo subir la carta',
        detail: getApiErrorMessage(err),
      });
      return false;
    } finally {
      setBusyId(null);
      setBusyKind(null);
    }
  }

  async function send(item: CounterReferralQueueItem) {
    setBusyId(item.patient.id);
    setBusyKind('send');
    try {
      const result = await referralService.sendCounterReferral(item.patient);
      apply({
        patient: result.patient,
        counterReferral: result.counterReferral,
      });
      push({
        tone: 'ok',
        title: `Contrarreferencia enviada a ${item.patient.healthPost?.name}`,
        detail: `${item.patient.initials} · el caso vuelve al primer nivel.`,
      });
    } catch (err) {
      push({
        tone: 'err',
        title: 'No se pudo enviar la carta',
        detail: getApiErrorMessage(err),
      });
    } finally {
      setBusyId(null);
      setBusyKind(null);
    }
  }

  return (
    <div className="main enter">
      <PageHeader title="Contrarreferencias">
        <PageHeaderStat value={summary.total}>
          pacientes ya cumplieron 18
        </PageHeaderStat>
        {summary.pending + summary.uploaded > 0 && (
          <PageHeaderStat
            value={summary.pending + summary.uploaded}
            tone="flag"
          >
            todavía sin enviar a su posta
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
            <LoadingRows label="Cargando las contrarreferencias" />
          </Section>
        ) : (
          <>
            <StatGrid>
              {/* Cada número es un botón cuando tiene algo abajo: te deja en
                  su grupo de cartas. En cero no finge ser clickeable. */}
              <StatCard
                label="Falta la carta"
                value={summary.pending}
                total={summary.total}
                hint="cumplieron 18 y todavía nadie redactó su contrarreferencia"
                severity={summary.pending > 0 ? 'crit' : 'ok'}
                onClick={
                  summary.pending > 0 ? () => goToGroup('NONE') : undefined
                }
              />
              <StatCard
                label="Listas sin enviar"
                value={summary.uploaded}
                total={summary.total}
                hint="la carta existe pero la posta todavía no la recibió"
                severity={summary.uploaded > 0 ? 'warn' : 'neutral'}
                onClick={
                  summary.uploaded > 0 ? () => goToGroup('UPLOADED') : undefined
                }
              />
              <StatCard
                label="Enviadas"
                value={summary.sent}
                total={summary.total}
                hint="el caso ya volvió al primer nivel"
                severity="ok"
                onClick={summary.sent > 0 ? () => goToGroup('SENT') : undefined}
              />
            </StatGrid>

            <Section
              title="Cartas por paciente"
              aside={`${visible.length} ${visible.length === 1 ? 'caso' : 'casos'}`}
            >
              <CohortFilterBar query={query} onQueryChange={setQuery} />
              <Notice className="wrapmax">
                <b>La carta se redacta en el sistema de contrarreferencias</b> y
                se sube aquí (PDF o Word). Recién ahí se puede enviar, y nunca
                antes de que el paciente cumpla 18: hasta ese día el caso sigue
                siendo del hospital de niños.
              </Notice>

              {visible.length === 0 ? (
                <EmptyState>
                  {query.trim() === ''
                    ? 'Todavía ningún paciente de tu lista cumplió 18.'
                    : 'Ningún paciente con ese DNI en esta bandeja.'}
                </EmptyState>
              ) : (
                groups
                  .filter((group) => group.items.length > 0)
                  .map((group) => (
                    <div
                      key={group.key}
                      id={groupAnchor(group.key)}
                      className="crgroup"
                    >
                      <div className="crgroup-h">
                        <i className={`crgroup-dot ${group.tone}`} />
                        {group.title}
                        <span className="crgroup-n">{group.items.length}</span>
                      </div>
                      <div className="crlist">
                        {group.items.map((item) => (
                          <CounterReferralCard
                            key={item.patient.id}
                            patient={item.patient}
                            letter={item.counterReferral}
                            canManage={canManage}
                            busy={busyId === item.patient.id ? busyKind : null}
                            onUpload={(file) => upload(item, file)}
                            onSend={() => void send(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </Section>
          </>
        )}
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}
