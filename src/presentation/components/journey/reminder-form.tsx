import { useState } from 'react';
import { BellIcon } from '../icons';

const MAX = 240;

/**
 * Lo único que puede hacer quien acompaña: recordarle algo.
 *
 * No hay un botón de "avisarle que tome su pastilla" prearmado. Se escribe,
 * porque el mensaje que sirve es el que dice la persona —"acuérdate de llevar
 * el DNI, lo dejaste sobre la mesa"— y no una plantilla que el chico aprende
 * a ignorar.
 */
export function ReminderForm({
  patientInitials,
  isSending,
  onSend,
}: Readonly<{
  patientInitials: string;
  isSending: boolean;
  onSend: (text: string) => Promise<boolean>;
}>) {
  const [text, setText] = useState('');

  async function send() {
    if (text.trim() === '') return;
    const sent = await onSend(text);
    if (sent) {
      setText('');
    }
  }

  return (
    <section className="jn-card">
      <h2 className="jn-t">Recordarle algo</h2>
      <p className="jn-lead">
        Le llega a {patientInitials} en su app, con tu nombre. Él decide cuándo
        lo marca como leído.
      </p>

      <textarea
        className="jn-ta"
        rows={3}
        value={text}
        maxLength={MAX}
        placeholder="Acuérdate de llevar tu DNI y la carta del hospital."
        disabled={isSending}
        onChange={(event) => setText(event.target.value)}
      />

      <div className="jn-row">
        <button
          type="button"
          className="jn-btn jn-btn-pri"
          disabled={text.trim() === '' || isSending}
          onClick={() => void send()}
        >
          {isSending ? <i className="spin" /> : <BellIcon />}
          {isSending ? 'Enviando…' : 'Enviar recordatorio'}
        </button>
        <span className="jn-note">{MAX - text.length} caracteres</span>
      </div>
    </section>
  );
}
