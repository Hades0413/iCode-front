import { formatClockTime } from '../../../common/utils/format-date';
import { QrCode } from './qr-code';

const TTL_MINUTES = 15;

/** "MZRDHT" -> "MZR · DHT" — se dicta en dos tandas de a tres, no de un tirón. */
function formatForReading(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} · ${code.slice(half)}`;
}

/**
 * "Tu código para la consulta" — el atajo para que el médico vea el
 * resumen clínico sin que el paciente tenga que decir su documento en voz
 * alta ni el doctor tenga que buscarlo por nombre.
 *
 * Es UN solo código para las dos formas de usarlo: el QR lo codifica tal
 * cual, y si no se puede escanear, el mismo código se dicta y se tipea en
 * puente18.pe/consulta — no hay un código "de respaldo" distinto. Dura 15
 * minutos: pasado ese tiempo, no se renueva solo, se genera uno nuevo.
 */
export function ConsultationCodeCard({
  code,
  expiresAt,
  isGenerating,
  onGenerate,
}: Readonly<{
  code: string | null;
  expiresAt: string | null;
  isGenerating: boolean;
  onGenerate: () => Promise<boolean>;
}>) {
  let buttonLabel = 'Generar código único';
  if (isGenerating) {
    buttonLabel = 'Generando…';
  } else if (code) {
    buttonLabel = 'Generar otro código';
  }

  return (
    <section className="jn-card jn-qr-card">
      <h2 className="jn-t">Tu código para la consulta</h2>

      {code ? (
        <>
          <div className="jn-qr-wrap">
            <QrCode value={code} label={`Código de consulta ${code}`} />
          </div>

          <p className="jn-lead">
            Muéstralo cuando te atiendan: el doctor lo escanea y ve tu
            resumen de historia clínica al instante.
          </p>

          <hr className="jn-qr-sep" />

          <p className="jn-note">
            <b>¿No pueden escanear?</b> Genera un código único y díctaselo
            al doctor: lo escribe en <b>puente18.pe/consulta</b> y ve lo
            mismo.
          </p>

          <p className="jn-qr-code">{formatForReading(code)}</p>
          <p className="jn-note">
            Vence a las <b>{formatClockTime(new Date(expiresAt!))}</b> (dura{' '}
            {TTL_MINUTES} minutos). Si se pasa, generas otro y ya.
          </p>
        </>
      ) : (
        <p className="jn-lead">
          Genera tu código para que, cuando te atiendan, el doctor vea tu
          resumen de historia clínica al instante.
        </p>
      )}

      <button
        type="button"
        className="jn-btn"
        disabled={isGenerating}
        onClick={() => void onGenerate()}
      >
        {isGenerating ? <i className="spin" /> : null}
        {buttonLabel}
      </button>
    </section>
  );
}
