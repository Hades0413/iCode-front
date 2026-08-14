import { useState } from 'react';
import type { AppointmentReport } from '../../../domain/entities/journey.entity';

/**
 * "¿Ya conseguiste tu cita?" — el atajo para cuando el paciente no espera a
 * que la posta le consiga la cita y la encuentra por su cuenta.
 *
 * Solo aparece mientras no hay ninguna cita todavía (ver JourneyPage): una
 * vez registrada, esta tarjeta se reemplaza sola por AppointmentCard con lo
 * que se acaba de guardar — no hay "editar" porque ya no hace falta.
 */
export function AppointmentReportCard({
  isSending,
  onSubmit,
}: Readonly<{
  isSending: boolean;
  onSubmit: (report: AppointmentReport) => Promise<boolean>;
}>) {
  const [hospital, setHospital] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [doctor, setDoctor] = useState('');

  const isComplete =
    hospital.trim() !== '' &&
    date !== '' &&
    time !== '' &&
    doctor.trim() !== '';

  async function submit() {
    if (!isComplete) return;
    await onSubmit({ hospital, date, time, doctor });
  }

  return (
    <section className="jn-card">
      <h2 className="jn-t">¿Ya conseguiste tu cita?</h2>
      <p className="jn-lead">
        Si tú mismo encontraste tu cita en el hospital de adultos,
        regístrala aquí. Si no, no te preocupes: cuando el doctor escanee tu
        QR en la consulta, estos datos se llenan solos.
      </p>

      <div className="fg">
        <label htmlFor="ar-hospital">¿En qué hospital?</label>
        <input
          id="ar-hospital"
          className="inp"
          placeholder="Ej.: Hospital Sergio Bernales"
          value={hospital}
          disabled={isSending}
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
            disabled={isSending}
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
            disabled={isSending}
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
          disabled={isSending}
          onChange={(event) => setDoctor(event.target.value)}
        />
      </div>

      <button
        type="button"
        className="jn-btn jn-btn-pri"
        disabled={!isComplete || isSending}
        onClick={() => void submit()}
      >
        {isSending ? <i className="spin" /> : null}
        {isSending ? 'Registrando…' : 'Registrar mi cita'}
      </button>
    </section>
  );
}
