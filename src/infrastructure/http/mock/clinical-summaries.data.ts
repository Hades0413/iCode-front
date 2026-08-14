import type {
  ClinicalSummary,
  ClinicalSummaryAuthor,
  ClinicalSummarySection,
} from '../../../domain/entities/clinical-summary.entity';
import type { Patient } from '../../../domain/entities/patient.entity';
import { summaryProgress } from '../../../domain/rules/clinical-summary.rules';
import { formatShortDate } from '../../../common/utils/format-date';

/**
 * La "tabla clinical_summaries" del backend simulado **y el generador que
 * hace de IA**.
 *
 * Ojo con lo que esto es y lo que no: aquí no hay ningún modelo. El borrador
 * se arma con plantillas a partir de lo que ya está en la ficha (diagnóstico,
 * especialidad, médico tratante, posta) más notas por especialidad escritas a
 * mano. Es una simulación para poder diseñar y probar **el flujo** —
 * generar → revisar → corregir → firmar— sin backend.
 *
 * Cuando exista iCode-back, esto se cae entero y lo reemplaza un endpoint que
 * llama al modelo del lado del servidor. Que la generación viva en el
 * servidor no es un detalle de infraestructura: la historia clínica no puede
 * salir del hospital hacia un proveedor desde el navegador de un médico, y
 * el prompt, el modelo y su versión tienen que quedar auditados junto al
 * documento. El front solo pide, muestra y manda la firma.
 *
 * Datos 100 % ficticios. Ningún texto de aquí es consejo médico.
 */

/** Las filas del seed no traen lo que el servidor calcula (ver patients.data). */
type PatientSeed = Omit<Patient, 'summaryProgress'>;

const AI_AUTHOR: ClinicalSummaryAuthor = {
  kind: 'AI',
  name: 'Asistente de resumen clínico',
};

/* ============================================================
   Notas por especialidad — el "conocimiento" del generador
   ============================================================ */

interface SpecialtyNotes {
  /** Qué toma y cada cuánto. */
  treatment: string;
  /** Cómo viene el último año. */
  course: string;
  /** Lo que no se puede pasar por alto del otro lado. */
  alerts: string;
  /** Qué controles necesita en el hospital de adultos. */
  plan: string;
  /** Lo que el generador no puede sacar de la ficha: hay que confirmarlo. */
  checks: string[];
}

const DEFAULT_NOTES: SpecialtyNotes = {
  treatment:
    'Tratamiento crónico en curso; el detalle de fármacos y dosis está en la última epicrisis del INSN.',
  course:
    'Enfermedad crónica estable, con controles ambulatorios programados en el último año.',
  alerts:
    'Sin alergias registradas en la ficha. Consultar antes de suspender cualquier medicación crónica.',
  plan: 'Primer control en el hospital de adultos dentro de los 30 días de cumplidos los 18, y después según indique el especialista receptor.',
  checks: [
    'Confirmar el detalle de la medicación actual con la última receta.',
    'Adjuntar la epicrisis del último control del INSN.',
  ],
};

