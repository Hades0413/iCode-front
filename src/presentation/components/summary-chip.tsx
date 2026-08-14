import type { Patient } from '../../domain/entities/patient.entity';
import {
  SUMMARY_STAGE_HINTS,
  SUMMARY_STAGE_LABELS,
  summaryPercent,
  summaryStage,
  type SummaryStage,
} from '../../domain/rules/clinical-summary.rules';

/**
 * En qué anda la historia clínica de transferencia de este paciente.
 *
 * Cuatro escalones y un color cada uno, del gris al verde: sin generar → en
 * preparación → revisión → validado. El punto de color es lo que se lee de
 * lejos cuando la lista tiene treinta filas; el texto está para el que
 * necesita el nombre exacto.
 *
 * "Aún no arranca" no es un estado del resumen: es que al paciente todavía
 * le faltan más de 3 meses para los 18 y el proceso no empezó. Por eso va
 * apagado y sin punto — no hay nada que hacer ahí.
 */
const CHIP_CLASS: Record<SummaryStage, string> = {
  LOCKED: 'chip none',
  NONE: 'chip none',
  PREPARING: 'chip draft',
  REVIEW: 'chip review',
  VALIDATED: 'chip ok',
};

export function SummaryChip({ patient }: Readonly<{ patient: Patient }>) {
  const stage = summaryStage(patient);
  return (
    <span className={CHIP_CLASS[stage]} title={SUMMARY_STAGE_HINTS[stage]}>
      {stage !== 'LOCKED' && stage !== 'NONE' && <i className="dot" />}
      {SUMMARY_STAGE_LABELS[stage]}
    </span>
  );
}

/** El color de la barra sale del escalón, no de un umbral aparte. */
const METER_CLASS: Record<SummaryStage, string> = {
  LOCKED: 'm-none',
  NONE: 'm-none',
  PREPARING: 'm-prep',
  REVIEW: 'm-rev',
  VALIDATED: 'm-ok',
};

/**
 * La celda "Resumen" de la tabla: cuánto está armado, en una barra con su
 * número, y en qué escalón está.
 *
 * Los tres van juntos y no en columnas separadas porque son el mismo dato
 * mirado de tres maneras — 85 %, una barra casi llena y "Revisión" dicen
 * siempre lo mismo. La barra es la que hace que la columna se lea de un
 * golpe: en una lista de diez filas, comparar largos es instantáneo y
 * comparar números no.
 */
export function SummaryProgress({ patient }: Readonly<{ patient: Patient }>) {
  const stage = summaryStage(patient);
  const percent = summaryPercent(patient.summaryProgress);

  return (
    <div className="sumcell">
      {stage !== 'LOCKED' && (
        <div className="sumbar">
          <span
            className={`summeter ${METER_CLASS[stage]}`}
            role="img"
            aria-label={`${percent} % armado`}
          >
            <i style={{ ['--w' as string]: `${percent}%` }} />
          </span>
          <span className="sumpct">
            <b>{percent}</b> %
          </span>
        </div>
      )}
      <SummaryChip patient={patient} />
    </div>
  );
}
