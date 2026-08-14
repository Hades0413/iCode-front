import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  patientAttachmentService,
  patientService,
  referralReviewService,
} from '../../composition-root';
import type {
  ClinicalSummary,
  ClinicalSummarySection,
} from '../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../domain/entities/patient.entity';
import type { PatientAttachment } from '../../domain/entities/patient-attachment.entity';
import type { ReferralReview } from '../../domain/entities/referral-review.entity';
import type { ClinicalSummaryResult } from '../../application/dto/clinical-summary-result.dto';
import type { ReferralReviewResult } from '../../application/dto/referral-review-result.dto';
import { PERMISSIONS, hasPermission } from '../../domain/rules/permissions';
import { timeToEighteen } from '../../domain/rules/transition.rules';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { saveBlob } from '../../common/utils/save-blob';
import {
  ClinicalSummaryPanel,
  type SummaryBusy,
} from '../components/clinical-summary';
import { PatientAttachmentsPanel } from '../components/patient-attachments-panel';
import {
  ReferralReviewPanel,
  type ReferralReviewBusy,
} from '../components/referral-review-panel';
import { InfoIcon } from '../components/icons';
import { StatePill } from '../components/state-pill';
import { SummaryChip } from '../components/summary-chip';
import { Toasts } from '../components/toasts';
import { useAsyncResource } from '../hooks/use-async-resource';
import { useAuth } from '../hooks/use-auth';
import { useCohort } from '../hooks/use-cohort';
import { useToasts } from '../hooks/use-toasts';

const NO_SUMMARY: ClinicalSummary | null = null;
const NO_REVIEW: ReferralReview | null = null;
const NO_ATTACHMENTS: PatientAttachment[] = [];

/**
 * La ficha del paciente: por dónde va el caso y su historia clínica de
 * transferencia — generarla con IA, revisarla, corregirla y firmarla.
 *
 * La cohorte ya está cargada en el contexto, así que el paciente sale de
 * ahí; lo único que se pide aparte son las 2 hojas, que son grandes y no
 * tienen por qué viajar en la lista de todos.
 */