const SPECIALTY_NOTES: Record<string, SpecialtyNotes> = {
  'Cardiología pediátrica': {
    treatment:
      'Enalapril 5 mg cada 12 h y ácido acetilsalicílico 100 mg/día. Profilaxis de endocarditis antes de cualquier procedimiento dental o quirúrgico.',
    course:
      'Clase funcional I–II, sin descompensaciones ni internaciones en el último año.',
    alerts:
      'Sin alergias registradas. Consulta inmediata ante palpitaciones sostenidas, síncope, disnea de reciente aparición o edemas.',
    plan: 'Cardiología de adultos cada 6 meses, con ecocardiograma anual y Holter si aparecen síntomas.',
    checks: [
      'Confirmar la fecha y el resultado del último ecocardiograma.',
      'Verificar si sigue con la misma dosis de enalapril.',
    ],
  },
  'Oncología pediátrica': {
    treatment:
      'Esquema según protocolo institucional; ciclos, dosis acumuladas y fechas están en la epicrisis de oncología.',
    course:
      'Sin recaídas documentadas en la ficha; controles con hemograma según el esquema del protocolo.',
    alerts:
      'Riesgo de neutropenia febril: fiebre ≥ 38 °C es una urgencia y no espera consulta programada. Evitar vacunas a virus vivos sin consultar.',
    plan: 'Vigilancia oncológica cada 3 meses el primer año, con control de toxicidad tardía (cardíaca, endocrina y de fertilidad).',
    checks: [
      'Adjuntar la epicrisis con el protocolo y las dosis acumuladas de antraciclinas.',
      'Confirmar la fecha del último control con hemograma.',
    ],
  },
  'Nefrología pediátrica': {
    treatment:
      'Dieta hiposódica con control de fósforo y potasio, quelantes con las comidas y bicarbonato oral. Nefroprotección con IECA.',
    course:
      'Función renal en descenso lento, sin necesidad de diálisis hasta la fecha del último control.',
    alerts:
      'Evitar AINEs y contrastes yodados sin evaluación previa. Cualquier ajuste de dosis tiene que considerar el filtrado glomerular.',
    plan: 'Nefrología de adultos cada 2–3 meses con perfil renal, y evaluación temprana para acceso vascular o trasplante si progresa.',
    checks: [
      'Confirmar creatinina y filtrado glomerular del último laboratorio.',
      'Verificar si está en lista o en evaluación de trasplante.',
    ],
  },
  'Neumología pediátrica': {
    treatment:
      'Enzimas pancreáticas con cada comida, vitaminas ADEK, broncodilatador y fisioterapia respiratoria diaria.',
    course:
      'Función pulmonar estable en las últimas espirometrías, con exacerbaciones tratadas de forma ambulatoria.',
    alerts:
      'Colonización respiratoria conocida: informar al servicio receptor antes de compartir sala de espera o internación.',
    plan: 'Neumología de adultos cada 3 meses, con espirometría y cultivo de esputo en cada control, más seguimiento nutricional.',
    checks: [
      'Confirmar el último resultado de espirometría (FEV1).',
      'Verificar el germen aislado en el último cultivo de esputo.',
    ],
  },
  'Neurología pediátrica': {
    treatment:
      'Anticonvulsivantes en esquema combinado, con niveles plasmáticos controlados; sin cambios de marca sin aviso al neurólogo.',
    course:
      'Crisis parcialmente controladas, con registro de frecuencia en el carnet de crisis del paciente.',
    alerts:
      'No suspender ni cambiar la medicación de golpe: el riesgo es un estado convulsivo. Registrar toda crisis con duración y hora.',
    plan: 'Neurología de adultos cada 3 meses el primer año, con electroencefalograma anual y control de niveles plasmáticos.',
    checks: [
      'Confirmar la frecuencia de crisis de los últimos 3 meses.',
      'Verificar dosis y niveles del último control.',
    ],
  },
  'Reumatología pediátrica': {
    treatment:
      'Hidroxicloroquina diaria, inmunosupresor de mantenimiento y corticoide a dosis baja, con protección gástrica y ósea.',
    course:
      'Actividad de la enfermedad controlada con la inmunosupresión actual, sin brotes que hayan requerido internación.',
    alerts:
      'Inmunosupresión: toda fiebre necesita evaluación temprana. No suspender el tratamiento por cuenta propia, ni siquiera en remisión.',
    plan: 'Reumatología de adultos cada 2–3 meses con función renal y sedimento urinario, y control oftalmológico anual.',
    checks: [
      'Confirmar la dosis actual de corticoide.',
      'Adjuntar el último control de función renal y proteinuria.',
    ],
  },
  'Hematología pediátrica': {
    treatment:
      'Profilaxis con factor de reemplazo tres veces por semana, con registro de aplicaciones y de episodios de sangrado.',
    course:
      'Sin sangrados mayores en el último año; articulaciones sin signos de artropatía nueva.',
    alerts:
      'No aplicar inyecciones intramusculares ni AINEs. Ante traumatismo de cráneo, factor primero y estudios después.',
    plan: 'Hematología de adultos cada 3 meses, con control de inhibidores y evaluación articular anual.',
    checks: [
      'Confirmar la dosis y la marca del factor que usa.',
      'Verificar si tiene inhibidores en el último control.',
    ],
  },
  'Endocrinología pediátrica': {
    treatment:
      'Insulina en esquema basal-bolo con conteo de carbohidratos y automonitoreo; ajustes según registro de glucemias.',
    course:
      'Control metabólico irregular, con hemoglobina glicosilada por encima del objetivo en los últimos controles.',
    alerts:
      'Riesgo de hipoglucemias graves y de cetoacidosis ante enfermedad intercurrente. Necesita educación diabetológica en la transición.',
    plan: 'Endocrinología de adultos cada 3 meses con HbA1c, más control anual de retina, riñón y pies.',
    checks: [
      'Confirmar el valor y la fecha de la última hemoglobina glicosilada.',
      'Verificar las dosis actuales de insulina basal y prandial.',
    ],
  },
};

