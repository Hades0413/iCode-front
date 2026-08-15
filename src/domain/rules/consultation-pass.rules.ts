/**
 * El "pase de consulta": lo que viaja DENTRO del QR del paciente.
 *
 * El QR no lleva el código de 6 caracteres a la vista. Si lo llevara,
 * cualquier app de lectura de QR del teléfono de cualquiera —el de la cola
 * de al lado, el de la ventanilla— mostraría en pantalla un código que abre
 * una historia clínica. El pase es opaco: quien lo escanee con una app
 * genérica ve `P181.SzdGNFFYfDE3ODY...`, un texto sin significado.
 *
 * Además va **firmado y con vencimiento**, que es lo que lo vuelve un token
 * y no solo un texto ofuscado: el lector del médico verifica la firma antes
 * de usar el código, así un QR inventado a mano, uno de otra app o el
 * pantallazo del pase de la semana pasada se rechazan sin llegar a pedirle
 * nada al servidor.
 *
 * Lo que esto NO es, dicho claro: la clave viaja en el bundle, así que
 * alguien que lea nuestro JavaScript puede firmar un pase. Esto detiene al
 * lector genérico y a la manipulación casual, no a un atacante que estudie
 * la app. El secreto de verdad vive del lado del servidor: cuando exista
 * iCode-back, la misma estructura (payload + firma + vencimiento) se firma
 * allá con una clave que nunca baja al navegador, y este archivo pasa a
 * solo verificar. Por eso el formato ya lleva versión.
 */

/** Marca y versión del formato, para poder cambiarlo sin romper lectores viejos. */
const PASS_PREFIX = 'P181';

/**
 * Cuántos caracteres de la firma viajan. 16 de base64url son 96 bits: de
 * sobra para que no se acierte por prueba y error, y cortos para que el QR
 * no se llene de módulos y siga enfocándose rápido desde lejos.
 */
const SIGNATURE_LENGTH = 16;

/**
 * La clave con la que se firma. Ver la nota de arriba: esto es integridad,
 * no secreto. Está acá y no en una variable de entorno a propósito — una
 * `VITE_` también termina en el bundle, y esconderla ahí solo haría pensar
 * que es un secreto de verdad.
 */
const PASS_KEY = 'puente18.consultation-pass.v1';

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(text: string): string | null {
  try {
    const padded = text
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(text.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(PASS_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(mac)).slice(0, SIGNATURE_LENGTH);
}

/**
 * Arma el pase que se dibuja en el QR. `expiresAt` es el mismo vencimiento
 * que ya tiene el código (15 minutos): viaja adentro para que el lector
 * pueda rechazar un pase vencido sin preguntarle a nadie.
 */
export async function encodeConsultationPass(
  code: string,
  expiresAt: string,
): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(`${code}|${Date.parse(expiresAt)}`),
  );
  return `${PASS_PREFIX}.${payload}.${await sign(payload)}`;
}

/**
 * Por qué un pase no sirve. Son cuatro cosas distintas y el médico necesita
 * saber cuál es: "no es un pase nuestro" se arregla escaneando el QR
 * correcto, y "venció" se arregla pidiéndole al paciente que genere otro.
 */
export type ConsultationPassFailure =
  'FORMAT' | 'SIGNATURE' | 'EXPIRED' | 'UNSUPPORTED';

export type ConsultationPassResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; reason: ConsultationPassFailure };

/** Qué decirle al médico por cada motivo. */
export const CONSULTATION_PASS_MESSAGES: Record<
  ConsultationPassFailure,
  string
> = {
  FORMAT:
    'Ese QR no es un pase de Puente 18 — pedile al paciente que abra su app y te muestre el suyo.',
  SIGNATURE:
    'Ese pase no es válido. Pedile al paciente que genere uno nuevo desde su app.',
  EXPIRED:
    'Ese pase ya venció (duran 15 minutos). Pedile al paciente que genere uno nuevo.',
  UNSUPPORTED:
    'Este navegador no puede verificar el pase. Escribí el código a mano acá abajo.',
};

/**
 * Abre el pase y lo valida. Devuelve el código de 6 caracteres solo si el
 * texto es nuestro, la firma coincide y todavía no venció — los tres, en
 * ese orden: verificar la firma antes de mirar la fecha evita creerle el
 * vencimiento a un payload que cualquiera pudo haber editado.
 */
export async function decodeConsultationPass(
  raw: string,
): Promise<ConsultationPassResult> {
  if (!crypto?.subtle) {
    return { ok: false, reason: 'UNSUPPORTED' };
  }

  const [prefix, payload, signature] = raw.trim().split('.');
  if (prefix !== PASS_PREFIX || !payload || !signature) {
    return { ok: false, reason: 'FORMAT' };
  }
  if ((await sign(payload)) !== signature) {
    return { ok: false, reason: 'SIGNATURE' };
  }

  const decoded = fromBase64Url(payload);
  const [code, expiresAtMs] = decoded?.split('|') ?? [];
  const expiresAt = Number(expiresAtMs);
  if (!code || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: 'FORMAT' };
  }
  if (expiresAt <= Date.now()) {
    return { ok: false, reason: 'EXPIRED' };
  }

  return { ok: true, code, expiresAt: new Date(expiresAt).toISOString() };
}
