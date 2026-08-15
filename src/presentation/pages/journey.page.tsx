import { useCallback, useState } from 'react';
import { journeyService } from '../../composition-root';
import type {
  AppointmentReport,
  JourneyAccess,
  JourneyChecklistItem,
} from '../../domain/entities/journey.entity';
import {
  canManageAccess,
  canManageConsultationCode,
  canRemindPatient,
  canReportAppointment,
  canScheduleAppointment,
  canTickChecklist,
  pendingChecklist,
} from '../../domain/rules/journey.rules';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { HomeIcon, PulseIcon, StepsIcon, UserIcon } from '../components/icons';
import { AppointmentCard } from '../components/journey/appointment-card';
import { AppointmentReportCard } from '../components/journey/appointment-report-card';
import { ChecklistCard } from '../components/journey/checklist-card';
import { ConsultationCodeCard } from '../components/journey/consultation-code-card';
import { ContactsCard } from '../components/journey/contacts-card';
import { GuardianAccessCard } from '../components/journey/guardian-access-card';
import { GuideCard } from '../components/journey/guide-card';
import { HomeHero } from '../components/journey/home-hero';
import { JourneyNav, type JourneyTab } from '../components/journey/journey-nav';
import { MessageBanner } from '../components/journey/message-banner';
import { ReferralStatusCard } from '../components/journey/referral-status-card';
import { ReminderForm } from '../components/journey/reminder-form';
import { RevokedScreen } from '../components/journey/revoked-screen';
import { TreatmentCard } from '../components/journey/treatment-card';
import { Toasts } from '../components/toasts';
import { LoadingRows } from '../components/ui/states';
import { useAsyncResource } from '../hooks/use-async-resource';
import { useToasts } from '../hooks/use-toasts';

const NO_JOURNEY: JourneyAccess | null = null;

/** Las cuatro pestañas: una por pregunta que la persona trae. */
type TabKey = 'hoy' | 'pasos' | 'salud' | 'yo';

/**
 * "Mi recorrido" — la app del paciente y de quien lo acompaña.
 *
 * No es una página larga con todo a la vista: es una app de celular con
 * cuatro pestañas abajo, una por pregunta. **Hoy** (¿cuándo es mi cita?),
 * **Pasos** (¿qué me falta preparar?), **Salud** (¿qué tengo y qué tomo?) y
 * **Yo** (¿quién ve mi información y a quién llamo?). Mostrarlo todo junto
 * abrumaba justo a quien menos costumbre tiene de leer pantallas médicas;
 * partido en preguntas, cada pestaña se contesta en una pasada de pulgar.
 *
 * Las dos vistas —hijo y padre— son las mismas pestañas con dos diferencias,
 * y las dos salen del `viewer` que manda el servidor: el hijo marca sus pasos
 * y decide quién ve lo suyo; el padre mira, y su única acción es recordarle.
 */
