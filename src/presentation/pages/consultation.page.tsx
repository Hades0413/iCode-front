import { useState } from 'react';
import { patientService } from '../../composition-root';
import type { ClinicalSummary } from '../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../domain/entities/patient.entity';
import type { AppointmentReport } from '../../domain/entities/journey.entity';
import { formatShortDate } from '../../common/utils/format-date';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { useAuth } from '../hooks/use-auth';
import { useToasts } from '../hooks/use-toasts';
import { Notice } from '../components/ui/notice';
import { Toasts } from '../components/toasts';
import { ConsultationScanner } from '../components/consultation-scanner';

/** Deja solo lo que un código puede tener: sin espacios, sin el "·" de lectura, en mayúsculas. */
function normalizeCode(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
}

/**
 * El "pase de consulta": el médico del hospital de adultos ve la historia
 * clínica de transferencia de alguien que recién cruzó, a partir del código
 * de 6 caracteres que esa persona genera en su propia app — nunca a partir
 * de su documento dicho en voz alta.
 *
 * Dos caminos al mismo código (GET /patients/consultation/:code y su
 * .../clinical-summary, el mismo permiso PATIENT_READ que ya protegía la
 * ficha por id): escanear el QR con la cámara, o escribirlo a mano.
 */
export function ConsultationPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'notfound'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);

  async function open(rawCode: string) {
    const normalized = normalizeCode(rawCode);
    if (normalized.length !== 6) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [patientResult, summaryResult] = await Promise.all([
        patientService.getPatientByConsultationCode(normalized),
        patientService.getClinicalSummaryByConsultationCode(normalized),
      ]);
      if (!patientResult || !summaryResult) {
        setStatus('notfound');
        return;
      }
      setPatient(patientResult);
      setSummary(summaryResult);
      setStatus('idle');
    } catch (err) {
      setStatus('idle');
      setError(getApiErrorMessage(err));
    }
  }

  function reset() {
    setPatient(null);
    setSummary(null);
    setStatus('idle');
    setError(null);
    setCode('');
  }

  if (patient && summary) {
    return (
      <ConsultationSummaryView
        code={code}
        patient={patient}
        summary={summary}
        onPatientUpdate={setPatient}
        onReset={reset}
      />
    );
  }

  return (
    <div className="jn-body">
      <section className="jn-card">
        <h2 className="jn-t">Ver a un paciente</h2>
        <p className="jn-lead">
          Escaneá el QR que el paciente tiene en su app, o escribí su código
          de consulta. Vas a ver su resumen de historia clínica de
          transferencia.
        </p>
        <ConsultationScanner
          onDetected={(value) => {
            setCode(normalizeCode(value));
            void open(value);
          }}
        />
      </section>

      <section className="jn-card">
        <div className="jn-divider">O escribí su código</div>
        <p className="jn-note">
          El paciente lo genera en su app y dura 15 minutos.
        </p>
        <input
          className="jn-qr-code"
          style={{ border: 'none' }}
          placeholder="EJ.: K7F4QX"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          onChange={(event) => setCode(normalizeCode(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void open(code);
            }
          }}
        />
        {status === 'notfound' && (
          <Notice tone="warn" className="wrapmax">
            Ese código no existe o ya venció — pedile al paciente que genere
            uno nuevo.
          </Notice>
        )}
        {error && (
          <Notice tone="crit" className="wrapmax">
            {error}
          </Notice>
        )}
        <button
          type="button"
          className="jn-btn jn-btn-pri"
          disabled={code.length !== 6 || status === 'loading'}
          onClick={() => void open(code)}
        >
          {status === 'loading' ? <i className="spin" /> : null}
          {status === 'loading' ? 'Buscando…' : 'Abrir el resumen'}
        </button>
      </section>
    </div>
  );
}

