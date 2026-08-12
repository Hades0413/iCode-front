import type { Patient } from '../../domain/entities/patient.entity';
import type { CohortSort } from '../../domain/rules/cohort.rules';
import {
  canGenerateSummary,
  canReviewSummary,
} from '../../domain/rules/clinical-summary.rules';
import {
  rowUrgency,
  timeToEighteen,
} from '../../domain/rules/transition.rules';
import { ChevronIcon, SparkIcon } from './icons';
import { SummaryProgress } from './summary-chip';

/**
 * La tabla densa del tablero. Cada fila es un paciente y el filete de color
 * de la izquierda es la urgencia — que no es lo mismo que el tiempo
 * restante: a alguien ya derivado no le urge el cumpleaños, le urge que la
 * posta se entere (ver rowUrgency).
 *
 * Las columnas son lo que el médico decide mirando la lista: quién es, cuánto
 * falta y en qué está su **historia clínica** (generarla, revisarla). Todo lo
 * demás —el estado del caso, el tramo del área de Referencias, el reclamo—
 * vive en la ficha, que es donde se mira un caso puntual.
 */
export function PatientsTable({
  patients,
  sort,
  onSortChange,
  onOpen,
  onGenerateSummary,
  generatingId,
  canWrite,
}: Readonly<{
  patients: readonly Patient[];
  sort: CohortSort;
  onSortChange: (sort: CohortSort) => void;
  onOpen: (patient: Patient) => void;
  /** Pedirle a la IA el borrador de la historia clínica, desde la fila. */
  onGenerateSummary: (patient: Patient) => void;
  /** Paciente con una generación en vuelo. */
  generatingId: string | null;
  /** El usuario tiene PATIENTS_WRITE: puede generar y firmar. */
  canWrite: boolean;
}>) {
  return (
    <div className="tw">
      <table className="dt">
        <thead>
          <tr>
            <th style={{ paddingLeft: 18 }}>Paciente</th>
            <th className="s">
              <button type="button" onClick={() => onSortChange('meses')}>
                Cumple 18 en
                <span className="arw">{sort === 'meses' ? '↑' : ''}</span>
              </button>
            </th>
            <th>Diagnóstico</th>
            <th>Especialidad</th>
            <th>Resumen</th>
            <th>Historia clínica</th>
          </tr>
        </thead>
        <tbody>
          {patients.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="empty-s">
                  Ningún paciente coincide con este filtro.
                </div>
              </td>
            </tr>
          ) : (
            patients.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                onOpen={onOpen}
                onGenerateSummary={onGenerateSummary}
                isGenerating={generatingId === patient.id}
                canWrite={canWrite}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PatientRow({
  patient,
  onOpen,
  onGenerateSummary,
  isGenerating,
  canWrite,
}: Readonly<{
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onGenerateSummary: (patient: Patient) => void;
  isGenerating: boolean;
  canWrite: boolean;
}>) {
  const time = timeToEighteen(patient);
  const urgency = rowUrgency(patient);
  // Las dos caras del mismo trabajo: si no hay nada escrito se genera desde
  // aquí, y si ya hay borrador el botón lleva a la ficha — revisar es leer,
  // no se puede hacer desde una fila.
  const showGenerate = canWrite && canGenerateSummary(patient);
  const showReview = canWrite && canReviewSummary(patient);

  return (
    <tr
      className={urgency ? `u-${urgency}` : ''}
      onClick={() => onOpen(patient)}
    >
      <td className="stripe">
        <div className="ini">{patient.initials}</div>
        {/* El DNI va a la vista porque es por lo que se busca: si tipeas uno
            y la fila no lo muestra, no hay forma de confirmar que es él. */}
        <div className="hc">
          {patient.medicalRecord} · DNI {patient.dni}
        </div>
      </td>
      <td>
        <div className={`ttl ${time.urgency ?? ''}`}>
          {time.isCountdown ? (
            <b>{time.text}</b>
          ) : (
            <span className="dim">
              {time.prefix} {time.text}
            </span>
          )}
        </div>
        <div className="hc">{patient.age}</div>
      </td>
      <td>
        <div className="dxc" title={patient.diagnosis}>
          {patient.diagnosis}
        </div>
      </td>
      <td>
        {/* La columna ya dice "pediátrica" en el contexto: repetirlo en cada
            fila es ruido. */}
        <span className="mini">
          {patient.specialty.replace(' pediátrica', '')}
        </span>
      </td>
      <td>
        <SummaryProgress patient={patient} />
      </td>
      <td>
        <div className="rowact">
          {showGenerate && (
            <button
              type="button"
              className="btn btn-sm"
              disabled={isGenerating}
              onClick={(event) => {
                event.stopPropagation();
                onGenerateSummary(patient);
              }}
              title={`Generar con IA el borrador de la historia clínica de ${patient.initials}`}
            >
              {isGenerating ? <i className="spin" /> : <SparkIcon />}
              {isGenerating ? 'Generando…' : 'Generar con IA'}
            </button>
          )}
          {showReview && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(patient);
              }}
              title={`Revisar y firmar la historia clínica de ${patient.initials}`}
            >
              Revisar
            </button>
          )}
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
