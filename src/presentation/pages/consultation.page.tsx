import { useEffect, useRef, useState } from 'react';
import { patientService } from '../../composition-root';
import type { ClinicalSummary } from '../../domain/entities/clinical-summary.entity';
import { formatShortDate } from '../../common/utils/format-date';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { CameraIcon } from '../components/icons';
import { Notice } from '../components/ui/notice';

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

/** Deja solo lo que un código puede tener: sin espacios, sin el "·" de lectura, en mayúsculas. */
function normalizeCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
}

/**
 * El "pase de consulta": el médico del hospital de adultos ve la historia
 * clínica de transferencia de alguien que recién cruzó, a partir del código
 * de 6 caracteres que esa persona genera en su propia app — nunca a partir
 * de su documento dicho en voz alta.
 *
 * Dos caminos al mismo recurso (GET /patients/consultation/:code/clinical-summary,
 * el mismo permiso PATIENT_READ que ya protegía la ficha por id): escanear el
 * QR con la cámara, o escribir el código a mano. El QR es un atajo, no el
 * único camino — por eso el código también se puede dictar y tipear.
 */
export function ConsultationPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'notfound'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);

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

  async function open(rawCode: string) {
    const normalized = normalizeCode(rawCode);
    if (normalized.length !== 6) {
      return;
    }
    setStatus('loading');
    setError(null);
    setSummary(null);
    try {
      const result =
        await patientService.getClinicalSummaryByConsultationCode(
          normalized,
        );
      if (!result) {
        setStatus('notfound');
        return;
      }
      setSummary(result);
      setStatus('idle');
    } catch (err) {
      setStatus('idle');
      setError(getApiErrorMessage(err));
    }
  }

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

    async function tick() {
      if (cancelledRef.current || !video) {
        return;
      }
      try {
        const codes = await detector.detect(video);
        const value = codes[0]?.rawValue?.trim();
        if (value) {
          stopScan();
          setCode(normalizeCode(value));
          await open(value);
          return;
        }
      } catch {
        // Un frame que no se pudo leer no es el final — sigue probando.
      }
      requestAnimationFrame(() => void tick());
    }
    void tick();
     
  }, [isScanning]);

  function reset() {
    setSummary(null);
    setStatus('idle');
    setError(null);
    setCode('');
  }

  if (summary) {
    return <ConsultationSummaryView summary={summary} onReset={reset} />;
  }

  return (
    <div className="jn-body">
      <section className="jn-card">
        <h2 className="jn-t">Ver a un paciente</h2>
        <p className="jn-lead">
          Escaneá el QR que el paciente tiene en su app, o escribí su código
          de consulta. Vas a ver su resumen de historia clínica de
          transferencia.
        </p>

        {isScanning ? (
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
        ) : (
          scanSupported && (
            <button
              type="button"
              className="jn-btn jn-btn-pri"
              onClick={() => void startScan()}
            >
              <CameraIcon />
              Escanear el QR con la cámara
            </button>
          )
        )}
        {scanError && (
          <Notice tone="crit" className="wrapmax">
            {scanError}
          </Notice>
        )}
        {!scanSupported && !isScanning && (
          <p className="jn-note">
            Tu navegador no soporta escanear directo desde acá — usá el
            código de abajo.
          </p>
        )}
      </section>

      <section className="jn-card">
        <div className="jn-divider">O escribí su código</div>
        <p className="jn-note">
          El paciente lo genera en su app y dura 15 minutos.
        </p>
        <input
          className="jn-qr-code"
          style={{ border: 'none' }}
          placeholder="EJ.: K7F4QX"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          onChange={(event) => setCode(normalizeCode(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void open(code);
            }
          }}
        />
        {status === 'notfound' && (
          <Notice tone="warn" className="wrapmax">
            Ese código no existe o ya venció — pedile al paciente que genere
            uno nuevo.
          </Notice>
        )}
        {error && (
          <Notice tone="crit" className="wrapmax">
            {error}
          </Notice>
        )}
        <button
          type="button"
          className="jn-btn jn-btn-pri"
          disabled={code.length !== 6 || status === 'loading'}
          onClick={() => void open(code)}
        >
          {status === 'loading' ? <i className="spin" /> : null}
          {status === 'loading' ? 'Buscando…' : 'Abrir el resumen'}
        </button>
      </section>
    </div>
  );
}

/** El resumen en modo lectura: nada de botones de editar ni de firmar — acá el médico solo mira. */
function ConsultationSummaryView({
  summary,
  onReset,
}: Readonly<{ summary: ClinicalSummary; onReset: () => void }>) {
  return (
    <div className="jn-body">
      <section className="jn-card">
        <h2 className="jn-t">Resumen de historia clínica</h2>

        {summary.status === 'APPROVED' ? (
          <Notice tone="ok" className="wrapmax">
            <b>
              Firmada por {summary.approvedBy ?? 'un médico del INSN'}
              {summary.approvedAt &&
                ` el ${formatShortDate(summary.approvedAt)}`}
              .
            </b>
          </Notice>
        ) : (
          <Notice tone="warn" className="wrapmax">
            <b>Esto sigue siendo un borrador</b> — cruzó los 18 sin que nadie
            lo firmara todavía.
          </Notice>
        )}

        <div className="stackv">
          {summary.sections.map((section) => (
            <div key={section.id}>
              <div className="jn-sub">{section.title}</div>
              <p className="jn-note">
                {section.body.trim() === ''
                  ? `Sin escribir — ${section.hint}`
                  : section.body}
              </p>
            </div>
          ))}
        </div>

        <button type="button" className="jn-btn" onClick={onReset}>
          Ver a otro paciente
        </button>
      </section>
    </div>
  );
}
