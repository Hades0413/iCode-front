import type { Patient } from '../../domain/entities/patient.entity';
import type { CounterReferral } from '../../domain/entities/referral.entity';

/**
 * Una fila de la bandeja de contrarreferencias: el paciente y su carta.
 *
 * Van juntos en la misma respuesta porque la pantalla necesita las dos cosas
 * de todos —el estado para ordenar el trabajo, el archivo para poder mirarlo—
 * y pedir la carta de a una sería un request por fila para pintar una lista.
 */
export interface CounterReferralQueueItem {
  patient: Patient;
  /** null = todavía no se subió (lo normal apenas cumplen 18). */
  counterReferral: CounterReferral | null;
}
