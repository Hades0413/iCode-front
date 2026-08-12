import type { CounterReferralFormat } from '../../domain/entities/referral.entity';

/**
 * La carta que sube el área, ya redactada en el sistema externo de
 * contrarreferencias.
 *
 * Viaja el archivo entero (`File`) porque contra iCode-back esto es un
 * multipart: el PDF o el Word tiene que terminar en el storage del hospital.
 * El resto son los datos que el área tipea al subirlo.
 */
export interface CounterReferralUpload {
  file: File;
  format: CounterReferralFormat;
  /** Número de carta del sistema externo. Opcional: no siempre lo traen. */
  code: string | null;
}
