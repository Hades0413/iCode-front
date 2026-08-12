import type { TransitionJourney } from '../../../domain/entities/journey.entity';

/**
 * Las dudas de siempre, plegadas.
 *
 * Se usa `<details>` nativo y no un acordeón hecho a mano: en el celular ya
 * funciona con el teclado, con el lector de pantalla y con la búsqueda del
 * navegador, y no hay estado que mantener.
 */
export function GuideCard({
  journey,
}: Readonly<{ journey: TransitionJourney }>) {
  return (
    <section className="jn-card">
      <h2 className="jn-t">Preguntas frecuentes</h2>
      <div className="jn-guide">
        {journey.guide.map((entry) => (
          <details key={entry.question}>
            <summary>{entry.question}</summary>
            <p>{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
