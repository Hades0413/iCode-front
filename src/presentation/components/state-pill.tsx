import type { TransitionState } from '../../domain/entities/patient.entity';
import {
  TRANSITION_STATE_FORMAL_LABELS,
  TRANSITION_STATE_LABELS,
} from '../../domain/rules/transition.rules';

/**
 * Clases del sistema de diseño por estado. El color dice en qué tramo del
 * recorrido está el caso — teal en pediatría, ámbar mientras lo tiene la
 * posta, índigo cuando ya es del hospital de adultos — o que algo va mal.
 * No es decoración.
 */
const PILL_CLASS: Record<TransitionState, string> = {
  PENDING: 's-pend',
  IN_PREPARATION: 's-prep',
  REFERRED_TO_POST: 's-posta',
  APPOINTMENT_IN_PROCESS: 's-gestion',
  APPOINTMENT_GRANTED: 's-cita',
  FIRST_CARE_DONE: 's-aten',
  LOST_TO_FOLLOW_UP: 's-perd',
  READMITTED: 's-rein',
};

/**
 * La etiqueta visible es la simple ("En la posta"); el nombre formal
 * ("Derivado a la posta") queda en el tooltip, para quien necesite el término
 * que va en un informe.
 */
export function StatePill({ state }: Readonly<{ state: TransitionState }>) {
  return (
    <span
      className={`pill ${PILL_CLASS[state]}`}
      title={TRANSITION_STATE_FORMAL_LABELS[state]}
    >
      <i className="dot" />
      {TRANSITION_STATE_LABELS[state]}
    </span>
  );
}