/** El resumen en modo lectura + el formulario para registrar la atención de hoy. */
function ConsultationSummaryView({
  code,
  patient,
  summary,
  onPatientUpdate,
  onReset,
}: Readonly<{
  code: string;
  patient: Patient;
  summary: ClinicalSummary;
  onPatientUpdate: (patient: Patient) => void;
  onReset: () => void;
}>) {
  return (
    <div className="jn-body">
      <section className="jn-card">
        <div className="jn-who">
          <span className="jn-avatar cp-avatar-grad" aria-hidden="true">
            {patient.initials}
          </span>
          <div>
            <b>{patient.initials}</b>
            <div className="jn-note">
              {patient.medicalRecord} · {patient.age} · {patient.specialty}
            </div>
          </div>
        </div>
        <div className="jn-sub">{patient.diagnosis}</div>
        <p className="jn-note">
          Del INSN lo sigue {patient.attendingDoctor}, disponible para dudas
          del traspaso.
        </p>
      </section>

      <section className="jn-card">
        <h2 className="jn-card-title jn-t">Resumen de historia clínica</h2>
        <div className="stackv">
          {summary.sections.map((section) => (
            <div className="jn-field" key={section.id}>
              <div className="jn-kicker">{section.title}</div>
              <p className="jn-lead">
                {section.body.trim() === ''
                  ? `Sin escribir — ${section.hint}`
                  : section.body}
              </p>
            </div>
          ))}
        </div>
        {summary.status === 'APPROVED' ? (
          <Notice tone="ok" className="wrapmax">
            Firmada por {summary.approvedBy ?? 'un médico del INSN'}
            {summary.approvedAt &&
              ` el ${formatShortDate(summary.approvedAt)}`}
            .
          </Notice>
        ) : (
          <Notice tone="warn" className="wrapmax">
            Esto sigue siendo un borrador — cruzó los 18 sin que nadie lo
            firmara todavía.
          </Notice>
        )}
      </section>

      <RegisterVisitCard
        code={code}
        specialty={patient.specialty}
        onRegistered={onPatientUpdate}
      />

      <button type="button" className="jn-btn" onClick={onReset}>
        Ver a otro paciente
      </button>
    </div>
  );
}

/**
 * "Registrar esta atención": lo que hace que el hospital de origen y el
 * propio paciente queden al día de dónde sigue su tratamiento — llena la
 * cita si no la tenía y pasa el caso a FIRST_CARE_DONE (ver
 * PatientTransitionService.registerConsultationVisit). Siempre pisa lo que
 * hubiera antes: la atención de hoy es la que importa.
 */
function RegisterVisitCard({
  code,
  specialty,
  onRegistered,
}: Readonly<{
  code: string;
  specialty: string;
  onRegistered: (patient: Patient) => void;
}>) {
  const { user } = useAuth();
  const { toasts, push } = useToasts();
  const doctorName = user ? `${user.firstName} ${user.lastName}` : '';

  const [hospital, setHospital] = useState('');
  const [doctor, setDoctor] = useState(
    doctorName ? `${doctorName} — ${specialty}` : '',
  );
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [time, setTime] = useState(() => toTimeInputValue(new Date()));
  const [isSending, setIsSending] = useState(false);

  const isComplete =
    hospital.trim() !== '' && doctor.trim() !== '' && date !== '' && time !== '';

  async function submit() {
    if (!isComplete) {
      return;
    }
    const report: AppointmentReport = { hospital, doctor, date, time };
    setIsSending(true);
    try {
      const updated = await patientService.registerConsultationVisit(
        code,
        report,
      );
      onRegistered(updated);
      push({
        tone: 'ok',
        title: 'Atención registrada',
        detail: 'El hospital de origen y el paciente quedan al día.',
      });
    } catch (err) {
      push({
        tone: 'err',
        title: 'No se pudo registrar',
        detail: getApiErrorMessage(err),
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="jn-card">
      <h2 className="jn-card-title jn-t">Registrar esta atención</h2>
      <p className="jn-lead">
        Con esto el hospital de origen y el propio paciente quedan al día de
        dónde sigue su tratamiento. Si el paciente no había registrado su
        cita, esto la llena en automático.
      </p>

      <div className="fg">
        <label htmlFor="rv-hospital">Hospital</label>
        <input
          id="rv-hospital"
          className="inp"
          placeholder="Ej.: Hospital Sergio Bernales"
          value={hospital}
          disabled={isSending}
          onChange={(event) => setHospital(event.target.value)}
        />
      </div>

      <div className="fg">
        <label htmlFor="rv-doctor">Doctor que atiende</label>
        <input
          id="rv-doctor"
          className="inp"
          value={doctor}
          disabled={isSending}
          onChange={(event) => setDoctor(event.target.value)}
        />
      </div>

      <div className="jn-field-row">
        <div className="fg">
          <label htmlFor="rv-date">Fecha</label>
          <input
            id="rv-date"
            type="date"
            className="inp"
            value={date}
            disabled={isSending}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="fg">
          <label htmlFor="rv-time">Hora</label>
          <input
            id="rv-time"
            type="time"
            className="inp"
            value={time}
            disabled={isSending}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="jn-btn jn-btn-pri"
        disabled={!isComplete || isSending}
        onClick={() => void submit()}
      >
        {isSending ? <i className="spin" /> : null}
        {isSending ? 'Registrando…' : 'Registrar atención'}
      </button>

      <Toasts toasts={toasts} />
    </section>
  );
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

