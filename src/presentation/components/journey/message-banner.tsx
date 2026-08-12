import type { JourneyMessage } from '../../../domain/entities/journey.entity';
import { formatShortDate } from '../../../common/utils/format-date';

/**
 * El mensaje que le dejó quien lo acompaña.
 *
 * Va arriba de todo y lo descarta el paciente cuando lo leyó — no se va solo
 * ni lo puede borrar quien lo mandó. Es un recordatorio, no una notificación
 * que desaparece antes de que la vea.
 */
export function MessageBanner({
  message,
  isDismissing,
  onDismiss,
}: Readonly<{
  message: JourneyMessage;
  isDismissing: boolean;
  onDismiss: () => void;
}>) {
  return (
    <div className="jn-msg" role="status">
      <div>
        <span className="jn-kicker">
          {message.from} te escribió · {formatShortDate(message.sentAt)}
        </span>
        <p>{message.text}</p>
      </div>
      <button
        type="button"
        className="jn-msg-x"
        disabled={isDismissing}
        onClick={onDismiss}
      >
        Listo
      </button>
    </div>
  );
}