export function JourneyPage() {
  const { toasts, push } = useToasts();
  const [tab, setTab] = useState<TabKey>('hoy');
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    | 'remind'
    | 'access'
    | 'dismiss'
    | 'reportAppointment'
    | 'generateCode'
    | null
  >(null);

  const load = useCallback(() => journeyService.getJourney(), []);
  const { data, isLoading, error, reload, setData } = useAsyncResource(
    load,
    NO_JOURNEY,
    'No se pudo cargar tu recorrido.',
  );

  /** Cambiar de pestaña vuelve arriba: cada una empieza por su titular. */
  function goTo(next: TabKey) {
    setTab(next);
    window.scrollTo({ top: 0 });
  }

  /** Toda acción devuelve el recorrido entero: se reemplaza y listo. */
  async function run(
    action: () => Promise<JourneyAccess>,
    onDone?: () => void,
  ): Promise<boolean> {
    try {
      setData(await action());
      onDone?.();
      return true;
    } catch (err) {
      push({
        tone: 'err',
        title: 'No se pudo guardar',
        detail: getApiErrorMessage(err),
      });
      return false;
    }
  }

  async function toggle(item: JourneyChecklistItem) {
    setBusyItem(item.id);
    await run(() => journeyService.setChecklistItem(item.id, !item.done));
    setBusyItem(null);
  }

  async function remind(text: string): Promise<boolean> {
    setBusyAction('remind');
    const sent = await run(
      () => journeyService.remindPatient(text),
      () =>
        push({
          tone: 'ok',
          title: 'Recordatorio enviado',
          detail: 'Le va a aparecer al abrir su app.',
        }),
    );
    setBusyAction(null);
    return sent;
  }

  async function changeAccess(hasAccess: boolean) {
    setBusyAction('access');
    await run(
      () => journeyService.setGuardianAccess(hasAccess),
      () =>
        push({
          tone: 'ok',
          title: hasAccess ? 'Acceso devuelto' : 'Acceso quitado',
          detail: hasAccess
            ? 'Vuelve a ver tu recorrido.'
            : 'Ya no ve nada de tu recorrido.',
        }),
    );
    setBusyAction(null);
  }

  async function dismiss(messageId: string) {
    setBusyAction('dismiss');
    await run(() => journeyService.dismissMessage(messageId));
    setBusyAction(null);
  }

  async function reportAppointment(
    report: AppointmentReport,
  ): Promise<boolean> {
    setBusyAction('reportAppointment');
    const saved = await run(() => journeyService.reportAppointment(report));
    setBusyAction(null);
    return saved;
  }

  async function generateConsultationCode(): Promise<boolean> {
    setBusyAction('generateCode');
    const generated = await run(() =>
      journeyService.generateConsultationCode(),
    );
    setBusyAction(null);
    return generated;
  }

  if (isLoading) {
    return (
      <div className="jn-body">
        <div className="jn-card">
          <LoadingRows rows={4} label="Cargando tu recorrido" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="jn-body">
        <section className="jn-card">
          <h2 className="jn-t">No se pudo cargar tu recorrido</h2>
          <p className="jn-lead">
            {error?.message ?? 'Intenta de nuevo en un momento.'}
          </p>
          <button type="button" className="jn-btn jn-btn-pri" onClick={reload}>
            Reintentar
          </button>
        </section>
      </div>
    );
  }

  if (data.access === 'REVOKED') {
    // Sin pestañas: no queda nada entre lo que navegar.
    return (
      <div className="jn-body">
        <RevokedScreen subjectInitials={data.subjectInitials} />
      </div>
    );
  }

  const { journey, viewer } = data;
  const isOwner = viewer.role === 'OWNER';
  const pendingSteps = pendingChecklist(journey).length;

  const tabs: JourneyTab[] = [
    {
      key: 'hoy',
      label: 'Hoy',
      icon: HomeIcon,
      // El globito de "tienes un mensaje sin leer".
      badge: isOwner && journey.pendingMessage ? 1 : 0,
    },
    { key: 'pasos', label: 'Pasos', icon: StepsIcon, badge: pendingSteps },
    { key: 'salud', label: 'Salud', icon: PulseIcon },
    { key: 'yo', label: isOwner ? 'Yo' : 'Ayuda', icon: UserIcon },
  ];

  return (
    <>
      {/* La key remonta el panel al cambiar de pestaña: así cada una entra
          con su animación y el foco del lector arranca desde el título. */}
      <div key={tab} className="jn-body jn-panel">
        {tab === 'hoy' && (
          <>
            {isOwner && journey.pendingMessage && (
              <MessageBanner
                message={journey.pendingMessage}
                isDismissing={busyAction === 'dismiss'}
                onDismiss={() => void dismiss(journey.pendingMessage?.id ?? '')}
              />
            )}
            <HomeHero
              journey={journey}
              viewer={viewer}
              onGoSteps={() => goTo('pasos')}
            />
            <AppointmentCard journey={journey} today={new Date()} />
            {/* Va antes del formulario porque es su explicación: la
                referencia es lo que lo abre o lo mantiene con candado. */}
            <ReferralStatusCard journey={journey} isOwner={isOwner} />
            {!journey.appointment && canReportAppointment(viewer) && (
              <AppointmentReportCard
                isSending={busyAction === 'reportAppointment'}
                isLocked={!canScheduleAppointment(journey)}
                onSubmit={reportAppointment}
              />
            )}
            {canManageConsultationCode(viewer) && (
              <ConsultationCodeCard
                code={journey.consultationCode}
                expiresAt={journey.consultationCodeExpiresAt}
                isGenerating={busyAction === 'generateCode'}
                onGenerate={generateConsultationCode}
              />
            )}
          </>
        )}

        {tab === 'pasos' && (
          <>
            <ChecklistCard
              journey={journey}
              canTick={canTickChecklist(viewer)}
              busyId={busyItem}
              onToggle={(item) => void toggle(item)}
            />
            {/* La forma de acompañar del padre vive junto a lo que falta:
                recuerda mirando la lista, no de memoria. */}
            {canRemindPatient(viewer) && (
              <ReminderForm
                patientInitials={journey.initials}
                isSending={busyAction === 'remind'}
                onSend={remind}
              />
            )}
          </>
        )}

        {tab === 'salud' && <TreatmentCard journey={journey} />}

        {tab === 'yo' && (
          <>
            {canManageAccess(viewer) && (
              <GuardianAccessCard
                guardian={journey.guardian}
                isBusy={busyAction === 'access'}
                onChange={(hasAccess) => void changeAccess(hasAccess)}
              />
            )}
            <ContactsCard journey={journey} />
            <GuideCard journey={journey} />
            <p className="jn-foot">
              Puente 18+ · INSN San Borja · datos de prueba
            </p>
          </>
        )}
      </div>

      <JourneyNav
        tabs={tabs}
        active={tab}
        onSelect={(key) => goTo(key as TabKey)}
      />

      <Toasts toasts={toasts} />
    </>
  );
}
