import type { Patient } from '../../domain/entities/patient.entity';
import { formatShortDate } from '../../common/utils/format-date';
import { ChevronIcon, PinIcon } from './icons';
import styles from './follow-up-table.module.css';

/**
 * La tabla de los que ya cumplieron 18: otra tabla que la del tablero, a
 * propósito. Del otro lado del cumpleaños la pregunta es una sola —¿tiene su
 * cita de adultos y fue?— y las columnas son exactamente esa pregunta:
 * tiene cita, cuándo es, y si acudió.
 *
 * Sin cita, el resto de la fila se muestra con una raya (—): una celda
 * vacía parece un dato que no cargó; la raya dice "no hay nada que mostrar
 * aquí, y es información".
 */
export function FollowUpTable({
  patients,
  onOpen,
}: Readonly<{
  patients: readonly Patient[];
  onOpen: (patient: Patient) => void;
}>) {
  return (
    <div className={styles['follow-up-table-wrapper']}>
      <table className={styles['follow-up-table']}>
        <thead>
          <tr>
            <th style={{ paddingLeft: 18 }}>Paciente</th>
            <th>Tiene cita</th>
            <th>Fecha de la cita</th>
            <th>Acudió</th>
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

/** La raya de "aquí no hay nada": distinta de una celda que no cargó. */
function Dash() {
  return <span className="dim">—</span>;
}

/**
 * Si fue a su cita, dicho desde el estado del caso: FIRST_CARE_DONE y
 * READMITTED son un sí (llegó al otro lado), LOST_TO_FOLLOW_UP es el no que
 * hay que salir a buscar, y todo lo demás es una cita que todavía no pasa.
 */
function attendance(patient: Patient): {
  label: string;
  chip: 'ok' | 'crit' | 'none';
} {
  if (patient.state === 'FIRST_CARE_DONE' || patient.state === 'READMITTED') {
    return { label: 'Sí', chip: 'ok' };
  }
  if (patient.state === 'LOST_TO_FOLLOW_UP') {
    return { label: 'No', chip: 'crit' };
  }
  return { label: 'Todavía no toca', chip: 'none' };
}

function FollowUpRow({
  patient,
  onOpen,
}: Readonly<{ patient: Patient; onOpen: (patient: Patient) => void }>) {
  const appointment = patient.appointment;
  const attended = appointment ? attendance(patient) : null;

  return (
    <tr
      className={
        attended?.chip === 'crit' ? styles['follow-up-table-critical'] : ''
      }
      onClick={() => onOpen(patient)}
    >
      <td className={styles['follow-up-table-stripe-cell']}>
        <div className={styles['follow-up-table-initials']}>
          {patient.initials}
        </div>
        <div className={styles['follow-up-table-hint']}>
          {patient.medicalRecord} · DNI {patient.dni}
        </div>
      </td>
      <td>
        {appointment ? (
          <span className="chip ok">
            <i className="dot" />
            Sí
          </span>
        ) : (
          <span className="chip none">No</span>
        )}
      </td>
      <td>
        {appointment ? (
          <>
            <div className={styles['follow-up-table-appointment-date']}>
              <b>{formatShortDate(appointment.date)}</b>
            </div>
            <span className="mini">
              <PinIcon /> {appointment.hospital}
            </span>
          </>
        ) : (
          <Dash />
        )}
      </td>
      <td>
        {attended ? (
          <span className={`chip ${attended.chip}`}>
            {attended.chip !== 'none' && <i className="dot" />}
            {attended.label}
          </span>
        ) : (
          <Dash />
        )}
      </td>
      <td>
        <div className={styles['follow-up-table-row-actions']}>
          <button
            type="button"
            className={styles['follow-up-table-row-open-icon']}
            aria-label={`Abrir la ficha de ${patient.initials}`}
          >
            <ChevronIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}