/* ============================================================
   El generador
   ============================================================ */

function monthsText(months: number): string {
  if (months <= 0) return 'ya los cumplió';
  return months === 1 ? 'en 1 mes' : `en ${months} meses`;
}

/**
 * Las 2 hojas: seis bloques, siempre los mismos y en este orden. El orden es
 * el de una derivación, no el de una historia clínica completa — el médico
 * que recibe lee de arriba hacia abajo y tiene que poder parar en el tercero
 * y aun así saber qué hacer.
 */
function sectionsFor(patient: PatientSeed): ClinicalSummarySection[] {
  const notes = SPECIALTY_NOTES[patient.specialty] ?? DEFAULT_NOTES;
  const sex = patient.sex === 'F' ? 'femenino' : 'masculino';

  return [
    {
      id: 'identificacion',
      title: 'Quién es',
      hint: 'Iniciales, historia clínica, edad y dónde vive.',
      body: `${patient.initials} · HC ${patient.medicalRecord} · sexo ${sex} · ${patient.age}. Vive en ${patient.district} y cumple 18 años ${monthsText(patient.monthsToEighteen)}.${
        patient.healthPost
          ? ` Le corresponde ${patient.healthPost.name}, a ${patient.healthPost.distanceKm} km del domicilio.`
          : ''
      }`,
    },
    {
      id: 'diagnostico',
      title: 'Diagnóstico y desde cuándo',
      hint: 'El diagnóstico principal y quién lo viene siguiendo.',
      body: `${patient.diagnosis}. En seguimiento por ${patient.specialty} del INSN San Borja, a cargo de ${patient.attendingDoctor}.`,
    },
    {
      id: 'tratamiento',
      title: 'Tratamiento actual',
      hint: 'Qué toma, en qué dosis y cada cuánto.',
      body: notes.treatment,
    },
    {
      id: 'evolucion',
      title: 'Cómo viene',
      hint: 'La evolución del último año y el último control.',
      body: `${notes.course} Último registro en la ficha: ${patient.lastAction.toLowerCase()}.`,
    },
    {
      id: 'alertas',
      title: 'Alertas y precauciones',
      hint: 'Alergias, riesgos y lo que no se puede pasar por alto.',
      body: notes.alerts,
    },
    {
      id: 'plan',
      title: 'Qué necesita del hospital de adultos',
      hint: 'Qué controles, cada cuánto y con qué especialidad.',
      body: notes.plan,
    },
  ];
}

/**
 * Lo que el generador NO puede saber mirando la ficha. Va aparte y arriba de
 * todo en la pantalla: un borrador que se lee como definitivo es la forma
 * más rápida de que alguien firme sin leer.
 */
