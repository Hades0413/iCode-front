import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from './icons';
import { Notice } from './ui/notice';

/**
 * Detección de QR nativa del navegador — sin librería nueva. Es una API
 * experimental (Chrome/Edge de escritorio y Android; ni Firefox ni Safari
 * la tienen todavía), por eso todo lo que la usa comprueba primero
 * `scanSupported` y el botón de cámara desaparece si no está.
 */
interface BarcodeDetectorResult {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<BarcodeDetectorResult[]>;
}
interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
}
declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const scanSupported =
  typeof window !== 'undefined' && 'BarcodeDetector' in window;

/**
 * El botón "Escanear el QR con la cámara" del pase de consulta. Abre la
 * cámara trasera, lee frames hasta encontrar un QR y avisa con el valor
 * crudo — quien lo use decide qué hacer con el código (normalizarlo,
 * pedir el resumen, etc.), este componente no sabe nada de eso.
 */
export function ConsultationScanner({
  onDetected,
}: Readonly<{ onDetected: (value: string) => void }>) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);

  function stopScan() {
    cancelledRef.current = true;
    setIsScanning(false);
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
  }

  // Apaga la cámara si la persona se va de la pantalla con el escaneo abierto.
  useEffect(() => stopScan, []);

  async function startScan() {
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      cancelledRef.current = false;
      setIsScanning(true);
    } catch {
      setScanError(
        'No se pudo abrir la cámara — revisá los permisos del navegador.',
      );
    }
  }

  // Arranca a leer frames recién cuando el <video> ya está montado y tiene
  // la cámara enchufada — por eso va en su propio efecto, atado a isScanning.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    const Detector = window.BarcodeDetector;
    if (!isScanning || !video || !stream || !Detector) {
      return;
    }
    video.srcObject = stream;
    void video.play();
    const detector = new Detector({ formats: ['qr_code'] });

    function tick() {
      if (cancelledRef.current || !video) {
        return;
      }
      detector
        .detect(video)
        .then((codes) => {
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            stopScan();
            onDetected(value);
            return;
          }
          requestAnimationFrame(tick);
        })
        .catch(() => {
          // Un frame que no se pudo leer no es el final — sigue probando.
          requestAnimationFrame(tick);
        });
    }
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  if (isScanning) {
    return (
      <div className="stackv">
        <video
          ref={videoRef}
          className="jn-qr-wrap"
          style={{ width: '100%', maxWidth: 320, borderRadius: 16 }}
          muted
          playsInline
        />
        <button type="button" className="jn-btn" onClick={stopScan}>
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <>
      {scanSupported ? (
        <button
          type="button"
          className="jn-btn jn-btn-pri"
          onClick={() => void startScan()}
        >
          <CameraIcon />
          Escanear el QR con la cámara
        </button>
      ) : (
        <p className="jn-note">
          Tu navegador no soporta escanear directo desde acá — usá el código
          de abajo.
        </p>
      )}
      {scanError && (
        <Notice tone="crit" className="wrapmax">
          {scanError}
        </Notice>
      )}
    </>
  );
}
