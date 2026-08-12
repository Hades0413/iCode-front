import type {
  JourneyViewer,
  TransitionJourney,
} from '../../../domain/entities/journey.entity';
import {
  checklistDoneCount,
  checklistProgress,
} from '../../../domain/rules/journey.rules';
import { ChevronIcon } from '../icons';
import { BridgeProgress } from './bridge-progress';

/**
 * El saludo y el cruce: lo primero que se ve al abrir la app.
 *
 * El tono es el punto. Al chico no se le habla como a un paciente pediátrico
 * ni como a un expediente: se lo saluda por su nombre y se le dice, sin
 * vueltas, que esto ahora es suyo — la app entera existe para que ese mensaje
 * aterrice antes de los 18. Y el ánimo cambia con el avance: no es lo mismo
 * no haber empezado que estar a un paso, y el texto lo acompaña en vez de
 * repetir siempre la misma frase de manual.
 */
export function HomeHero({
  journey,
  viewer,
  onGoSteps,
}: Readonly<{
  journey: TransitionJourney;
  viewer: JourneyViewer;
  /** Llevar a la pestaña de pasos: el hero muestra el avance, allá se actúa. */
  onGoSteps: () => void;
}>) {
  const isOwner = viewer.role === 'OWNER';
  const progress = checklistProgress(journey);
  const done = checklistDoneCount(journey);
  const total = journey.checklist.length;
  const remaining = total - done;

  return (
    <section className="jn-card jn-hero">
      <p className="jn-hello">{isOwner ? '¡Hola!' : 'Hola,'}</p>
      <h1 className="jn-hero-t">
        {isOwner ? journey.initials : `acompañas a ${journey.initials}`}
      </h1>
      <p className="jn-hero-s">
        {isOwner
          ? 'Ya tienes 18: tu salud pasa a tus manos, y este es tu cruce.'
          : 'Su salud ahora es suya; tu parte es acompañarlo a cruzar.'}
      </p>

      <BridgeProgress progress={progress} />

      <p className="jn-hero-m">{heroMessage(isOwner, done, total)}</p>

      <button type="button" className="jn-btn jn-btn-pri" onClick={onGoSteps}>
        {isOwner
          ? remaining > 0
            ? `Seguir con mis pasos (${remaining})`
            : 'Ver mis pasos'
          : remaining > 0
            ? `Ver qué le falta (${remaining})`
            : 'Ver sus pasos'}
        <ChevronIcon />
      </button>
    </section>
  );
}

/** El ánimo según el avance: acompaña, no sermonea. */
function heroMessage(isOwner: boolean, done: number, total: number): string {
  if (total === 0) {
    return '';
  }
  if (done === 0) {
    return isOwner
      ? `Tienes ${total} pasos para llegar listo a tu primera cita de adultos. El primero es tuyo.`
      : `Todavía no empezó su preparación: son ${total} pasos. Un recordatorio tuyo puede arrancarla.`;
  }
  if (done < total) {
    return isOwner
      ? `¡Vas bien! Ya hiciste ${done} de ${total}. Cada paso lo das tú, nadie más puede darlo.`
      : `Va avanzando: lleva ${done} de ${total}. Los pasos los marca él, que es la idea.`;
  }
  return isOwner
    ? '¡Preparación completa! Llegas a tu cita sabiendo lo tuyo, como un adulto que se cuida.'
    : '¡Completó toda su preparación! Llega a su cita sabiendo lo suyo.';
}