export function PatientDetailPage() {
  const { patientId } = useParams();
  const { patients, isLoading, applyPatient } = useCohort();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, push } = useToasts();
  const [busy, setBusy] = useState<SummaryBusy>(null);

  const patient = patients.find((candidate) => candidate.id === patientId);

  const loadSummary = useCallback(
    () =>
      patientId
        ? patientService.getClinicalSummary(patientId)
        : Promise.resolve(null),
    [patientId],
  );
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    reload: reloadSummary,
    setData: setSummary,
  } = useAsyncResource(
    loadSummary,
    NO_SUMMARY,
    'No se pudo cargar la historia clínica.',
  );

  const canWrite = hasPermission(user, PERMISSIONS.patientsWrite);
  const canManageReferralReview = hasPermission(
    user,
    PERMISSIONS.referralReviewManage,
  );
  const signerName = user ? `${user.firstName} ${user.lastName}` : 'tú';

  const loadReview = useCallback(
    () =>
      patientId
        ? referralReviewService.getReferralReview(patientId)
        : Promise.resolve(null),
    [patientId],
  );
  const {
    data: review,
    isLoading: isReviewLoading,
    error: reviewError,
    reload: reloadReview,
    setData: setReview,
  } = useAsyncResource(loadReview, NO_REVIEW, 'No se pudo cargar la referencia.');
  const [reviewBusy, setReviewBusy] = useState<ReferralReviewBusy>(null);

  const loadAttachments = useCallback(
    () =>
      patientId
        ? patientAttachmentService.listAttachments(patientId)
        : Promise.resolve(NO_ATTACHMENTS),
    [patientId],
  );
  const {
    data: attachments,
    isLoading: isAttachmentsLoading,
    error: attachmentsError,
    reload: reloadAttachments,
    setData: setAttachments,
  } = useAsyncResource(
    loadAttachments,
    NO_ATTACHMENTS,
    'No se pudieron cargar los adjuntos.',
  );
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  /**
   * Las tres acciones terminan igual: el servidor devuelve el documento y la
   * fila del paciente, y las dos se aplican juntas. Sin actualizar la fila,
   * la lista y el riel seguirían diciendo "sin generar" después de firmar.
   *
   * Devuelve si salió bien, para que el panel sepa si puede salir del modo
   * edición o tiene que quedarse con lo que el médico escribió.
   */
  async function runSummaryAction(
    kind: Exclude<SummaryBusy, null>,
    action: () => Promise<ClinicalSummaryResult>,
    onDone: () => void,
  ): Promise<boolean> {
    setBusy(kind);
    try {
      const result = await action();
      setSummary(result.summary);
      applyPatient(result.patient);
      onDone();
      return true;
    } catch (error) {
      push({
        tone: 'err',
        title: 'No se pudo completar la acción',
        detail: getApiErrorMessage(error),
      });
      return false;
    } finally {
      setBusy(null);
    }
  }

  function generate(current: Patient) {
    void runSummaryAction(
      'generate',
      () => patientService.generateClinicalSummary(current, summary),
      () =>
        push({
          tone: 'ok',
          title: 'Borrador listo',
          detail: `${current.initials} · revísalo y fírmalo: hasta que no lo firmes, no vale.`,
        }),
    );
  }

  function save(
    current: Patient,
    sections: ClinicalSummarySection[],
  ): Promise<boolean> {
    return runSummaryAction(
      'save',
      () => patientService.saveClinicalSummaryDraft(current, sections),
      () =>
        push({
          tone: 'ok',
          title: 'Cambios guardados',
          detail: 'El borrador sigue sin firmar.',
        }),
    );
  }

  function approve(current: Patient) {
    void runSummaryAction(
      'approve',
      () => patientService.approveClinicalSummary(current),
      () =>
        push({
          tone: 'ok',
          title: `Historia clínica de ${current.initials} firmada`,
          detail: 'Ya puede viajar con el paciente a la posta y al hospital.',
        }),
    );
  }

  function startTemplate(current: Patient) {
    void runSummaryAction(
      'template',
      () => patientService.startClinicalSummaryTemplate(current, summary),
      () =>
        push({
          tone: 'ok',
          title: 'Plantilla en blanco creada',
          detail: `Completa las 6 secciones de ${current.initials} y luego fírmala.`,
        }),
    );
  }

  function uploadDocument(current: Patient, file: File) {
    void runSummaryAction(
      'upload',
      () => patientService.uploadClinicalSummaryDocument(current, file, summary),
      () =>
        push({
          tone: 'ok',
          title: 'Documento adjuntado',
          detail: 'Transcribe el contenido a las secciones antes de firmar.',
        }),
    );
  }

  /**
   * Las 3 acciones de Referencia terminan igual que las de la historia
   * clínica: el servidor devuelve el documento y la fila del paciente
   * juntos, y las dos se aplican a la vez.
   */
  async function runReviewAction(
    kind: Exclude<ReferralReviewBusy, null>,
    action: () => Promise<ReferralReviewResult>,
    successTitle: string,
  ): Promise<void> {
    setReviewBusy(kind);
    try {
      const result = await action();
      setReview(result.referralReview);
      applyPatient(result.patient);
      push({ tone: 'ok', title: successTitle });
    } catch (error) {
      push({
        tone: 'err',
        title: 'No se pudo registrar la respuesta',
        detail: getApiErrorMessage(error),
      });
    } finally {
      setReviewBusy(null);
    }
  }

  function acceptReview(current: Patient) {
    void runReviewAction(
      'accept',
      () => referralReviewService.acceptReferralReview(current),
      `${current.initials}: caso aceptado por el destino`,
    );
  }

  function rejectReview(current: Patient, notes: string) {
    void runReviewAction(
      'reject',
      () => referralReviewService.rejectReferralReview(current, notes),
      `${current.initials}: caso rechazado por el destino`,
    );
  }

  function observeReview(current: Patient, file: File, notes: string | null) {
    void runReviewAction(
      'observe',
      () => referralReviewService.observeReferralReview(current, file, notes),
      `${current.initials}: el destino observó la historia clínica`,
    );
  }

  async function viewReviewDocument(current: Patient) {
    try {
      const blob =
        await referralReviewService.downloadReferralReviewDocument(
          current.id,
        );
      saveBlob(blob, review?.fileName ?? 'observacion.pdf');
    } catch (error) {
      push({
        tone: 'err',
        title: 'No se pudo descargar el PDF',
        detail: getApiErrorMessage(error),
      });
    }
  }

  async function uploadAttachment(current: Patient, file: File) {
    setIsUploadingAttachment(true);
    try {
      const attachment = await patientAttachmentService.uploadAttachment(
        current.id,
        file,
      );
      setAttachments([...attachments, attachment]);
      push({ tone: 'ok', title: 'Adjunto agregado', detail: file.name });
    } catch (error) {
      push({
        tone: 'err',
        title: 'No se pudo adjuntar el archivo',
        detail: getApiErrorMessage(error),
      });
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  async function downloadAttachment(
    current: Patient,
    attachment: PatientAttachment,
  ) {
    try {
      const blob = await patientAttachmentService.downloadAttachmentDocument(
        current.id,
        attachment.id,
      );
      saveBlob(blob, attachment.fileName);
    } catch (error) {
      push({
        tone: 'err',
        title: 'No se pudo descargar el archivo',
        detail: getApiErrorMessage(error),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="main">
        <div className="page-body">
          <div className="empty-s">Cargando…</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="main enter">
        <div className="page-body">
          <div className="crumb" style={{ paddingTop: 24 }}>
            <button type="button" onClick={() => navigate('/pacientes')}>
              Pacientes en tutela
            </button>
          </div>
          <div className="empty-s">Ese paciente no está en tu lista.</div>
        </div>
      </div>
    );
  }

  const time = timeToEighteen(patient);

  return (
    <div className="main enter">
      <div className="page-h">
        <div className="crumb">
          <button type="button" onClick={() => navigate('/pacientes')}>
            Mis pacientes
          </button>
          <span>/</span>
          <span>{patient.initials}</span>
        </div>
        <h1 className="page-t">{patient.initials}</h1>
        <div className="page-sub">
          <span className="mono">{patient.medicalRecord}</span>
          <span>{patient.age}</span>
          <span>
            {time.prefix} <b>{time.text}</b>
          </span>
          <span>{patient.specialty}</span>
          <span>{patient.district}</span>
        </div>
      </div>

      <div className="page-body">
        <section className="sec">
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <StatePill state={patient.state} />
            <SummaryChip patient={patient} />
          </div>
          <p style={{ paddingTop: 18, maxWidth: 720 }}>{patient.diagnosis}</p>
          <p className="mini" style={{ paddingTop: 8 }}>
            {patient.lastAction} · {patient.attendingDoctor}
          </p>
        </section>

        {/* Lo primero después de quién es: es el trabajo del especialista.
            El tramo de la posta no se muestra aquí: ese seguimiento es del
            área de Referencias, en sus propias bandejas. */}
        <ClinicalSummaryPanel
          patient={patient}
          summary={summary}
          isLoading={isSummaryLoading}
          error={summaryError}
          canWrite={canWrite}
          signerName={signerName}
          busy={busy}
          onGenerate={() => generate(patient)}
          onStartTemplate={() => startTemplate(patient)}
          onUploadDocument={(file) => uploadDocument(patient, file)}
          onSave={(sections) => save(patient, sections)}
          onApprove={() => approve(patient)}
          onRetry={reloadSummary}
        />

        <ReferralReviewPanel
          patient={patient}
          review={review}
          isLoading={isReviewLoading}
          error={reviewError}
          canManage={canManageReferralReview}
          busy={reviewBusy}
          onAccept={() => acceptReview(patient)}
          onReject={(notes) => rejectReview(patient, notes)}
          onObserve={(file, notes) => observeReview(patient, file, notes)}
          onViewDocument={() => void viewReviewDocument(patient)}
          onRetry={reloadReview}
        />

        <PatientAttachmentsPanel
          attachments={attachments}
          isLoading={isAttachmentsLoading}
          error={attachmentsError}
          canWrite={canWrite}
          isUploading={isUploadingAttachment}
          onUpload={(file) => void uploadAttachment(patient, file)}
          onDownload={(attachment) => void downloadAttachment(patient, attachment)}
          onRetry={reloadAttachments}
        />

        <section className="sec">
          <div className="notice wrapmax">
            <InfoIcon />
            <div>
              <b>Esta ficha está a medio hacer.</b> Faltan la línea de tiempo
              del caso y el historial de lo que se fue haciendo. Datos de
              prueba.
            </div>
          </div>
        </section>
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}
