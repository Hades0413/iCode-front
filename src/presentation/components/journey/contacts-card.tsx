import type { TransitionJourney } from '../../../domain/entities/journey.entity';

/** Del texto del contacto saca el teléfono, para poder llamarlo de un toque. */
function phoneOf(detail: string): string | null {
  const match = detail.match(/\(?\d[\d\s()-]{6,}\d/);
  return match ? match[0].replace(/[^\d+]/g, '') : null;
}

/**
 * A quién llamar. En el celular cada teléfono es un enlace `tel:`: en una
 * urgencia nadie copia un número a mano, y este es el bloque que se abre
 * cuando algo pasa.
 */
export function ContactsCard({
  journey,
}: Readonly<{ journey: TransitionJourney }>) {
  return (
    <section className="jn-card">
      <h2 className="jn-t">A quién llamar</h2>
      <ul className="jn-contacts">
        {journey.contacts.map((contact) => {
          const phone = phoneOf(contact.detail);
          return (
            <li key={contact.role}>
              <span className="jn-kicker">{contact.role}</span>
              <b>{contact.name}</b>
              {phone ? (
                <a className="jn-tel" href={`tel:${phone}`}>
                  {contact.detail}
                </a>
              ) : (
                <span>{contact.detail}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="jn-note">
        {journey.attendingDoctor} sigue disponible para dudas del traspaso,
        aunque ya no seas su paciente.
      </p>
    </section>
  );
}
