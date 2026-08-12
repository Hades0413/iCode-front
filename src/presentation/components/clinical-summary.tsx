import { useState } from 'react';
import type {
  ClinicalSummary,
  ClinicalSummarySection,
} from '../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../domain/entities/patient.entity';
import {
  canApproveSummary,
  canGenerateSummary,
  canRegenerateSummary,
  signBlockedReason,
  summaryBlockedReason,
  summaryPercent,
} from '../../domain/rules/clinical-summary.rules';
import { PERMISSIONS } from '../../domain/rules/permissions';
import { formatShortDate } from '../../common/utils/format-date';
import { SignIcon, SparkIcon } from './icons';
import { Notice } from './ui/notice';
import { Section } from './ui/section';
import { LoadingRows } from './ui/states';
import type { LoadError } from '../hooks/use-async-resource';

/** Qué acción está en vuelo, para deshabilitar solo esa. */
export type SummaryBusy = 'generate' | 'save' | 'approve' | null;

/**
 * La historia clínica de transferencia dentro de la ficha del paciente: las
 * 2 hojas que van a viajar con él.
 *
 * El flujo es siempre el mismo y está a la vista:
 *
 *   sin generar  →  [Generar con IA]  →  borrador  →  revisar / corregir
 *                                                   →  [Firmar]  →  validado
 *
 * Dos decisiones que no son de diseño sino de seguridad clínica:
 *
 * 1. Un borrador **nunca** se muestra como si fuera un documento. Lleva su
 *    aviso arriba, el porcentaje no llega al 100 % y las dudas que la IA no
 *    pudo resolver van en primer plano, antes del texto — si el que revisa
 *    tiene que ir a buscarlas, no las va a leer.
 * 2. Firmar pide confirmación con el nombre de quien firma. Es irreversible
 *    y es el acto que convierte texto propuesto en un documento clínico que
 *    otro médico va a usar para atender a esta persona.
 */