function pendingChecksFor(patient: PatientSeed): string[] {
  const notes = SPECIALTY_NOTES[patient.specialty] ?? DEFAULT_NOTES;
  return [
    ...notes.checks,
    'Falta el peso y la talla del último control.',
    'Confirmar un teléfono de contacto del paciente y de su tutor.',
  ];
}

function draftFor(
  patient: PatientSeed,
  draftedAt: string,
  sections = sectionsFor(patient),
): ClinicalSummary {
  return {
    patientId: patient.id,
    status: 'DRAFT',
    sections,
    pendingChecks: pendingChecksFor(patient),
    draftedBy: AI_AUTHOR,
    draftedAt,
    editedBy: null,
    editedAt: null,
    approvedBy: null,
    approvedAt: null,
    sourceDocument: null,
  };
}

/* ============================================================
   Los resúmenes que ya venían en el seed
   ============================================================
   Los pacientes del seed nacen con summaryStatus DRAFT o APPROVED pero sin
   documento. En vez de escribir doce resúmenes a mano, se sintetizan con el
   mismo generador y se les pone una fecha coherente con su "lastAction" —
   así el que abre la demo encuentra las tres situaciones (sin generar, en
   revisión, firmado) sin tener que fabricarlas él. */

/** Cuándo se armó el borrador que ya venía en el seed. */
const SEED_DRAFTED_AT: Record<string, string> = {
  dr: '2026-08-08T10:00',
  eg: '2026-07-30T10:00',
  cn: '2026-08-05T09:00',
};

/**
 * Cuántos bloques del final quedaron sin escribir. Sirve para que la demo
 * tenga un borrador a medias (E.G., 3 de 6 = 43 %) y otro completo esperando
 * la firma (D.R., 6 de 6 = 85 %), que son dos trabajos bien distintos.
 */
const SEED_DRAFT_GAPS: Record<string, number> = { eg: 3 };

/**
 * Cuándo se armó el borrador de los pacientes del seed que no tienen fecha
 * propia. Lo exporta para que la fábrica de casos (patients.data.ts) ponga
 * esa misma fecha en su "lastAction": si la fila dijera un día y la ficha
 * otro, el que abre la demo lo nota enseguida.
 */
export const SEED_DRAFTED_AT_FALLBACK = '2026-07-15T09:00';
const DAY_MS = 24 * 60 * 60 * 1000;

function daysBefore(iso: string, days: number): string {
  const at = Date.parse(iso);
  return Number.isNaN(at)
    ? iso
    : new Date(at - days * DAY_MS).toISOString().slice(0, 16);
}

function seedSummary(patient: PatientSeed): ClinicalSummary | null {
  if (patient.summaryStatus === 'NONE') {
    return null;
  }

  if (patient.summaryStatus === 'DRAFT') {
    const draftedAt = SEED_DRAFTED_AT[patient.id] ?? SEED_DRAFTED_AT_FALLBACK;
    const gaps = SEED_DRAFT_GAPS[patient.id] ?? 0;
    const sections = sectionsFor(patient).map((section, index, all) =>
      index >= all.length - gaps ? { ...section, body: '' } : section,
    );
    return draftFor(patient, draftedAt, sections);
  }

  // Firmado: la firma es lo que habilitó mandar el caso a la posta, así que
  // la fecha de la derivación es la mejor que tenemos.
  const approvedAt =
    patient.referredToPostAt ??
    SEED_DRAFTED_AT[patient.id] ??
    SEED_DRAFTED_AT_FALLBACK;
  return {
    ...draftFor(patient, daysBefore(approvedAt, 1)),
    status: 'APPROVED',
    // Un resumen firmado no arrastra dudas: se resolvieron antes de firmar.
    pendingChecks: [],
    approvedBy: patient.attendingDoctor,
    approvedAt,
  };
}

/* ============================================================
   Store — lo que la demo va escribiendo
   ============================================================
   Mismo criterio que los avisos a la posta: localStorage, porque en el
   backend real esto vive en la base y un refresh no debería deshacerlo.
   Para volver al estado inicial de la demo, borra esta clave. */

