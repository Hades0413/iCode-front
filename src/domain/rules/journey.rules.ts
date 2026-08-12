import type {
  JourneyChecklistItem,
  JourneyViewer,
  TransitionJourney,
} from '../entities/journey.entity';

/**
 * Las reglas del recorrido **visto desde adentro**: lo que el paciente y
 * quien lo acompaña necesitan saber de su propio caso.
 *
 * Son otras que las del tablero a propósito. Al especialista le importa la
 * cohorte —cuántos, en qué estado, quién se atrasa—; acá hay una sola
 * persona y las preguntas son otras: cuándo es mi cita, a qué hora salgo de
 * casa, qué me falta preparar, a quién llamo si algo pasa.
 */

/** Cuánto de la preparación está hecho, 0..1. */
export function checklistProgress(journey: TransitionJourney): number {
  if (journey.checklist.length === 0) {
    return 0;
  }
  const done = journey.checklist.filter((item) => item.done).length;
  return done / journey.checklist.length;
}

export function checklistDoneCount(journey: TransitionJourney): number {
  return journey.checklist.filter((item) => item.done).length;
}

/** Lo que todavía falta, en el orden en que está la lista. */
export function pendingChecklist(
  journey: TransitionJourney,
): JourneyChecklistItem[] {
  return journey.checklist.filter((item) => !item.done);
}

/**
 * "Te falta aprenderte tus dosis y llevar tu DNI" — la lista dicha como una
 * frase. Un porcentaje no le dice a nadie qué hacer; esto sí.
 */
export function pendingSentence(journey: TransitionJourney): string | null {
  const labels = pendingChecklist(journey).map((item) => item.pendingLabel);
  if (labels.length === 0) {
    return null;
  }
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)}`;
}

/**
 * Días que faltan para la cita. Negativo = ya pasó. null = todavía no hay
 * fecha, que antes de los 18 es lo normal: la pide la posta después del
 * cumpleaños.
 *
 * Recibe el "hoy" en lugar de mirarlo: una regla pura que consulta el reloj
 * no se puede testear ni congelar en una demo.
 */
export function daysToAppointment(
  journey: TransitionJourney,
  today: Date,
): number | null {
  if (!journey.appointment) {
    return null;
  }
  const [date] = journey.appointment.date.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const start = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const target = Date.UTC(year, month - 1, day);
  return Math.round((target - start) / (24 * 60 * 60 * 1000));
}

/** "en 17 días", "mañana", "hoy", "hace 3 días". */
export function appointmentCountdown(days: number): string {
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'fue ayer';
  return days > 0 ? `en ${days} días` : `hace ${Math.abs(days)} días`;
}

/**
 * A qué hora tiene que estar en el hospital: la hora de la cita menos lo que
 * pide el servicio. Es el dato que evita la mitad de las citas perdidas —
 * nadie llega tarde a propósito, llega tarde porque calculó con la hora
 * equivocada.
 */
export function arrivalTime(journey: TransitionJourney): string | null {
  if (!journey.appointment) {
    return null;
  }
  const [, time] = journey.appointment.date.split('T');
  if (!time) {
    return null;
  }
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute - journey.arriveMinutesEarly;
  const safe = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

/** La hora de la cita, sin la fecha: "10:30". */
export function appointmentTime(journey: TransitionJourney): string | null {
  const time = journey.appointment?.date.split('T')[1];
  return time ? time.slice(0, 5) : null;
}

/* ---------- lo que puede hacer cada uno ---------- */

/**
 * Las dos vistas muestran lo mismo y **hacen cosas distintas**, y esa es toda
 * la diferencia entre padre e hijo:
 *
 * - El **hijo** es el dueño de la información: marca su preparación y decide
 *   quién puede verla. Nadie más puede tachar un ítem por él — si el padre
 *   pudiera, el checklist dejaría de decir lo que el chico sabe hacer y
 *   pasaría a decir lo que el padre cree que sabe.
 * - El **padre** acompaña: ve lo mismo, no marca nada, y lo único que puede
 *   hacer es recordarle. Es el gesto que ya existe en la vida real, solo que
 *   registrado.
 *
 * Los permisos vienen del servidor en el viewer; estas funciones son para que
 * la UI no los interprete distinto en cada pantalla.
 */
export function canTickChecklist(viewer: JourneyViewer): boolean {
  return viewer.role === 'OWNER' && viewer.canEditChecklist;
}

export function canRemindPatient(viewer: JourneyViewer): boolean {
  return viewer.role === 'GUARDIAN' && viewer.canSendReminder;
}

export function canManageAccess(viewer: JourneyViewer): boolean {
  return viewer.role === 'OWNER' && viewer.canManageGuardianAccess;
}

/** Cómo se le habla a quien está mirando. */
export function viewerGreeting(viewer: JourneyViewer): string {
  return viewer.role === 'OWNER' ? 'Tu recorrido' : 'El recorrido de';
}