export function ClinicalSummaryPanel({
  patient,
  summary,
  isLoading,
  error,
  canWrite,
  signerName,
  busy,
  onGenerate,
  onSave,
  onApprove,
  onRetry,
}: Readonly<{
  patient: Patient;
  summary: ClinicalSummary | null;
  isLoading: boolean;
  error: LoadError | null;
  /** El usuario tiene PATIENTS_WRITE. */
  canWrite: boolean;
  /** Quién firmaría, para poder decirlo antes de firmar. */
  signerName: string;
  busy: SummaryBusy;
  onGenerate: () => void;
  /**
   * Devuelve si el guardado salió bien. Importa: si el servidor falla, el
   * panel se queda en modo edición con el texto que el médico escribió — un
   * error de red no puede borrarle las correcciones.
   */
  onSave: (sections: ClinicalSummarySection[]) => Promise<boolean>;
  onApprove: () => void;
  onRetry: () => void;
}>) {
  /** Copia editable del borrador. null = no se está editando. */
  const [editing, setEditing] = useState<ClinicalSummarySection[] | null>(null);
  const [confirmingSignature, setConfirmingSignature] = useState(false);

  const blocked = summaryBlockedReason(patient);
  const percent = summaryPercent(patient.summaryProgress);

  function startEditing(current: ClinicalSummary) {
    setConfirmingSignature(false);
    setEditing(current.sections.map((section) => ({ ...section })));
  }

  function changeSection(id: string, body: string) {
    setEditing(
      (sections) =>
        sections?.map((section) =>
          section.id === id ? { ...section, body } : section,
        ) ?? null,
    );
  }

  return (
    <Section
      title="Historia clínica de transferencia"
      aside={
        summary || blocked === null ? `${percent} % · las 2 hojas` : undefined
      }
    >
      {isLoading ? (
        <LoadingRows rows={4} label="Cargando la historia clínica" />
      ) : error ? (
        <>
          <Notice tone="crit" className="wrapmax">
            <b>No se pudo cargar la historia clínica.</b> {error.message}
          </Notice>
          <div className="row" style={{ paddingTop: 14 }}>
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              Reintentar
            </button>
          </div>
        </>
      ) : !summary ? (
        <EmptySummary
          patient={patient}
          blocked={blocked}
          canWrite={canWrite}
          isGenerating={busy === 'generate'}
          onGenerate={onGenerate}
        />
      ) : (
        <div className="stackv">
          <SummaryHeader summary={summary} />

          {summary.status === 'DRAFT' && summary.pendingChecks.length > 0 && (
            <PendingChecks checks={summary.pendingChecks} />
          )}

          <div className="sheet">
            {(editing ?? summary.sections).map((section) => (
              <SheetSection
                key={section.id}
                section={section}
                isEditing={editing !== null}
                isBusy={busy === 'save'}
                onChange={changeSection}
              />
            ))}
          </div>

          {!canWrite ? (
            <Notice tone="locked" className="wrapmax">
              Puedes leer la historia clínica, pero no editarla ni firmarla: te
              falta el permiso{' '}
              <span className="mono">{PERMISSIONS.patientsWrite}</span>.
            </Notice>
          ) : summary.status === 'APPROVED' ? null : editing !== null ? (
            <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-pri"
                disabled={busy !== null}
                onClick={() => {
                  void onSave(editing).then((saved) => {
                    if (saved) setEditing(null);
                  });
                }}
              >
                {busy === 'save' ? <i className="spin" /> : null}
                {busy === 'save' ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={() => setEditing(null)}
              >
                Descartar
              </button>
              <span className="mini">
                Guardar no firma nada: el resumen sigue siendo un borrador hasta
                que lo firmes.
              </span>
            </div>
          ) : confirmingSignature ? (
            <div className="signbar">
              <div>
                <b>Vas a firmar como {signerName}.</b> A partir de ahí estas 2
                hojas viajan con {patient.initials} al hospital de adultos y no
                se pueden editar.
                {summary.pendingChecks.length > 0 && (
                  <>
                    {' '}
                    Quedan {summary.pendingChecks.length} cosas sin confirmar
                    arriba.
                  </>
                )}
              </div>
              <div className="row" style={{ gap: 9 }}>
                <button
                  type="button"
                  className="btn btn-pri"
                  disabled={busy !== null}
                  onClick={() => {
                    setConfirmingSignature(false);
                    onApprove();
                  }}
                >
                  {busy === 'approve' ? <i className="spin" /> : <SignIcon />}
                  {busy === 'approve' ? 'Firmando…' : 'Sí, firmar'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy !== null}
                  onClick={() => setConfirmingSignature(false)}
                >
                  Todavía no
                </button>
              </div>
            </div>
          ) : (
            <div className="stackv">
              {/* La firma tiene su día: 1 antes del cumpleaños. Antes de eso
                  el botón no aparece deshabilitado sin explicación — se dice
                  por qué, y que mientras tanto se puede seguir editando. */}
              {signBlockedReason(patient) && (
                <Notice tone="warn" className="wrapmax">
                  <b>Todavía no se firma.</b> {signBlockedReason(patient)} La
                  campanita te va a avisar cuando llegue el momento.
                </Notice>
              )}
              <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                {canApproveSummary(patient) && (
                  <button
                    type="button"
                    className="btn btn-pri"
                    disabled={busy !== null}
                    onClick={() => setConfirmingSignature(true)}
                  >
                    <SignIcon />
                    Firmar historia clínica
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  disabled={busy !== null}
                  onClick={() => startEditing(summary)}
                >
                  Editar el borrador
                </button>
                {canRegenerateSummary(patient, summary) && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy !== null}
                    onClick={onGenerate}
                    title="Descarta este borrador y le pide a la IA uno nuevo"
                  >
                    {busy === 'generate' ? (
                      <i className="spin" />
                    ) : (
                      <SparkIcon />
                    )}
                    {busy === 'generate' ? 'Generando…' : 'Volver a generar'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

/** Todavía no hay documento: o no le toca, o hay que generarlo. */
function EmptySummary({
  patient,
  blocked,
  canWrite,
  isGenerating,
  onGenerate,
}: Readonly<{
  patient: Patient;
  blocked: string | null;
  canWrite: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}>) {
  if (blocked) {
    return (
      <Notice tone="locked" className="wrapmax">
        <b>Todavía no arranca.</b> {blocked}
      </Notice>
    );
  }

  return (
    <div className="stackv">
      <Notice className="wrapmax">
        <b>{patient.initials} no tiene historia clínica de transferencia.</b>{' '}
        Son las 2 hojas que el médico del hospital de adultos va a leer antes de
        verla por primera vez: diagnóstico, tratamiento, alertas y qué controles
        necesita. Sin esto firmado, el caso no se puede mandar a la posta.
      </Notice>

      {canWrite && canGenerateSummary(patient) ? (
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-pri btn-lg"
            disabled={isGenerating}
            onClick={onGenerate}
          >
            {isGenerating ? <i className="spin" /> : <SparkIcon />}
            {isGenerating ? 'Generando el borrador…' : 'Generar con IA'}
          </button>
          <span className="mini wrapmax">
            La IA arma un borrador con lo que ya está en la ficha y marca lo que
            no pudo confirmar. Después lo revisas, lo corriges y lo firmas tú:
            nada sale del INSN sin la firma de un médico.
          </span>
        </div>
      ) : (
        <Notice tone="locked" className="wrapmax">
          Tu usuario no puede generar la historia clínica: te falta el permiso{' '}
          <span className="mono">{PERMISSIONS.patientsWrite}</span>.
        </Notice>
      )}
    </div>
  );
}

/** De dónde salió el texto y en qué estado está. */
function SummaryHeader({ summary }: Readonly<{ summary: ClinicalSummary }>) {
  if (summary.status === 'APPROVED') {
    return (
      <Notice tone="ok" className="wrapmax">
        <b>
          Firmada por {summary.approvedBy ?? 'un médico del INSN'}
          {summary.approvedAt && ` el ${formatShortDate(summary.approvedAt)}`}.
        </b>{' '}
        Ya puede viajar con el paciente. El borrador lo había armado{' '}
        {summary.draftedBy.kind === 'AI' ? 'la IA' : summary.draftedBy.name} el{' '}
        {formatShortDate(summary.draftedAt)}
        {summary.editedAt &&
          ` y ${summary.editedBy} lo corrigió el ${formatShortDate(summary.editedAt)}`}
        .
      </Notice>
    );
  }

  return (
    <Notice tone="warn" className="wrapmax">
      <b>Esto es un borrador, no una historia clínica.</b> Lo generó{' '}
      {summary.draftedBy.name} el {formatShortDate(summary.draftedAt)} con los
      datos de la ficha
      {summary.editedAt &&
        `, y ${summary.editedBy} lo corrigió el ${formatShortDate(summary.editedAt)}`}
      . No vale para nadie hasta que un médico lo lea y lo firme.
    </Notice>
  );
}

/** Lo que la IA no pudo confirmar. Va antes del texto, no después. */
function PendingChecks({ checks }: Readonly<{ checks: readonly string[] }>) {
  return (
    <div className="checks wrapmax">
      <div className="checks-h">
        <SparkIcon />
        <b>
          {checks.length} {checks.length === 1 ? 'cosa' : 'cosas'} que la IA no
          pudo confirmar
        </b>
      </div>
      <ul className="checks-l">
        {checks.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
    </div>
  );
}

/** Un bloque de las 2 hojas: se lee, o se escribe encima. */
function SheetSection({
  section,
  isEditing,
  isBusy,
  onChange,
}: Readonly<{
  section: ClinicalSummarySection;
  isEditing: boolean;
  isBusy: boolean;
  onChange: (id: string, body: string) => void;
}>) {
  const isEmpty = section.body.trim() === '';

  return (
    <article className={`sheet-s ${isEmpty && !isEditing ? 'gap' : ''}`}>
      <h3 className="sheet-t">{section.title}</h3>
      {isEditing ? (
        <>
          <label className="sheet-hint" htmlFor={`sec-${section.id}`}>
            {section.hint}
          </label>
          <textarea
            id={`sec-${section.id}`}
            className="ta"
            rows={4}
            value={section.body}
            disabled={isBusy}
            onChange={(event) => onChange(section.id, event.target.value)}
          />
        </>
      ) : isEmpty ? (
        // Un bloque vacío se muestra vacío y se dice por qué. Rellenarlo con
        // texto de relleno sería exactamente el problema que queremos evitar.
        <p className="sheet-b empty">Sin escribir — {section.hint}</p>
      ) : (
        <p className="sheet-b">{section.body}</p>
      )}
    </article>
  );
}
