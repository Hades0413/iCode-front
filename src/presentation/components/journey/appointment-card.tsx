import type { TransitionJourney } from '../../../domain/entities/journey.entity';
import {
  appointmentCountdown,
  appointmentTime,
  arrivalTime,
  daysToAppointment,
} from '../../../domain/rules/journey.rules';
import { formatLongDate } from '../../../common/utils/format-date';
import { PinIcon } from '../icons';

/**
 * La cita: lo primero de la pantalla y lo más grande, porque es lo único que
 * el paciente necesita saber si abre la app con apuro.
 *
 * El dato que va destacado no es la hora de la cita sino **a qué hora tiene
 * que salir de su casa para llegar a tiempo**: nadie pierde una cita a
 * propósito, la pierde porque calculó con la hora equivocada.
 */
export function AppointmentCard({
  journey,
  today,
}: Readonly<{ journey: TransitionJourney; today: Date }>) {
  const days = daysToAppointment(journey, today);

  if (!journey.appointment || days === null) {
    return (
      <section className="jn-card jn-appt jn-appt-none">
        <h2 className="jn-kicker">Tu cita</h2>
        <p className="jn-big">Todavía no tienes fecha</p>
        <p className="jn-lead">
          {journey.healthPost
            ? `${journey.healthPost.name} ya tiene tu caso y está tramitando la cita en el hospital de adultos. Te avisan cuando haya día y hora.`
            : 'Cuando se acerque tu cumpleaños, la posta de tu barrio recibe tu caso y te consigue la cita.'}
        </p>
      </section>
    );
  }

  const isPast = days < 0;
  const [date] = journey.appointment.date.split('T');
  const [year, month, day] = date.split('-').map(Number);

  return (
    <section className={`jn-card jn-appt ${isPast ? 'past' : ''}`}>
      <h2 className="jn-kicker">Tu cita · {appointmentCountdown(days)}</h2>

      <p className="jn-date">
        {formatLongDate(new Date(year, month - 1, day))}
      </p>
      <p className="jn-hour">
        <b>{appointmentTime(journey)}</b>
        <span>{journey.appointment.hospital}</span>
      </p>

      {!isPast && arrivalTime(journey) && (
        // El dato accionable, separado del resto: es lo que hay que recordar.
        <p className="jn-arrive">
          Tienes que estar <b>{arrivalTime(journey)}</b> en el hospital ·{' '}
          {journey.arriveMinutesEarly} min antes
        </p>
      )}

      <dl className="jn-facts">
        <div>
          <dt>Con quién</dt>
          <dd>{journey.appointment.specialist}</dd>
        </div>
        {journey.appointmentAddress && (
          <div>
            <dt>Dónde</dt>
            <dd>
              <PinIcon /> {journey.appointmentAddress}
            </dd>
          </div>
        )}
        {journey.admissionNote && (
          <div>
            <dt>Al llegar</dt>
            <dd>{journey.admissionNote}</dd>
          </div>
        )}
      </dl>

      {/* El empujón, no la logística: quién tramitó la cita es un dato de
          oficina; lo que el chico tiene que llevarse es que esta cita es SU
          primer acto como adulto y que faltar no es una opción. */}
      <p className="jn-arrive jn-vital">
        <b>Esta cita es primordial: no faltes.</b> Es tu primer paso como adulto
        responsable de tu propia salud.
      </p>
    </section>
  );
}
