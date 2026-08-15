import { useState } from 'react';
import type { AppointmentReport } from '../../../domain/entities/journey.entity';
import { LockIcon } from '../icons';

/** El aviso del candado apunta a este id desde cada campo bloqueado. */
const LOCK_HINT_ID = 'ar-lock';

/**
 * "¿Ya conseguiste tu cita?" — el atajo para cuando el paciente no espera a
 * que la posta le consiga la cita y la encuentra por su cuenta.
 *
 * Solo aparece mientras no hay ninguna cita todavía (ver JourneyPage): una
 * vez registrada, esta tarjeta se reemplaza sola por AppointmentCard con lo
 * que se acaba de guardar — no hay "editar" porque ya no hace falta.
 *
 * Mientras la referencia no esté aceptada el formulario se ve pero no se
 * toca, con el candado y el motivo a la vista. Esconderlo sería peor: la
 * persona no sabría que ese camino existe, ni qué tiene que pasar para que
 * se abra. Y dejarlo abierto sería peor todavía — registraría una cita que
 * el hospital de adultos todavía no le puede dar.
 */
export function AppointmentReportCard({
  isSending,
  isLocked,
  onSubmit,
}: Readonly<{
  isSending: boolean;
  /** Sin referencia aceptada no hay cita que agendar (ver canScheduleAppointment). */
  isLocked: boolean;
  onSubmit: (report: AppointmentReport) => Promise<boolean>;
}>) {
  const [hospital, setHospital] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [doctor, setDoctor] = useState('');

  const isBusy = isSending || isLocked;
  const isComplete =
    hospital.trim() !== '' &&
    date !== '' &&
    time !== '' &&
    doctor.trim() !== '';

  async function submit() {
    if (!isComplete || isLocked) return;
    await onSubmit({ hospital, date, time, doctor });
  }

  return (
    <section className={`jn-card${isLocked ? ' jn-locked' : ''}`}>
      <h2 className="jn-t">¿Ya conseguiste tu cita?</h2>
      <p className="jn-lead">
        Si tú mismo encontraste tu cita en el hospital de adultos,
        regístrala aquí. Si no, no te preocupes: cuando el doctor escanee tu
        QR en la consulta, estos datos se llenan solos.
      </p>

      {isLocked && (
        <p className="jn-lock" id={LOCK_HINT_ID}>
          <LockIcon />
          Es necesaria la referencia para agendar una cita
        </p>
      )}

      <div className="fg">
        <label htmlFor="ar-hospital">¿En qué hospital?</label>
        <input
          id="ar-hospital"
          className="inp"
          placeholder="Ej.: Hospital Sergio Bernales"
          value={hospital}
          disabled={isBusy}
          aria-describedby={isLocked ? LOCK_HINT_ID : undefined}
          onChange={(event) => setHospital(event.target.value)}
        />
      </div>

      <div className="jn-field-row">
        <div className="fg">
          <label htmlFor="ar-date">¿Cuándo?</label>
          <input
            id="ar-date"
            type="date"
            className="inp"
            value={date}
            disabled={isBusy}
            aria-describedby={isLocked ? LOCK_HINT_ID : undefined}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="fg">
          <label htmlFor="ar-time">¿A qué hora?</label>
          <input
            id="ar-time"
            type="time"
            className="inp"
            value={time}
            disabled={isBusy}
            aria-describedby={isLocked ? LOCK_HINT_ID : undefined}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </div>

      <div className="fg">
        <label htmlFor="ar-doctor">¿Con qué doctor?</label>
        <input
          id="ar-doctor"
          className="inp"
          placeholder="Ej.: Dr. Sergio Antúnez — Neurología"
          value={doctor}
          disabled={isBusy}
          aria-describedby={isLocked ? LOCK_HINT_ID : undefined}
          onChange={(event) => setDoctor(event.target.value)}
        />
      </div>

      <button
        type="button"
        className="jn-btn jn-btn-pri"
        disabled={!isComplete || isBusy}
        aria-describedby={isLocked ? LOCK_HINT_ID : undefined}
        onClick={() => void submit()}
      >
        {isLocked ? <LockIcon /> : null}
        {isSending ? <i className="spin" /> : null}
        {isSending ? 'Registrando…' : 'Registrar mi cita'}
      </button>
    </section>
  );
}
