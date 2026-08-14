/**
 * Lo que dijo el destino (posta u hospital de adultos) sobre la historia
 * clínica de transferencia ya firmada — aceptó el caso, lo rechazó, o lo
 * observó (con un PDF explicando qué falta). 1:1 con el paciente, mismo
 * criterio que CounterReferral: NONE no existe como recurso, es que
 * todavía no hay fila (el endpoint contesta 404 y el repositorio lo
 * traduce a null).
 *
 * Solo tiene sentido una vez que la historia clínica está firmada
 * (summaryStatus === 'APPROVED') — el servidor lo exige con un 409.
 */
export type ReferralReviewStatus = 'NONE' | 'ACCEPTED' | 'REJECTED' | 'OBSERVED';

export interface ReferralReview {
  patientId: string;
  status: Exclude<ReferralReviewStatus, 'NONE'>;
  /** Motivo del rechazo, o qué falta cuando observó. null si aceptó. */
  notes: string | null;
  /** El PDF adjunto — solo cuando la revisión fue OBSERVED. */
  fileName: string | null;
  fileSize: number | null;
  reviewedBy: string;
  /** ISO 8601. */
  reviewedAt: string;
}
