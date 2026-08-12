import { useEffect, useRef, useState } from 'react';
import type {
  JourneyChecklistItem,
  TransitionJourney,
} from '../../../domain/entities/journey.entity';
import {
  checklistDoneCount,
  checklistProgress,
  pendingSentence,
} from '../../../domain/rules/journey.rules';
import { CheckIcon } from '../icons';

/**
 * La preparación: lo que el paciente tiene que saber hacer solo antes de
 * cruzar.
 *
 * **Solo el dueño la marca.** Cuando mira quien lo acompaña, la misma lista
 * se ve entera pero no se toca: si el padre pudiera tacharla, dejaría de
 * decir lo que el chico sabe hacer y pasaría a decir lo que el padre cree que
 * sabe — y la lista existe justamente para lo primero.
 *
 * El resumen de arriba no es un porcentaje suelto: dice **qué falta**, con
 * las mismas palabras con las que lo diría él.
 */
export function ChecklistCard({
  journey,
  canTick,
  busyId,
  onToggle,
}: Readonly<{
  journey: TransitionJourney;
  /** El que mira es el dueño de la información. */
  canTick: boolean;
  /** Ítem con un cambio en vuelo. */
  busyId: string | null;
  onToggle: (item: JourneyChecklistItem) => void;
}>) {
  const done = checklistDoneCount(journey);
  const total = journey.checklist.length;
  const percent = Math.round(checklistProgress(journey) * 100);
  const pending = pendingSentence(journey);
  const allDone = total > 0 && done === total;

  // El festejo: cuando el último paso se marca (y solo en ese momento, no al
  // abrir la pestaña con todo ya hecho), llueve confeti un par de segundos.
  // Completar la preparación ES un logro — la app lo dice con una fiesta
  // corta, no con otro párrafo.
  const wasAllDone = useRef(allDone);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const was = wasAllDone.current;
    wasAllDone.current = allDone;
    if (!was && allDone) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [allDone]);

  return (
    <section className="jn-card">
      {celebrating && (
        <div className="jn-confetti" aria-hidden="true">
          {Array.from({ length: 16 }, (_, piece) => (
            <i key={piece} style={{ ['--i' as string]: piece }} />
          ))}
        </div>
      )}

      <div className="jn-card-h">
        <h2 className="jn-t">{canTick ? 'Tus pasos' : 'Sus pasos'}</h2>
        <span className={`jn-count ${allDone ? 'ok' : ''}`}>
          {done} de {total}
        </span>
      </div>

      <div className="jn-meter" role="img" aria-label={`${percent} % listo`}>
        <i style={{ ['--w' as string]: `${percent}%` }} />
      </div>

      <p className="jn-lead">
        {pending
          ? canTick
            ? `Te falta ${pending}.`
            : `Le falta ${pending}.`
          : canTick
            ? '¡Todo listo! Llegas a tu cita sabiendo lo tuyo. 🎉'
            : '¡Completó todo! Llega a su cita sabiendo lo suyo. 🎉'}
      </p>

      <ul className="jn-list">
        {journey.checklist.map((item) => (
          <li key={item.id}>
            {canTick ? (
              <button
                type="button"
                className={`jn-item ${item.done ? 'on' : ''}`}
                aria-pressed={item.done}
                disabled={busyId === item.id}
                onClick={() => onToggle(item)}
              >
                <ItemBody item={item} busy={busyId === item.id} />
              </button>
            ) : (
              <div className={`jn-item flat ${item.done ? 'on' : ''}`}>
                <ItemBody item={item} busy={false} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {!canTick && (
        <p className="jn-note">
          Esta lista la marca {journey.initials} desde su celular. Acompañarlo
          es recordarle, no tacharla por él.
        </p>
      )}
    </section>
  );
}

function ItemBody({
  item,
  busy,
}: Readonly<{ item: JourneyChecklistItem; busy: boolean }>) {
  return (
    <>
      <span className="jn-box" aria-hidden="true">
        {busy ? <i className="spin" /> : item.done ? <CheckIcon /> : null}
      </span>
      <span className="jn-item-t">
        <b>{item.title}</b>
        <span>{item.detail}</span>
      </span>
    </>
  );
}
