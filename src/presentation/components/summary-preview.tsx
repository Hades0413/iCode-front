import { useCallback } from 'react';
import { patientService } from '../../composition-root';
import type { ClinicalSummary } from '../../domain/entities/clinical-summary.entity';
import { formatShortDate } from '../../common/utils/format-date';
import { Notice } from './ui/notice';
import { LoadingRows } from './ui/states';
import { useAsyncResource } from '../hooks/use-async-resource';
import styles from './summary-preview.module.css';

const NO_SUMMARY: ClinicalSummary | null = null;

/**
 * La historia clínica en modo lectura: las 2 hojas tal como viajaron, sin un
 * solo botón de edición.
 *
 * Es otra pieza que el panel del médico a propósito: aquí el documento ya
 * está firmado y cerrado — previsualizarlo es mirar una constancia, y colarle
 * los controles de borrador sería insinuar que todavía se puede tocar.
 *
 * Carga recién cuando se monta: el que abre la ficha no siempre quiere las
 * 2 hojas, y pedirlas de entrada sería un request que la mayoría no usa.
 */
export function SummaryPreview({ patientId }: Readonly<{ patientId: string }>) {
  const load = useCallback(
    () => patientService.getClinicalSummary(patientId),
    [patientId],
  );
  const { data, isLoading, error, reload } = useAsyncResource(
    load,
    NO_SUMMARY,
    'Prueba de nuevo.',
  );

  if (isLoading) {
    return <LoadingRows rows={4} label="Cargando la historia clínica" />;
  }

  if (error) {
    return (
      <>
        <Notice tone="crit" className="wrapmax">
          <b>No se pudo cargar la historia clínica.</b> {error.message}
        </Notice>
        <div className="row" style={{ paddingTop: 12 }}>
          <button type="button" className="btn btn-sm" onClick={reload}>
            Reintentar
          </button>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <Notice tone="warn" className="wrapmax">
        Este paciente no tiene historia clínica de transferencia registrada.
      </Notice>
    );
  }

  return (
    <div className="stackv">
      {data.status === 'APPROVED' ? (
        <Notice tone="ok" className="wrapmax">
          <b>
            Firmada por {data.approvedBy ?? 'un médico del INSN'}
            {data.approvedAt && ` el ${formatShortDate(data.approvedAt)}`}.
          </b>{' '}
          Es el documento que viajó con el paciente.
        </Notice>
      ) : (
        <Notice tone="warn" className="wrapmax">
          <b>Quedó en borrador:</b> cruzó los 18 sin la firma. Lo que se ve aquí
          es lo último que se escribió.
        </Notice>
      )}

      <div className={styles['summary-preview-sheet']}>
        {data.sections.map((section) => (
          <article
            key={section.id}
            className={`${styles['summary-preview-sheet-section']} ${
              section.body.trim() === ''
                ? styles['summary-preview-sheet-section-gap']
                : ''
            }`}
          >
            <h3 className={styles['summary-preview-sheet-section-title']}>
              {section.title}
            </h3>
            {section.body.trim() === '' ? (
              <p
                className={`${styles['summary-preview-sheet-section-body']} ${styles['summary-preview-sheet-section-body-empty']}`}
              >
                Sin escribir — {section.hint}
              </p>
            ) : (
              <p className={styles['summary-preview-sheet-section-body']}>
                {section.body}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
