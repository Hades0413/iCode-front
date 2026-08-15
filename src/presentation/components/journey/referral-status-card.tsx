import type { TransitionJourney } from '../../../domain/entities/journey.entity';
import { canScheduleAppointment } from '../../../domain/rules/journey.rules';
import { CheckIcon, InfoIcon } from '../icons';

/**
 * En qué va su referencia, dicho para quien la está esperando.
 *
 * Es el mismo dato que el hospital ve como "Estado referencia" en su tablero,
 * y aquí es lo único que explica por qué todavía no puede hacer nada: sin
 * referencia aceptada no hay cita que pedir. Sin este aviso, el formulario
 * bloqueado de abajo parece una pantalla rota.
 *
 * Dos estados y no cuatro a propósito. Al hospital le importa la diferencia
 * entre "observada" y "rechazada" —son dos trabajos distintos y son suyos—;
 * a quien espera del otro lado, las tres que no son "aceptada" significan
 * exactamente lo mismo: todavía no, te avisamos. Detallar el rechazo aquí
 * sería alarmar a alguien que no puede hacer nada al respecto.
 */
export function ReferralStatusCard({
  journey,
  isOwner,
}: Readonly<{
  journey: TransitionJourney;
  /** Quien mira es el paciente. Si no, es quien lo acompaña. */
  isOwner: boolean;
}>) {
  if (!canScheduleAppointment(journey)) {
    return (
      <div className="jn-alert warn" role="status">
        <InfoIcon />
        <div>
          <span className="jn-kicker">Referencia en trámite</span>
          <p>
            {isOwner ? 'Tu referencia' : 'Su referencia'} está siendo
            procesada. Te avisaremos cuando esté aprobada.
          </p>
        </div>
      </div>
    );
  }

  const destination = journey.referralAcceptedBy ?? 'El hospital de adultos';

  return (
    <div className="jn-alert ok" role="status">
      <CheckIcon />
      <div>
        <span className="jn-kicker">Referencia aceptada</span>
        <p>
          <b>{destination}</b> aceptó {isOwner ? 'tu' : 'su'} referencia
          {/* El empujón solo mientras sirve: con la cita ya conseguida,
              "acércate a conseguir tu cita" manda a la persona a hacer un
              trámite que ya hizo. */}
          {journey.appointment
            ? '.'
            : `: ${isOwner ? 'acércate' : 'que se acerque'} lo antes posible para conseguir ${isOwner ? 'tu' : 'su'} cita.`}
        </p>
      </div>
    </div>
  );
}