const STORAGE_KEY = 'icode.mock.clinical-summaries';

type SummaryMap = Record<string, ClinicalSummary>;

function readSummaries(): SummaryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SummaryMap) : {};
  } catch {
    return {};
  }
}

function writeSummary(summary: ClinicalSummary): ClinicalSummary {
  const summaries = readSummaries();
  summaries[summary.patientId] = summary;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
  return summary;
}

function now(): string {
  return new Date().toISOString();
}

/** El documento del paciente: el que se escribió en la demo, o el del seed. */
export function summaryFor(patient: PatientSeed): ClinicalSummary | null {
  return readSummaries()[patient.id] ?? seedSummary(patient);
}

/**
 * Genera (o vuelve a generar) el borrador. Siempre queda en DRAFT: este
 * módulo no tiene ningún camino que escriba APPROVED sin pasar por
 * approveSummary, que exige un firmante con nombre.
 */
export function generateSummary(patient: PatientSeed): ClinicalSummary {
  return writeSummary(draftFor(patient, now()));
}

/** Guarda las correcciones del médico. Solo el texto: el resto no se toca. */
export function saveSummaryDraft(
  patient: PatientSeed,
  sections: readonly ClinicalSummarySection[],
  editedBy: string,
): ClinicalSummary | null {
  const current = summaryFor(patient);
  if (!current || current.status !== 'DRAFT') {
    return null;
  }

  // Se respetan los bloques del documento y solo se acepta el body: si el
  // cliente manda secciones de más, otros títulos o ids que no existen, se
  // ignoran. El servidor no deja que el front redefina la estructura del
  // documento clínico.
  const edited = current.sections.map((section) => {
    const incoming = sections.find((candidate) => candidate.id === section.id);
    return incoming ? { ...section, body: incoming.body.trim() } : section;
  });

  return writeSummary({
    ...current,
    sections: edited,
    editedBy,
    editedAt: now(),
  });
}

/** La firma. Es el único lugar donde un resumen pasa a APPROVED. */
export function approveSummary(
  patient: PatientSeed,
  approvedBy: string,
): ClinicalSummary | null {
  const current = summaryFor(patient);
  if (!current || current.status !== 'DRAFT') {
    return null;
  }
  return writeSummary({
    ...current,
    status: 'APPROVED',
    approvedBy,
    approvedAt: now(),
  });
}

/* ============================================================
   Proyección sobre la fila del paciente
   ============================================================
   Lo que haría el backend al armar la fila: el estado y el avance del resumen
   salen del documento, no se guardan sueltos en la tabla de pacientes. Así no
   hay forma de que la lista diga "firmado" y la ficha muestre un borrador. */

/**
 * Lo último que le pasó al resumen, si es que se tocó en esta demo. Quién
 * gana entre esto, un aviso del área y un reclamo lo decide hydrate() en
 * patients.data.ts: "lo último" tiene que ser lo último de verdad, y este
 * módulo solo conoce la mitad de la historia.
 */
export function clinicalSummaryAction(
  patientId: string,
): { at: string; text: string } | null {
  const summary = readSummaries()[patientId] ?? null;
  if (!summary) {
    return null;
  }
  if (summary.approvedAt) {
    return {
      at: summary.approvedAt,
      text: `Historia clínica firmada · ${formatShortDate(summary.approvedAt)}`,
    };
  }
  if (summary.editedAt) {
    return {
      at: summary.editedAt,
      text: `Borrador corregido · ${formatShortDate(summary.editedAt)}`,
    };
  }
  return {
    at: summary.draftedAt,
    text: `Borrador generado con IA · ${formatShortDate(summary.draftedAt)}`,
  };
}

export function applyClinicalSummary(patient: PatientSeed): Patient {
  const summary = readSummaries()[patient.id] ?? seedSummary(patient);
  return {
    ...patient,
    summaryStatus: summary?.status ?? 'NONE',
    summaryProgress: summary ? summaryProgress(summary) : 0,
  };
}
