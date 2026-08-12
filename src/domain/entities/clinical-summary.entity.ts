import type { ClinicalSummaryStatus } from './patient.entity';

/**
 * La **historia clínica de transferencia**: el resumen de 2 hojas que viaja
 * con el paciente cuando cruza al sistema de adultos. Es lo único que el
 * médico del otro lado va a leer antes de verlo por primera vez.
 *
 * El borrador lo arma la IA con lo que ya está en la ficha, pero **el que
 * firma es siempre un médico**. Por eso el recurso tiene dos estados y no
 * uno: DRAFT es texto propuesto (no vale para nada todavía) y APPROVED es
 * texto firmado por una persona con nombre y apellido. Un modelo no aprueba
 * su propio texto — si esa distinción se pierde, la app estaría mandando a
 * un hospital un documento clínico que nadie revisó.
 *
 * Capa pura: sin React, sin axios y sin nada de presentación.
 */

/** Un bloque del resumen. Seis bloques = las 2 hojas. */
export interface ClinicalSummarySection {
  id: string;
  /** "Diagnóstico y desde cuándo". */
  title: string;
  /**
   * El texto. Vacío = todavía no se escribió: es lo que hace que el resumen
   * esté al 40 % y no al 85 % (ver summaryProgress en las reglas).
   */
  body: string;
  /** Qué va aquí, para el que lo tiene que completar a mano. */
  hint: string;
}

/** Quién escribió algo: el generador o una persona. */
export interface ClinicalSummaryAuthor {
  kind: 'AI' | 'HUMAN';
  /** "Asistente de resumen clínico" o "Dr. Álvaro Solís". */
  name: string;
}

export interface ClinicalSummary {
  patientId: string;
  /**
   * NONE no existe aquí: si no hay resumen, no hay recurso (el endpoint
   * contesta 404 y el repositorio lo devuelve como null).
   */
  status: Exclude<ClinicalSummaryStatus, 'NONE'>;
  sections: ClinicalSummarySection[];
  /**
   * Lo que el borrador NO pudo confirmar con lo que hay en la ficha:
   * "falta el peso del último control", "confirmar la fecha del ecocardio".
   * Se muestran aparte y en primer plano — un resumen generado que se lee
   * como definitivo es la forma más rápida de que alguien firme sin leer.
   */
  pendingChecks: string[];
  draftedBy: ClinicalSummaryAuthor;
  /** ISO 8601. */
  draftedAt: string;
  /** Última edición humana del borrador. null = nadie lo tocó todavía. */
  editedBy: string | null;
  editedAt: string | null;
  /** Quién firmó. Siempre una persona. */
  approvedBy: string | null;
  approvedAt: string | null;
}
