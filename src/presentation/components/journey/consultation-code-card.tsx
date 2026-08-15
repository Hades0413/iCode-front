import { useEffect, useState } from 'react';
import { formatClockTime } from '../../../common/utils/format-date';
import { encodeConsultationPass } from '../../../domain/rules/consultation-pass.rules';
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
 * Es UN solo código para las dos formas de usarlo, pero **no viaja igual en
 * las dos**. Dictado es lo que se ve: seis caracteres que el médico escribe
 * en puente18.pe/consulta. Dentro del QR va cifrado como un pase firmado
 * (ver consultation-pass.rules.ts), porque un QR lo lee cualquier app del
 * teléfono de cualquiera y el código en claro ahí sería una historia
 * clínica abierta a quien apunte la cámara desde la fila de al lado.
 *
 * Dura 15 minutos: pasado ese tiempo, no se renueva solo, se genera uno
 * nuevo — y el vencimiento viaja dentro del pase, así el lector del médico
 * rechaza un pantallazo viejo sin preguntarle nada al servidor.
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
  // El pase que se dibuja en el QR. Se arma aparte porque firmarlo es
  // asíncrono (Web Crypto). Se guarda junto al código del que salió: al
  // generar otro, el pase anterior deja de coincidir y el QR viejo no se
  // dibuja ni un cuadro mientras se firma el nuevo.
  const [pass, setPass] = useState<{ code: string; value: string } | null>(
    null,
  );

  useEffect(() => {
    if (!code || !expiresAt) {
      return;
    }
    let alive = true;
    encodeConsultationPass(code, expiresAt)
      .then((value) => {
        if (alive) setPass({ code, value });
      })
      .catch(() => {
        if (alive) setPass(null);
      });
    return () => {
      alive = false;
    };
  }, [code, expiresAt]);

  const qrValue = pass?.code === code ? pass.value : null;

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
            {qrValue ? (
              // El label no dice el código: es el texto que lee un lector de
              // pantalla en voz alta, y decirlo ahí sería sacarlo del QR por
              // la puerta de atrás.
              <QrCode value={qrValue} label="Tu código QR para la consulta" />
            ) : (
              <p className="jn-note">Preparando tu código…</p>
            )}
          </div>

          <p className="jn-lead">
            Muéstralo cuando te atiendan: el doctor lo escanea y ve tu
            resumen de historia clínica al instante. Solo la app del doctor
            puede leerlo — si alguien más le apunta con la cámara, no ve
            nada.
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
