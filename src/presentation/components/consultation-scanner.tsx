import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from './icons';
import { Notice } from './ui/notice';

/**
 * El lector de QR del pase de consulta, para el médico del hospital de
 * adultos que atiende con el celular o la laptop en la mano.
 *
 * `getUserMedia` (cámara trasera) + un canvas fuera de pantalla: cada
 * ~150 ms se baja un cuadro del video y jsQR intenta decodificarlo. Es jsQR
 * y no `BarcodeDetector` —que sería gratis y nativo— porque esa API todavía
 * no existe en Firefox ni en Safari: el médico que abría la consulta desde
 * cualquiera de los dos no veía ni el botón, y el escáner que a veces no
 * está no es un escáner.
 *
 * Entrega el texto crudo del QR (`onDetected`) y nada más: verificar que
 * ese texto sea un pase válido es de quien lo usa (ver
 * consultation-pass.rules.ts), no de la cámara.
 *
 * Solo funciona sobre HTTPS o localhost: es una regla del navegador para
 * pedir la cámara, no nuestra.
 */
type ScannerState = 'idle' | 'starting' | 'scanning' | 'denied' | 'unavailable';

/** Cada cuánto se mira un cuadro. 150 ms lee al vuelo sin freír la batería. */
const FRAME_INTERVAL_MS = 150;

export function ConsultationScanner({
  onDetected,
}: Readonly<{ onDetected: (value: string) => void }>) {
  const [state, setState] = useState<ScannerState>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  /** El último texto entregado, para no dispararlo dos veces por el mismo QR. */
  const deliveredRef = useRef<string | null>(null);

  function stop() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
  }

  // La cámara se apaga sí o sí al salir de la pantalla: dejarla prendida es
  // la clase de bug que el usuario nota (la lucecita) y no perdona.
  useEffect(() => stop, []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('starting');
    try {
      // Acá es donde el navegador pide el permiso. La trasera por defecto:
      // se escanea el celular DEL PACIENTE, no un selfie.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stop();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setState('scanning');

      // El decodificador se baja recién acá: pesa, y solo lo necesita quien
      // abre la cámara — no todo el que entra a la app.
      const { default: jsQR } = await import('jsqr');

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      timerRef.current = window.setInterval(() => {
        if (!context || video.readyState < video.HAVE_ENOUGH_DATA) {
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, {
          inversionAttempts: 'dontInvert',
        });
        if (found?.data && deliveredRef.current !== found.data) {
          deliveredRef.current = found.data;
          stop();
          setState('idle');
          onDetected(found.data);
        }
      }, FRAME_INTERVAL_MS);
    } catch {
      stop();
      // Un permiso negado y una cámara ocupada por otra app caen acá igual:
      // para el médico las dos se resuelven igual (reintentar o tipear).
      setState('denied');
    }
  }

  return (
    <div className="jn-scan">
      {/* El <video> existe siempre —la ref tiene que estar montada antes de
          poder llamar a play()— pero solo se ve mientras se escanea. */}
      <div className={`jn-scan-view ${state === 'scanning' ? 'on' : ''}`}>
        <video ref={videoRef} playsInline muted />
        <span className="jn-scan-frame" aria-hidden="true" />
        {state === 'scanning' && (
          <span className="jn-scan-hint">Apuntá al QR del paciente</span>
        )}
      </div>

      {state === 'denied' && (
        <Notice tone="warn" className="wrapmax">
          No pudimos usar la cámara — puede ser que el permiso esté denegado o
          que otra app la esté usando. Podés volver a intentar, o escribir el
          código acá abajo.
        </Notice>
      )}
      {state === 'unavailable' && (
        <Notice tone="warn" className="wrapmax">
          Este dispositivo no tiene cámara disponible. Escribí el código del
          paciente acá abajo.
        </Notice>
      )}

      {state === 'scanning' ? (
        <button
          type="button"
          className="jn-btn"
          onClick={() => {
            stop();
            setState('idle');
          }}
        >
          Cerrar la cámara
        </button>
      ) : (
        <button
          type="button"
          className="jn-btn jn-btn-pri"
          disabled={state === 'starting'}
          onClick={() => void start()}
        >
          {state === 'starting' ? <i className="spin" /> : <CameraIcon />}
          {state === 'starting'
            ? 'Abriendo la cámara…'
            : state === 'idle'
              ? 'Escanear el QR con la cámara'
              : 'Volver a intentar con la cámara'}
        </button>
      )}
    </div>
  );
}
