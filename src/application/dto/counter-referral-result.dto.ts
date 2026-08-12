import type { Patient } from '../../domain/entities/patient.entity';
import type { CounterReferral } from '../../domain/entities/referral.entity';

/**
 * Lo que contesta el servidor cuando se sube o se envía la carta: el
 * documento **y** la fila del paciente.
 *
 * Mismo criterio que ClinicalSummaryResult: cambian juntos (subirla mueve
 * `counterReferralStatus`, enviarla también), así que devolverlos juntos
 * evita recargar la bandeja entera después de cada acción.
 */
export interface CounterReferralResult {
  patient: Patient;
  counterReferral: CounterReferral;
}
