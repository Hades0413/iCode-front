import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  doctorAlerts,
  type DoctorAlert,
} from '../../domain/rules/clinical-summary.rules';
import { PERMISSIONS, hasPermission } from '../../domain/rules/permissions';
import { NotificationIcon, SignIcon, SparkIcon } from './icons';
import { useAuth } from '../hooks/use-auth';
import { useCohort } from '../hooks/use-cohort';

/**
 * La campanita del médico: lo que no se puede olvidar, en un solo lugar.
 *
 * Son exactamente dos recordatorios —firmar la historia del que cumple 18 el
 * mes que viene (la firma es 1 día antes del cumpleaños) y crear la del que
 * entró en la ventana de los 3 meses—, y salen de las mismas reglas que la
 * lista, así que la campana y el tablero no pueden decir cosas distintas.
 *
 * Cada aviso lleva a la ficha del paciente: una notificación que solo
 * informa, sin llevarte a donde se resuelve, es un pendiente más.
 */
export function NotificationsBell() {
  const { user } = useAuth();
  const { patients } = useCohort();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const alerts = useMemo(() => doctorAlerts(patients), [patients]);

  // Cerrar al hacer click afuera: es un menú, no un panel.
  useEffect(() => {
    if (!isOpen) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen]);

  // Las alertas son trabajo del médico: sin PATIENTS_WRITE no hay nada que
  // firmar ni generar, y una campana vacía por diseño es ruido.
  if (!hasPermission(user, PERMISSIONS.patientsWrite)) {
    return null;
  }

  function open(alert: DoctorAlert) {
    setIsOpen(false);
    navigate(`/pacientes/${alert.patient.id}`);
  }

  return (
    <div className="noti" ref={ref}>
      <button
        type="button"
        className="noti-btn"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={
          alerts.length === 0
            ? 'Notificaciones: nada pendiente'
            : `Notificaciones: ${alerts.length} pendientes`
        }
        title="Notificaciones"
        onClick={() => setIsOpen((current) => !current)}
      >
        <NotificationIcon />
        {alerts.length > 0 && (
          <span className="noti-count">{alerts.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="noti-pop" role="menu">
          <div className="noti-t">
            {alerts.length === 0
              ? 'Nada pendiente'
              : `${alerts.length} ${alerts.length === 1 ? 'pendiente' : 'pendientes'}`}
          </div>

          {alerts.length === 0 ? (
            <p className="noti-empty">
              Sin firmas ni historias por crear. Cuando un paciente entre en
              ventana, te avisamos aquí.
            </p>
          ) : (
            alerts.map((alert) => (
              <button
                key={`${alert.kind}-${alert.patient.id}`}
                type="button"
                role="menuitem"
                className="noti-item"
                onClick={() => open(alert)}
              >
                <span
                  className={`noti-mk ${alert.kind === 'SIGN_DUE' ? 'hot' : ''}`}
                >
                  {alert.kind === 'SIGN_DUE' ? <SignIcon /> : <SparkIcon />}
                </span>
                <span className="noti-x">
                  <b>
                    {alert.kind === 'SIGN_DUE' ? 'Firmar' : 'Crear'} ·{' '}
                    {alert.patient.initials}
                  </b>
                  <span>{alert.message}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
