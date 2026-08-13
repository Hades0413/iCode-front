import type { JourneyGuardian } from '../../../domain/entities/journey.entity';
import { LockIcon } from '../icons';

/**
 * Quién puede ver mi información — y el botón para quitárselo.
 *
 * Es la pantalla que hace que el traspaso sea de verdad: a los 18 la
 * información pasa a ser suya, y "suya" incluye poder decidir que su madre
 * deje de verla. Por eso la decisión vive del lado del paciente y con un
 * botón explícito, no escondida en una configuración.
 *
 * El texto no juzga la decisión ni en un sentido ni en el otro: dice qué pasa
 * si la toma, y ya.
 */
export function GuardianAccessCard({
  guardian,
  isBusy,
  onChange,
}: Readonly<{
  guardian: JourneyGuardian | null;
  isBusy: boolean;
  onChange: (hasAccess: boolean) => void;
}>) {
  if (!guardian) {
    return (
      <section className="jn-card">
        <h2 className="jn-t">Quién ve tu información</h2>
        <p className="jn-note">
          No tienes ningún tutor activo registrado — nadie más ve tu
          recorrido.
        </p>
      </section>
    );
  }

  return (
    <section className="jn-card">
      <h2 className="jn-t">Quién ve tu información</h2>

      <div className="jn-who">
        <span className="jn-avatar" aria-hidden="true">
          {guardian.firstName.charAt(0)}
        </span>
        <div>
          <b>
            {guardian.firstName} · tu {guardian.relationship}
          </b>
          <span className="jn-note">
            {guardian.hasAccess
              ? 'Ve tu cita, tu preparación y tus medicamentos. Puede recordarte cosas, pero no marcar tu lista.'
              : 'Ya no ve nada de tu recorrido. Solo sabe que existe.'}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`jn-btn ${guardian.hasAccess ? '' : 'jn-btn-pri'}`}
        disabled={isBusy}
        onClick={() => onChange(!guardian.hasAccess)}
      >
        {isBusy ? <i className="spin" /> : <LockIcon />}
        {guardian.hasAccess
          ? `Quitarle el acceso a tu ${guardian.relationship}`
          : `Volver a darle acceso a tu ${guardian.relationship}`}
      </button>

      <p className="jn-note">
        Ahora que tienes 18, esta información es tuya. Puedes cambiar esto
        cuando quieras y las veces que quieras.
      </p>
    </section>
  );
}
