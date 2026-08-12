import { useMemo, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cohortSummary } from '../../domain/rules/cohort.rules';
import { referralSummary } from '../../domain/rules/referral.rules';
import { useAuth } from '../hooks/use-auth';
import { useCohort } from '../hooks/use-cohort';
import {
  BellIcon,
  BridgeGlyph,
  PinIcon,
  PulseIcon,
  TrayIcon,
} from '../components/icons';
import { NotificationsBell } from '../components/notifications-bell';
import { RailUser } from '../components/rail-user';
import { TopBack } from '../components/top-back';
import { RailNav, type RailGroup } from '../components/rail-nav';
import {
  WORKSPACE_LABELS,
  visibleSections,
  type WorkspaceKey,
} from '../routes/workspace-sections';
import '../styles/clinic.css';

/**
 * El escritorio clínico: riel flotante a la izquierda y la pantalla activa a
 * la derecha, las dos como tarjetas sobre el fondo.
 *
 * El riel tiene tres partes, en este orden:
 *
 * 1. **La marca**, para saber en qué producto estás.
 * 2. **Las secciones que le tocan a este usuario**, agrupadas por oficina:
 *    "Consultorio" para el especialista, "Referencias" para el área que habla
 *    con la posta. Quién ve qué sale de los permisos (ver
 *    routes/workspace-sections.ts), los mismos que exige cada endpoint.
 *    Dentro de cada pantalla, los cortes viven en su barra de filtros y no
 *    aquí: repetirlos en el riel era el mismo control dos veces.
 * 3. **Quién está adentro**, con la salida al lado. Cambiar de perfil es
 *    volver a entrar: se elige en el ingreso, no acá adentro.
 *
 * El degradado del riel va de teal (pediatría) a índigo (adultos): el menú es
 * el puente, en vertical. Y el data-role no es decorativo — de ahí sale --acc
 * para todo lo que esté adentro.
 */
export function ClinicLayout() {
  const { user } = useAuth();
  const { patients } = useCohort();
  const location = useLocation();

  // Los números del riel salen de la misma cohorte que las pantallas
  // (CohortProvider envuelve al layout): si dijeran otra cosa, uno de los dos
  // estaría mintiendo.
  const cohort = cohortSummary(patients);
  const referrals = referralSummary(patients);

  const groups = useMemo<RailGroup[]>(() => {
    const counts: Record<
      string,
      { count: number; tone?: 'ok' | 'warn' | 'hot' }
    > = {
      pacientes: { count: cohort.total },
      avisos: {
        count: referrals.noticeDue,
        tone:
          referrals.overdue > 0
            ? 'hot'
            : referrals.noticeDue > 0
              ? 'warn'
              : 'ok',
      },
    };
    const icons: Record<string, ReactNode> = {
      pacientes: <PinIcon />,
      seguimiento: <PulseIcon />,
      avisos: <BellIcon />,
      contrarreferencias: <TrayIcon />,
    };

    const byWorkspace = new Map<WorkspaceKey, RailGroup>();
    for (const section of visibleSections(user)) {
      const group = byWorkspace.get(section.workspace) ?? {
        key: section.workspace,
        title: WORKSPACE_LABELS[section.workspace],
        items: [],
      };
      group.items.push({
        key: section.key,
        label: section.label,
        to: section.to,
        icon: icons[section.key],
        count: counts[section.key]?.count,
        tone: counts[section.key]?.tone,
        // La ficha de un paciente sigue siendo "Pacientes": se llegó de ahí.
        isActive: location.pathname.startsWith(section.to),
      });
      byWorkspace.set(section.workspace, group);
    }
    return [...byWorkspace.values()];
  }, [
    user,
    location.pathname,
    cohort.total,
    referrals.noticeDue,
    referrals.overdue,
  ]);

  return (
    <div className="p18" data-role="esp">
      <div className="clinic">
        <aside className="rail">
          <div className="rail-brand">
            <span className="glyph">
              <BridgeGlyph />
            </span>
            <div>
              <div className="bn2">Puente 18+</div>
              <div className="sub">INSN San Borja</div>
            </div>
          </div>

          <RailNav groups={groups} />

          <RailUser />
        </aside>

        {/* La franja de arriba del contenido: volver a la izquierda, la
            campana en la esquina derecha. Es del marco y no de cada página,
            así ninguna pantalla se olvida de ponerla. */}
        <div className="workarea">
          <div className="topbar">
            <TopBack />
            <NotificationsBell />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
