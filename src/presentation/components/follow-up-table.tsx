import type { Patient } from '../../domain/entities/patient.entity';
import { treatmentStatus } from '../../domain/rules/transition.rules';
import { ChevronIcon, PinIcon } from './icons';

/**
 * La tabla de los que ya cumplieron 18: otra tabla que la del tablero, a
 * propósito. Del otro lado del cumpleaños las preguntas cambian — ya no
 * importa el resumen ni cuánto falta, sino **a qué hospital lo mandó la
 * posta y si está siguiendo su tratamiento** — y reusar la tabla de tutela
 * era arrastrar columnas que aquí no dicen nada.
 *
 * El orden lo decide el problema: primero los que abandonaron (son a los
 * que hay que salir a buscar), después los que están en trámite, al final
 * los que van bien.
 */
export function FollowUpTable({
  patients,
  onOpen,
}: Readonly<{
  patients: readonly Patient[];
  onOpen: (patient: Patient) => void;
}>) {
  return (
    <div className="tw">
      <table className="dt">
        <thead>
          <tr>
            <th style={{ paddingLeft: 18 }}>Paciente</th>
            <th>Edad</th>
            <th>Hospital al que lo derivó la posta</th>
            <th>Tratamiento</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {patients.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="empty-s">
                  Todavía ninguno de tus pacientes cumplió 18.
                </div>
              </td>
            </tr>
          ) : (
            patients.map((patient) => (
              <FollowUpRow key={patient.id} patient={patient} onOpen={onOpen} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function FollowUpRow({
  patient,
  onOpen,
}: Readonly<{ patient: Patient; onOpen: (patient: Patient) => void }>) {
  const status = treatmentStatus(patient);
  const hospital =
    patient.appointment?.hospital ?? patient.hospitalReferral?.hospital ?? null;

  return (
    <tr
      className={status.tone === 'crit' ? 'u-crit' : ''}
      onClick={() => onOpen(patient)}
    >
      <td className="stripe">
        <div className="ini">{patient.initials}</div>
        <div className="hc">
          {patient.medicalRecord} · DNI {patient.dni}
        </div>
      </td>
      <td>
        {/* "18a 3m": los años y los meses, que aquí son los meses que lleva
            del otro lado del puente. */}
        <div className="ttl">
          <b>{patient.age}</b>
        </div>
      </td>
      <td>
        {hospital ? (
          <>
            <div className="dest">
              <PinIcon />
              {hospital}
            </div>
            <span className="mini">
              {patient.hospitalReferral?.specialty ?? patient.specialty}
              {patient.healthPost && ` · lo derivó ${patient.healthPost.name}`}
            </span>
          </>
        ) : (
          <span className="mini">
            La posta todavía no lo derivó a ningún hospital
          </span>
        )}
      </td>
      <td>
        <span className={`chip ${CHIP_BY_TONE[status.tone]}`}>
          <i className="dot" />
          {status.label}
        </span>
      </td>
      <td>
        <div className="rowact">
          <button
            type="button"
            className="go"
            aria-label={`Abrir la ficha de ${patient.initials}`}
          >
            <ChevronIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}

const CHIP_BY_TONE = {
  ok: 'ok',
  warn: 'draft',
  crit: 'crit',
} as const;
