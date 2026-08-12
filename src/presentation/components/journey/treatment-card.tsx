import type { TransitionJourney } from '../../../domain/entities/journey.entity';
import { WarnIcon } from '../icons';

/**
 * Qué tiene y qué toma, en castellano de persona.
 *
 * El diagnóstico va dos veces a propósito: primero explicado —que es lo que
 * el paciente necesita para entender su propia enfermedad— y abajo, chiquito,
 * el nombre técnico, que es el que le va a servir cuando tenga que decirlo en
 * una ventanilla o buscarlo.
 *
 * Las alergias no están al final con lo demás: van en su propio bloque rojo,
 * porque es el dato que hay que poder decir en 5 segundos en una emergencia.
 */
export function TreatmentCard({
  journey,
}: Readonly<{ journey: TransitionJourney }>) {
  return (
    <section className="jn-card">
      <h2 className="jn-t">Lo que tienes</h2>
      <p className="jn-lead">{journey.diagnosisPlain}</p>
      <p className="jn-tech">
        {journey.diagnosis} · {journey.specialty}
      </p>

      {journey.allergies.length > 0 && (
        <div className="jn-allergy">
          <WarnIcon />
          <div>
            <b>
              Alergia a {journey.allergies.map((a) => a.substance).join(', ')}
            </b>
            {journey.allergies.map((allergy) => (
              <p key={allergy.substance}>{allergy.detail}</p>
            ))}
          </div>
        </div>
      )}

      <h3 className="jn-sub">Lo que tomas</h3>
      <ul className="jn-meds">
        {journey.medications.map((med) => (
          <li key={med.name}>
            <span className="jn-pill" aria-hidden="true">
              {med.initial}
            </span>
            <div>
              <b>{med.name}</b>
              <span className="jn-dose">{med.dose}</span>
              <p>{med.purpose}</p>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="jn-sub">Qué controles necesitas</h3>
      <p className="jn-lead">{journey.followUp}</p>
    </section>
  );
}
