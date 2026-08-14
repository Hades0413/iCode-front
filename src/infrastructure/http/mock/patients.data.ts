import type {
  ClinicalSummaryStatus,
  HealthPost,
  Patient,
  TransitionState,
} from '../../../domain/entities/patient.entity';
import { formatShortDate } from '../../../common/utils/format-date';
import {
  SEED_DRAFTED_AT_FALLBACK,
  applyClinicalSummary,
  clinicalSummaryAction,
} from './clinical-summaries.data';
import { applyReferrals, referralAction } from './referrals.data';

/**
 * La "tabla patients" del backend simulado, más el store de avisos a la
 * posta (lo único que la UI puede modificar hoy).
 *
 * Dos grupos, y la diferencia es la regla del negocio:
 *
 * - **En tutela**: `monthsToEighteen > 0`, todavía no cumplieron 18. Son los
 *   del tablero del especialista de pediatría: su responsabilidad es el
 *   tramo previo al cumpleaños.
 * - **Post-transición**: ya cumplieron 18. Salieron de la tutela y lo que se
 *   mide de ellos es otra cosa (si llegaron a su primera atención de
 *   adultos), en el panel de seguimiento.
 *
 * Sobre la derivación a la posta: se manda **anticipada**, en los últimos
 * meses antes del cumpleaños, para que la cita ya exista cuando el paciente
 * cruce. Por eso hay pacientes de 17 años "derivados a la posta": es
 * justamente lo que el especialista tiene que vigilar mientras el paciente
 * todavía es suyo. Si la derivación esperara al día del cumpleaños, el
 * paciente cruzaría sin cita y nadie lo estaría mirando.
 *
 * Datos 100 % ficticios. "monthsToEighteen" y "daysWaitingOnPost" están
 * calculados contra el 11 de agosto de 2026 — cuando iCode-back exista, esos
 * números los calcula el servidor.
 */

/**
 * Las filas tal como están escritas aquí abajo. Les falta `summaryProgress`
 * a propósito: ese número no es un dato del paciente sino una cuenta sobre
 * su historia clínica, y lo agrega hydrate() leyendo el documento (ver
 * clinical-summaries.data.ts). Copiarlo a mano en cada fila sería la manera
 * más fácil de que la lista dijera 85 % y la ficha mostrara otra cosa.
 */
type PatientRow = Omit<Patient, 'summaryProgress'>;

/**
 * Quién firma los avisos del área en el seed. En el backend real es el
 * usuario que los mandó; aquí es una sola persona para que la demo se lea.
 */
const REFERRAL_AREA_STAFF = 'Área de Referencias — Lucía Bermúdez';

/* ---------- postas (primer nivel de atención) ---------- */

const POSTS: Record<string, HealthPost> = {
  sjm: {
    id: 'cs-sjm',
    name: 'C.S. San Juan de Miraflores',
    district: 'San Juan de Miraflores',
    distanceKm: 1.2,
  },
  ves: {
    id: 'cs-ves',
    name: 'C.S. Villa El Salvador',
    district: 'Villa El Salvador',
    distanceKm: 0.8,
  },
  comas: {
    id: 'ps-comas',
    name: 'P.S. Año Nuevo — Comas',
    district: 'Comas',
    distanceKm: 1.6,
  },
  ate: {
    id: 'cs-ate',
    name: 'C.S. Ate Vitarte',
    district: 'Ate',
    distanceKm: 2.1,
  },
  smp: {
    id: 'cs-smp',
    name: 'C.S. San Martín de Porres',
    district: 'San Martín de Porres',
    distanceKm: 1.1,
  },
  chorrillos: {
    id: 'ps-chorrillos',
    name: 'P.S. Delicias de Villa',
    district: 'Chorrillos',
    distanceKm: 0.9,
  },
  carabayllo: {
    id: 'cs-carabayllo',
    name: 'C.S. El Progreso — Carabayllo',
    district: 'Carabayllo',
    distanceKm: 1.4,
  },
  sjl: {
    id: 'cs-zarate',
    name: 'C.S. Zárate — SJL',
    district: 'San Juan de Lurigancho',
    distanceKm: 2.3,
  },
  puentePiedra: {
    id: 'cs-puente-piedra',
    name: 'C.S. Puente Piedra',
    district: 'Puente Piedra',
    distanceKm: 1,
  },
  independencia: {
    id: 'cs-tahuantinsuyo',
    name: 'C.S. Tahuantinsuyo Bajo',
    district: 'Independencia',
    distanceKm: 1.3,
  },
};

/* ============================================================
   EN TUTELA — todos menores de 18
   ============================================================ */

const IN_TUTELAGE: readonly PatientRow[] = [
  {
    id: 'aq',
    initials: 'A.Q.',
    dni: '71204885',
    medicalRecord: 'HC-198442',
    sex: 'F',
    age: '17a 11m',
    monthsToEighteen: 1,
    diagnosis: 'Cardiopatía congénita compleja — circulación de Fontan',
    specialty: 'Cardiología pediátrica',
    attendingDoctor: 'Dra. Rosa Manrique',
    district: 'San Juan de Miraflores',
    state: 'PENDING',
    summaryStatus: 'NONE',
    healthPost: POSTS.sjm,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Control ambulatorio · 24 jul',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'ACCEPTED',
    checklistProgress: null,
  },
  {
    // El caso que funciona: el área avisó a tiempo y la posta ya tiene el
    // caso esperando el cumpleaños. Lo único flojo es su preparación.
    id: 'mp',
    initials: 'M.P.',
    dni: '70918342',
    medicalRecord: 'HC-188207',
    sex: 'F',
    age: '17a 11m',
    monthsToEighteen: 1,
    diagnosis: 'Osteosarcoma de fémur, en remisión',
    specialty: 'Oncología pediátrica',
    attendingDoctor: 'Dr. Álvaro Solís',
    district: 'San Juan de Miraflores',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'APPROVED',
    healthPost: POSTS.sjm,
    referredToPostAt: '2026-07-18T09:00',
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Aviso del área a la posta · 18 jul',
    daysWaitingOnPost: 24,
    postNotices: [{ sentAt: '2026-07-18T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'OBSERVED',
    checklistProgress: 0.4,
  },
  {
    // El caso que hoy se cae del sistema: la posta tiene el caso hace más de
    // un mes, ya se le avisó dos veces y sigue sin gestionar la cita.
    id: 'rv',
    initials: 'R.V.',
    dni: '71553019',
    medicalRecord: 'HC-183551',
    sex: 'F',
    age: '17a 10m',
    monthsToEighteen: 2,
    diagnosis: 'Leucemia mieloide aguda, en consolidación activa',
    specialty: 'Oncología pediátrica',
    attendingDoctor: 'Dr. Álvaro Solís',
    district: 'Villa El Salvador',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    healthPost: POSTS.ves,
    referredToPostAt: '2026-07-05T09:00',
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Aviso a la posta · 4 ago',
    daysWaitingOnPost: 37,
    postNotices: [
      { sentAt: '2026-07-05T09:00', sentBy: REFERRAL_AREA_STAFF },
      { sentAt: '2026-07-24T10:15', sentBy: REFERRAL_AREA_STAFF },
    ],
    // El especialista ya le reclamó al área: la posta sigue sin moverse.
    referralAlerts: [
      {
        sentAt: '2026-08-04T09:40',
        sentBy: 'Dr. Álvaro Solís',
        reason: 'POST_NOTICE',
      },
    ],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'REJECTED',
    checklistProgress: null,
  },
  {
    // Avisada hace dos semanas y todavía sin novedades de la posta.
    id: 'lt',
    initials: 'L.T.',
    dni: '72014466',
    medicalRecord: 'HC-201336',
    sex: 'M',
    age: '17a 10m',
    monthsToEighteen: 2,
    diagnosis: 'Enfermedad renal crónica estadio 4',
    specialty: 'Nefrología pediátrica',
    attendingDoctor: 'Dr. Iván Cáceres',
    district: 'Comas',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    healthPost: POSTS.comas,
    referredToPostAt: '2026-07-27T09:00',
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Aviso del área a la posta · 27 jul',
    daysWaitingOnPost: 15,
    postNotices: [{ sentAt: '2026-07-27T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    id: 'jm',
    initials: 'J.M.',
    dni: '70882375',
    medicalRecord: 'HC-204817',
    sex: 'M',
    age: '17a 9m',
    monthsToEighteen: 3,
    diagnosis: 'Leucemia linfoblástica aguda (LLA-B), en remisión',
    specialty: 'Oncología pediátrica',
    attendingDoctor: 'Dr. Álvaro Solís',
    district: 'Comas',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
    healthPost: POSTS.comas,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Consulta de transición · 6 ago',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    // Recién derivado y ya pasado de plazo, sin que nadie le haya avisado.
    id: 'em',
    initials: 'E.M.',
    dni: '71640927',
    medicalRecord: 'HC-176882',
    sex: 'M',
    age: '17a 9m',
    monthsToEighteen: 3,
    diagnosis: 'Sarcoma de Ewing de pelvis, en quimioterapia activa',
    specialty: 'Oncología pediátrica',
    attendingDoctor: 'Dr. Álvaro Solís',
    district: 'Ate',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    healthPost: POSTS.ate,
    referredToPostAt: '2026-07-30T09:00',
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Aviso del área a la posta · 30 jul',
    daysWaitingOnPost: 12,
    postNotices: [{ sentAt: '2026-07-30T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    id: 'dr',
    initials: 'D.R.',
    dni: '70337158',
    medicalRecord: 'HC-196011',
    sex: 'F',
    age: '17a 8m',
    monthsToEighteen: 4,
    diagnosis: 'Fibrosis quística con insuficiencia pancreática',
    specialty: 'Neumología pediátrica',
    attendingDoctor: 'Dra. Rosa Manrique',
    district: 'Ate',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
    healthPost: POSTS.ate,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Consulta de transición · 8 ago',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    id: 'sv',
    initials: 'S.V.',
    dni: '72190644',
    medicalRecord: 'HC-207520',
    sex: 'M',
    age: '17a 7m',
    monthsToEighteen: 5,
    diagnosis: 'Epilepsia refractaria, síndrome de Lennox-Gastaut',
    specialty: 'Neurología pediátrica',
    attendingDoctor: 'Dr. Iván Cáceres',
    district: 'San Martín de Porres',
    state: 'PENDING',
    summaryStatus: 'NONE',
    healthPost: POSTS.smp,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Electroencefalograma · 2 ago',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    id: 'cn',
    initials: 'C.N.',
    dni: '71028733',
    medicalRecord: 'HC-181265',
    sex: 'F',
    age: '17a 6m',
    monthsToEighteen: 6,
    diagnosis: 'Tetralogía de Fallot operada',
    specialty: 'Cardiología pediátrica',
    attendingDoctor: 'Dra. Rosa Manrique',
    district: 'Chorrillos',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
    healthPost: POSTS.chorrillos,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Control ambulatorio · 5 ago',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    id: 'bh',
    initials: 'B.H.',
    dni: '70745291',
    medicalRecord: 'HC-184490',
    sex: 'M',
    age: '17a 5m',
    monthsToEighteen: 7,
    diagnosis: 'Hemofilia A severa con profilaxis',
    specialty: 'Hematología pediátrica',
    attendingDoctor: 'Dr. Álvaro Solís',
    district: 'San Martín de Porres',
    state: 'PENDING',
    summaryStatus: 'NONE',
    healthPost: POSTS.smp,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Profilaxis · 5 ago',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    id: 'eg',
    initials: 'E.G.',
    dni: '71811460',
    medicalRecord: 'HC-179003',
    sex: 'F',
    age: '17a 3m',
    monthsToEighteen: 9,
    diagnosis: 'Lupus eritematoso sistémico con nefritis',
    specialty: 'Reumatología pediátrica',
    attendingDoctor: 'Dra. Rosa Manrique',
    district: 'Ate',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
    healthPost: POSTS.ate,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Control ambulatorio · 30 jul',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
  {
    // 10 meses: todavía no está habilitado (el proceso arranca a los 9).
    id: 'kf',
    initials: 'K.F.',
    dni: '72366015',
    medicalRecord: 'HC-209884',
    sex: 'M',
    age: '17a 2m',
    monthsToEighteen: 10,
    diagnosis: 'Diabetes mellitus tipo 1 de difícil control',
    specialty: 'Endocrinología pediátrica',
    attendingDoctor: 'Dr. Julio Paredes',
    district: 'Chorrillos',
    state: 'PENDING',
    summaryStatus: 'NONE',
    healthPost: POSTS.chorrillos,
    referredToPostAt: null,
    hospitalReferral: null,
    appointment: null,
    lastAction: 'Control metabólico · 5 ago',
    daysWaitingOnPost: null,
    postNotices: [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: null,
  },
];

/* ============================================================
   EL RESTO DE LA COHORTE — hasta ~50 pacientes
   ============================================================
   Los doce de arriba están escritos a mano porque cada uno cuenta algo (el
   que se cae, el que funciona, el que todavía no arrancó) y esos detalles no
   se pueden generar. Pero un tablero real tiene decenas de filas, y con doce
   no se ve lo que importa de verdad: que el especialista tiene que poder
   encontrar UNO entre muchos, paginar y filtrar.

   Así que el resto se arma con esta fábrica: la lista dice lo que cambia de
   cada paciente y `buildCase()` completa lo que se deduce de su estado —
   posta por distrito, derivación al hospital que corresponde, fechas, y la
   última acción. Escribirlos a mano sería 1.500 líneas donde la mitad
   terminaría contradiciéndose (un "derivado a la posta" sin posta, una cita
   antes del cumpleaños).

   Datos 100 % ficticios, DNIs incluidos. */

/** Qué posta y qué hospital de adultos le tocan a cada distrito. */
interface DistrictCare {
  post: HealthPost;
  hospital: string;
}

const BY_DISTRICT: Record<string, DistrictCare> = {
  'San Juan de Miraflores': {
    post: POSTS.sjm,
    hospital: 'Hospital María Auxiliadora',
  },
  'Villa El Salvador': {
    post: POSTS.ves,
    hospital: 'Hospital María Auxiliadora',
  },
  Chorrillos: {
    post: POSTS.chorrillos,
    hospital: 'Hospital María Auxiliadora',
  },
  Comas: { post: POSTS.comas, hospital: 'Hospital Sergio Bernales' },
  Carabayllo: { post: POSTS.carabayllo, hospital: 'Hospital Sergio Bernales' },
  'Puente Piedra': {
    post: POSTS.puentePiedra,
    hospital: 'Hospital Sergio Bernales',
  },
  Ate: { post: POSTS.ate, hospital: 'Hospital Hipólito Unanue' },
  'San Juan de Lurigancho': {
    post: POSTS.sjl,
    hospital: 'Hospital Hipólito Unanue',
  },
  'San Martín de Porres': {
    post: POSTS.smp,
    hospital: 'Hospital Cayetano Heredia',
  },
  Independencia: {
    post: POSTS.independencia,
    hospital: 'Hospital Cayetano Heredia',
  },
};

/** Quién sigue cada especialidad en el INSN. */
const DOCTOR_BY_SPECIALTY: Record<string, string> = {
  'Cardiología pediátrica': 'Dra. Rosa Manrique',
  'Oncología pediátrica': 'Dr. Álvaro Solís',
  'Nefrología pediátrica': 'Dr. Iván Cáceres',
  'Neumología pediátrica': 'Dra. Pilar Zúñiga',
  'Neurología pediátrica': 'Dra. Nadia Ortiz',
  'Reumatología pediátrica': 'Dra. Elsa Ramos',
  'Hematología pediátrica': 'Dr. Marcos Ibáñez',
  'Endocrinología pediátrica': 'Dr. Julio Paredes',
};

/** Lo que cambia de cada caso. El resto se deduce. */
interface CaseSpec {
  initials: string;
  dni: string;
  record: string;
  sex: 'F' | 'M';
  /** Meses que le faltan para cumplir 18. */
  months: number;
  specialty: keyof typeof DOCTOR_BY_SPECIALTY;
  diagnosis: string;
  district: keyof typeof BY_DISTRICT;
  state: TransitionState;
  summaryStatus: ClinicalSummaryStatus;
  /** Días que la posta lleva con el caso. Solo para los estados de posta. */
  daysOnPost?: number;
  /** Avance del checklist del paciente. Solo para los que ya tienen cita. */
  checklist?: number;
  /** Cuántos avisos ya se le mandaron a la posta. */
  reminders?: number;
}

/** El "hoy" contra el que están calculados todos los números del seed. */
const TODAY = '2026-08-11';
const DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Una fecha ISO sin zona, como la que devolvería el backend. */
function daysAgo(days: number, hour = '09:00'): string {
  const date = new Date(Date.parse(`${TODAY}T00:00`) - days * DAY);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hour}`;
}

/** "17a 9m" a partir de los meses que le faltan para los 18. */
function ageFor(months: number): string {
  const total = 18 * 12 - months;
  return `${Math.floor(total / 12)}a ${total % 12}m`;
}

function buildCase(spec: CaseSpec): PatientRow {
  const care = BY_DISTRICT[spec.district];
  // Antes de los 18 el recorrido llega hasta aquí: el área le avisó a la posta
  // y la posta espera el cumpleaños para pedir la cita. La historia clínica
  // viaja recién firmada (1 día antes del cumpleaños), así que un caso puede
  // estar avisado con su historia todavía en borrador.
  const notified = spec.state === 'REFERRED_TO_POST';
  const daysOnPost = notified ? (spec.daysOnPost ?? 20) : null;
  const noticeAt = notified ? daysAgo(daysOnPost ?? 20) : null;

  return {
    id: spec.initials.toLowerCase().replaceAll('.', ''),
    initials: spec.initials,
    dni: spec.dni,
    medicalRecord: spec.record,
    sex: spec.sex,
    age: ageFor(spec.months),
    monthsToEighteen: spec.months,
    diagnosis: spec.diagnosis,
    specialty: spec.specialty,
    attendingDoctor: DOCTOR_BY_SPECIALTY[spec.specialty],
    district: spec.district,
    state: spec.state,
    summaryStatus: spec.summaryStatus,
    healthPost: care.post,
    referredToPostAt: noticeAt,
    hospitalReferral: null,
    appointment: null,
    lastAction: lastActionFor(spec, noticeAt),
    daysWaitingOnPost: daysOnPost,
    // El aviso del área es lo que pone el caso en la posta: si el estado dice
    // "en la posta", el aviso existe.
    postNotices:
      notified && noticeAt
        ? [{ sentAt: noticeAt, sentBy: REFERRAL_AREA_STAFF }]
        : [],
    referralAlerts: [],
    counterReferralStatus: 'NONE',
    referralReviewStatus: 'NONE',
    checklistProgress: spec.checklist ?? null,
  };
}

/**
 * "Lo último" de cada caso. Las fechas de los borradores coinciden con las
 * que usa el store de historias clínicas para el seed: si la fila dijera una
 * fecha y la ficha otra, el que abre la demo lo nota enseguida.
 */
function lastActionFor(spec: CaseSpec, noticeAt: string | null): string {
  switch (spec.state) {
    case 'REFERRED_TO_POST':
      return `Aviso del área a la posta · ${formatShortDate(noticeAt ?? daysAgo(12))}`;
    case 'IN_PREPARATION':
      if (spec.summaryStatus === 'DRAFT') {
        return `Borrador de resumen · ${formatShortDate(SEED_DRAFTED_AT_FALLBACK)}`;
      }
      if (spec.summaryStatus === 'APPROVED') {
        return `Historia clínica firmada · ${formatShortDate(SEED_DRAFTED_AT_FALLBACK)}`;
      }
      return `Consulta de transición · ${formatShortDate(daysAgo(9))}`;
    default:
      return `Control ambulatorio · ${formatShortDate(daysAgo(14))}`;
  }
}

const MORE_CASES: readonly CaseSpec[] = [
  /* --- cardiología --- */
  {
    initials: 'K.R.',
    dni: '71455203',
    record: 'HC-211045',
    sex: 'M',
    months: 12,
    specialty: 'Cardiología pediátrica',
    diagnosis: 'Comunicación interventricular operada, control anual',
    district: 'Carabayllo',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'P.A.',
    dni: '70988147',
    record: 'HC-206388',
    sex: 'F',
    months: 8,
    specialty: 'Cardiología pediátrica',
    diagnosis: 'Estenosis aórtica moderada',
    district: 'Independencia',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'G.M.',
    dni: '72103956',
    record: 'HC-199872',
    sex: 'M',
    months: 5,
    specialty: 'Cardiología pediátrica',
    diagnosis: 'Miocardiopatía dilatada en tratamiento',
    district: 'Ate',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'V.C.',
    dni: '70612840',
    record: 'HC-187654',
    sex: 'F',
    months: 2,
    specialty: 'Cardiología pediátrica',
    diagnosis: 'Transposición de grandes vasos corregida',
    district: 'Comas',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    daysOnPost: 9,
  },
  {
    initials: 'N.B.',
    dni: '71377264',
    record: 'HC-193310',
    sex: 'M',
    months: 1,
    specialty: 'Cardiología pediátrica',
    diagnosis: 'Cardiopatía congénita cianótica con Fontan',
    district: 'San Juan de Lurigancho',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'APPROVED',
    daysOnPost: 31,
    checklist: 0.7,
  },

  /* --- oncología --- */
  {
    initials: 'T.C.',
    dni: '72240719',
    record: 'HC-205519',
    sex: 'F',
    months: 11,
    specialty: 'Oncología pediátrica',
    diagnosis: 'Linfoma de Hodgkin en remisión',
    district: 'Puente Piedra',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'A.M.',
    dni: '70854632',
    record: 'HC-208823',
    sex: 'M',
    months: 7,
    specialty: 'Oncología pediátrica',
    diagnosis: 'Tumor de Wilms, en vigilancia',
    district: 'San Martín de Porres',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'L.Q.',
    dni: '71690458',
    record: 'HC-190021',
    sex: 'F',
    months: 4,
    specialty: 'Oncología pediátrica',
    diagnosis: 'Leucemia linfoblástica aguda, en mantenimiento',
    district: 'Villa El Salvador',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'R.S.',
    dni: '70129573',
    record: 'HC-185534',
    sex: 'M',
    months: 2,
    specialty: 'Oncología pediátrica',
    diagnosis: 'Osteosarcoma de tibia, post-quirúrgico',
    district: 'Chorrillos',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    daysOnPost: 21,
  },
  {
    initials: 'D.P.',
    dni: '71904816',
    record: 'HC-197745',
    sex: 'F',
    months: 1,
    specialty: 'Oncología pediátrica',
    diagnosis: 'Neuroblastoma, en vigilancia',
    district: 'Ate',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'APPROVED',
    daysOnPost: 28,
    checklist: 0.9,
  },

  /* --- nefrología --- */
  {
    initials: 'F.H.',
    dni: '72518330',
    record: 'HC-212230',
    sex: 'M',
    months: 13,
    specialty: 'Nefrología pediátrica',
    diagnosis: 'Síndrome nefrótico corticorresistente',
    district: 'Comas',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'M.L.',
    dni: '70471925',
    record: 'HC-203118',
    sex: 'F',
    months: 9,
    specialty: 'Nefrología pediátrica',
    diagnosis: 'Enfermedad renal crónica estadio 3',
    district: 'San Juan de Miraflores',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'C.T.',
    dni: '71236084',
    record: 'HC-196654',
    sex: 'M',
    months: 6,
    specialty: 'Nefrología pediátrica',
    diagnosis: 'Displasia renal bilateral',
    district: 'Independencia',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'J.V.',
    dni: '70745018',
    record: 'HC-188990',
    sex: 'F',
    months: 3,
    specialty: 'Nefrología pediátrica',
    diagnosis: 'Trasplante renal (2024), en inmunosupresión',
    district: 'Carabayllo',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    daysOnPost: 18,
  },
  {
    initials: 'Y.O.',
    dni: '72087641',
    record: 'HC-192277',
    sex: 'M',
    months: 1,
    specialty: 'Nefrología pediátrica',
    diagnosis: 'Enfermedad renal crónica estadio 4, prediálisis',
    district: 'San Juan de Lurigancho',
    state: 'IN_PREPARATION',
    summaryStatus: 'APPROVED',
    reminders: 1,
  },

  /* --- neumología --- */
  {
    initials: 'B.S.',
    dni: '71563297',
    record: 'HC-209911',
    sex: 'F',
    months: 12,
    specialty: 'Neumología pediátrica',
    diagnosis: 'Asma severa de difícil control',
    district: 'Ate',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'I.M.',
    dni: '70318460',
    record: 'HC-201447',
    sex: 'M',
    months: 8,
    specialty: 'Neumología pediátrica',
    diagnosis: 'Bronquiectasias post-infecciosas',
    district: 'Villa El Salvador',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'E.R.',
    dni: '71872059',
    record: 'HC-194402',
    sex: 'F',
    months: 5,
    specialty: 'Neumología pediátrica',
    diagnosis: 'Fibrosis quística con insuficiencia pancreática',
    district: 'San Martín de Porres',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'O.C.',
    dni: '70690314',
    record: 'HC-186673',
    sex: 'M',
    months: 2,
    specialty: 'Neumología pediátrica',
    diagnosis: 'Displasia broncopulmonar con oxígeno nocturno',
    district: 'Puente Piedra',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    daysOnPost: 14,
  },
  {
    initials: 'S.G.',
    dni: '72394178',
    record: 'HC-191128',
    sex: 'F',
    months: 1,
    specialty: 'Neumología pediátrica',
    diagnosis: 'Fibrosis quística con colonización crónica',
    district: 'Comas',
    state: 'IN_PREPARATION',
    summaryStatus: 'APPROVED',
    checklist: 0.3,
  },

  /* --- neurología --- */
  {
    initials: 'H.A.',
    dni: '71048526',
    record: 'HC-210776',
    sex: 'M',
    months: 11,
    specialty: 'Neurología pediátrica',
    diagnosis: 'Parálisis cerebral con epilepsia asociada',
    district: 'San Juan de Lurigancho',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'Z.M.',
    dni: '70927413',
    record: 'HC-202259',
    sex: 'F',
    months: 7,
    specialty: 'Neurología pediátrica',
    diagnosis: 'Distonía generalizada',
    district: 'Chorrillos',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'U.P.',
    dni: '71715860',
    record: 'HC-195583',
    sex: 'M',
    months: 4,
    specialty: 'Neurología pediátrica',
    diagnosis: 'Epilepsia focal farmacorresistente',
    district: 'Independencia',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'W.T.',
    dni: '70283951',
    record: 'HC-189064',
    sex: 'F',
    months: 2,
    specialty: 'Neurología pediátrica',
    diagnosis: 'Distrofia muscular congénita',
    district: 'Ate',
    state: 'IN_PREPARATION',
    summaryStatus: 'DRAFT',
  },
  {
    initials: 'Q.L.',
    dni: '72156307',
    record: 'HC-193945',
    sex: 'M',
    months: 1,
    specialty: 'Neurología pediátrica',
    diagnosis: 'Esclerosis tuberosa con epilepsia',
    district: 'Carabayllo',
    state: 'IN_PREPARATION',
    summaryStatus: 'APPROVED',
    checklist: 0.6,
  },

  /* --- reumatología --- */
  {
    initials: 'X.F.',
    dni: '71430682',
    record: 'HC-207701',
    sex: 'F',
    months: 10,
    specialty: 'Reumatología pediátrica',
    diagnosis: 'Artritis idiopática juvenil poliarticular',
    district: 'Comas',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'N.R.',
    dni: '70561239',
    record: 'HC-200338',
    sex: 'M',
    months: 6,
    specialty: 'Reumatología pediátrica',
    diagnosis: 'Espondiloartritis juvenil',
    district: 'San Juan de Miraflores',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'K.M.',
    dni: '71982704',
    record: 'HC-197012',
    sex: 'F',
    months: 3,
    specialty: 'Reumatología pediátrica',
    diagnosis: 'Lupus eritematoso sistémico',
    district: 'Villa El Salvador',
    state: 'IN_PREPARATION',
    summaryStatus: 'DRAFT',
  },
  {
    initials: 'A.T.',
    dni: '70374815',
    record: 'HC-190876',
    sex: 'M',
    months: 2,
    specialty: 'Reumatología pediátrica',
    diagnosis: 'Dermatomiositis juvenil',
    district: 'Puente Piedra',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    daysOnPost: 8,
  },
  {
    initials: 'R.C.',
    dni: '72609148',
    record: 'HC-184219',
    sex: 'F',
    months: 1,
    specialty: 'Reumatología pediátrica',
    diagnosis: 'Artritis idiopática juvenil sistémica',
    district: 'San Martín de Porres',
    state: 'IN_PREPARATION',
    summaryStatus: 'DRAFT',
    checklist: 0.45,
  },

  /* --- hematología --- */
  {
    initials: 'G.P.',
    dni: '71127493',
    record: 'HC-211590',
    sex: 'M',
    months: 14,
    specialty: 'Hematología pediátrica',
    diagnosis: 'Anemia de células falciformes',
    district: 'San Juan de Lurigancho',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'L.B.',
    dni: '70806572',
    record: 'HC-204465',
    sex: 'F',
    months: 9,
    specialty: 'Hematología pediátrica',
    diagnosis: 'Púrpura trombocitopénica inmune crónica',
    district: 'Chorrillos',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'T.N.',
    dni: '71659038',
    record: 'HC-198337',
    sex: 'M',
    months: 5,
    specialty: 'Hematología pediátrica',
    diagnosis: 'Talasemia mayor en transfusión crónica',
    district: 'Independencia',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'V.S.',
    dni: '70240917',
    record: 'HC-191704',
    sex: 'F',
    months: 2,
    specialty: 'Hematología pediátrica',
    diagnosis: 'Hemofilia B moderada',
    district: 'Carabayllo',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    daysOnPost: 16,
    reminders: 1,
  },
  {
    initials: 'E.D.',
    dni: '72471285',
    record: 'HC-187028',
    sex: 'M',
    months: 1,
    specialty: 'Hematología pediátrica',
    diagnosis: 'Anemia aplásica post-tratamiento',
    district: 'Comas',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'APPROVED',
    daysOnPost: 30,
    checklist: 0.8,
  },

  /* --- endocrinología --- */
  {
    initials: 'C.A.',
    dni: '71583640',
    record: 'HC-212884',
    sex: 'F',
    months: 13,
    specialty: 'Endocrinología pediátrica',
    diagnosis: 'Hipotiroidismo congénito',
    district: 'Ate',
    state: 'PENDING',
    summaryStatus: 'NONE',
  },
  {
    initials: 'J.R.',
    dni: '70695128',
    record: 'HC-205072',
    sex: 'M',
    months: 8,
    specialty: 'Endocrinología pediátrica',
    diagnosis: 'Diabetes mellitus tipo 1',
    district: 'Puente Piedra',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'P.M.',
    dni: '71308954',
    record: 'HC-199650',
    sex: 'F',
    months: 4,
    specialty: 'Endocrinología pediátrica',
    diagnosis: 'Insuficiencia suprarrenal congénita',
    district: 'San Juan de Miraflores',
    state: 'IN_PREPARATION',
    summaryStatus: 'NONE',
  },
  {
    initials: 'D.L.',
    dni: '72043716',
    record: 'HC-192419',
    sex: 'M',
    months: 2,
    specialty: 'Endocrinología pediátrica',
    diagnosis: 'Diabetes tipo 1 con nefropatía incipiente',
    district: 'Villa El Salvador',
    state: 'IN_PREPARATION',
    summaryStatus: 'DRAFT',
  },
  {
    initials: 'S.Q.',
    dni: '70917462',
    record: 'HC-186340',
    sex: 'F',
    months: 1,
    specialty: 'Endocrinología pediátrica',
    diagnosis: 'Panhipopituitarismo',
    district: 'San Juan de Lurigancho',
    state: 'REFERRED_TO_POST',
    summaryStatus: 'DRAFT',
    daysOnPost: 25,
    checklist: 0.55,
  },
];

const MORE_IN_TUTELAGE: readonly PatientRow[] = MORE_CASES.map(buildCase);

/* ============================================================
   Y CINCUENTA MÁS — volumen para que el tablero se sienta real
   ============================================================
   Con ~50 filas los cortes, la paginación y el recorte por especialidad ya
   se prueban; con ~100, cada especialista tiene una cohorte creíble (12-14
   pacientes suyos) en lugar de un puñado. Estos casos extra no cuentan
   ninguna historia particular —para eso están los de arriba—, así que se
   generan en un bucle determinista: nada de Math.random, la demo tiene que
   verse igual en cada máquina.

   Datos 100 % ficticios, DNIs incluidos. */

const EXTRA_DIAGNOSES: Record<string, readonly string[]> = {
  'Cardiología pediátrica': [
    'Comunicación interauricular en seguimiento',
    'Miocardiopatía hipertrófica familiar',
    'Coartación de aorta operada',
  ],
  'Oncología pediátrica': [
    'Linfoma no Hodgkin, en vigilancia',
    'Tumor germinal, en remisión',
    'Retinoblastoma bilateral tratado',
  ],
  'Nefrología pediátrica': [
    'Reflujo vesicoureteral con daño renal',
    'Glomerulonefritis crónica',
    'Poliquistosis renal',
  ],
  'Neumología pediátrica': [
    'Asma persistente moderada',
    'Bronquiolitis obliterante post-infecciosa',
    'Hipertensión pulmonar en tratamiento',
  ],
  'Neurología pediátrica': [
    'Epilepsia generalizada en tratamiento',
    'Miastenia gravis juvenil',
    'Secuela de encefalitis, en rehabilitación',
  ],
  'Reumatología pediátrica': [
    'Artritis idiopática juvenil oligoarticular',
    'Esclerodermia localizada',
    'Vasculitis por IgA con compromiso renal',
  ],
  'Hematología pediátrica': [
    'Talasemia intermedia',
    'Esferocitosis hereditaria',
    'Enfermedad de von Willebrand tipo 2',
  ],
  'Endocrinología pediátrica': [
    'Hipopituitarismo en reemplazo hormonal',
    'Hiperplasia suprarrenal congénita',
    'Síndrome de Turner en seguimiento',
  ],
};

/**
 * Genera `count` casos plausibles y consistentes con las reglas: el estado,
 * la firma y los días en la posta se derivan de los meses que le faltan, no
 * se sortean — un "en la posta" sin firma sería una fila imposible.
 */
/**
 * Las iniciales libres, en orden: el id sale de ellas y no puede chocar con
 * ningún caso escrito a mano. Los dos generadores (tutela y post-18) toman
 * tramos distintos de esta misma lista, así que tampoco chocan entre sí.
 */
function freeInitials(count: number, offset = 0): string[] {
  const taken = new Set([
    ...IN_TUTELAGE.map((row) => row.id),
    ...MORE_CASES.map((spec) =>
      spec.initials.toLowerCase().replaceAll('.', ''),
    ),
    'hs',
    'nc',
    'jl',
    'td',
    'fz',
  ]);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const free: string[] = [];
  for (const first of alphabet) {
    for (const second of alphabet) {
      if (free.length >= offset + count) break;
      if (!taken.has(`${first}${second}`.toLowerCase())) {
        free.push(`${first}.${second}.`);
      }
    }
  }
  return free.slice(offset);
}

function extraCases(count: number): CaseSpec[] {
  const initialsPool = freeInitials(count);

  const specialties = Object.keys(DOCTOR_BY_SPECIALTY);
  const districts = Object.keys(BY_DISTRICT);

  return initialsPool.map((initials, index) => {
    const specialty = specialties[index % specialties.length];
    const months = (index % 14) + 1;
    const inWindow = months <= 2;
    // El recorrido acompaña al calendario: cerca de los 18 el caso ya está
    // firmado y avisado; lejos, recién empieza.
    const phase = index % 5;
    const state =
      inWindow && phase >= 2
        ? ('REFERRED_TO_POST' as const)
        : phase === 0
          ? ('PENDING' as const)
          : ('IN_PREPARATION' as const);
    // La historia se crea desde los 3 meses y se firma recién en el último:
    // fuera de ventana no hay ni borrador, y firmada solo la del que cumple
    // el mes que viene.
    const summaryStatus =
      months > 3
        ? ('NONE' as const)
        : months <= 1 && phase >= 3
          ? ('APPROVED' as const)
          : phase >= 2
            ? ('DRAFT' as const)
            : ('NONE' as const);

    return {
      initials,
      dni: String(73100000 + index * 1327),
      record: `HC-3${String(10000 + index * 13).padStart(5, '0')}`,
      sex: index % 2 === 0 ? ('F' as const) : ('M' as const),
      months,
      specialty,
      diagnosis:
        EXTRA_DIAGNOSES[specialty][index % EXTRA_DIAGNOSES[specialty].length],
      district: districts[index % districts.length],
      state,
      summaryStatus,
      daysOnPost: state === 'REFERRED_TO_POST' ? 4 + (index % 22) : undefined,
    };
  });
}

const EXTRA_IN_TUTELAGE: readonly PatientRow[] = extraCases(50).map(buildCase);

/* ============================================================
   POST-TRANSICIÓN — ya cumplieron 18, fuera de tutela
   ============================================================ */

const POST_TRANSITION: readonly PatientRow[] = [
  {
    // El post-18 del oncólogo: sin él, el panel "Ya cumplieron 18" del
    // usuario `medico` quedaba vacío y parecía roto.
    id: 'fz',
    initials: 'F.Z.',
    dni: '70563391',
    medicalRecord: 'HC-175540',
    sex: 'M',
    age: '18a 2m',
    monthsToEighteen: -2,
    turnedEighteenAt: '2026-06-20T00:00',
    diagnosis: 'Linfoma de Hodgkin, en vigilancia post-tratamiento',
    specialty: 'Oncología pediátrica',
    attendingDoctor: 'Dr. Álvaro Solís',
    district: 'San Juan de Miraflores',
    state: 'FIRST_CARE_DONE',
    summaryStatus: 'APPROVED',
    healthPost: POSTS.sjm,
    referredToPostAt: '2026-04-11T09:00',
    hospitalReferral: {
      hospital: 'Hospital María Auxiliadora',
      specialty: 'Oncología de adultos',
      doctor: 'Dr. Hugo Meneses',
      referredAt: '2026-06-15T09:00',
    },
    appointment: {
      hospital: 'Hospital María Auxiliadora',
      specialist: 'Dr. Hugo Meneses — Oncología de adultos',
      date: '2026-06-30T09:30',
      reason: 'Continuidad de vigilancia oncológica',
      managedBy: 'C.S. San Juan de Miraflores',
    },
    lastAction: 'Primera atención · 30 jun',
    daysWaitingOnPost: 65,
    postNotices: [{ sentAt: '2026-04-11T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'SENT',
    referralReviewStatus: 'NONE',
    checklistProgress: 1,
  },
  {
    id: 'hs',
    initials: 'H.S.',
    dni: '70459128',
    medicalRecord: 'HC-184490',
    sex: 'M',
    age: '18a 1m',
    monthsToEighteen: -1,
    turnedEighteenAt: '2026-07-05T00:00',
    diagnosis: 'Trasplante renal de donante vivo (2023)',
    specialty: 'Nefrología pediátrica',
    attendingDoctor: 'Dr. Iván Cáceres',
    district: 'San Martín de Porres',
    state: 'FIRST_CARE_DONE',
    summaryStatus: 'APPROVED',
    healthPost: POSTS.smp,
    referredToPostAt: '2026-05-20T09:00',
    hospitalReferral: {
      hospital: 'Hospital Cayetano Heredia',
      specialty: 'Nefrología de adultos',
      doctor: 'Dra. Paula Rivas',
      referredAt: '2026-06-02T09:00',
    },
    appointment: {
      hospital: 'Hospital Cayetano Heredia',
      specialist: 'Dra. Paula Rivas — Nefrología de adultos',
      date: '2026-07-14T09:00',
      reason: 'Continuidad de control post-trasplante',
      managedBy: 'C.S. San Martín de Porres',
    },
    lastAction: 'Primera atención · 14 jul',
    daysWaitingOnPost: 26,
    postNotices: [{ sentAt: '2026-05-20T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'SENT',
    referralReviewStatus: 'NONE',
    checklistProgress: 1,
  },
  {
    id: 'nc',
    initials: 'N.C.',
    dni: '71173864',
    medicalRecord: 'HC-181265',
    sex: 'F',
    age: '18a 3m',
    monthsToEighteen: -3,
    turnedEighteenAt: '2026-05-08T00:00',
    diagnosis: 'Cardiopatía congénita operada, seguimiento anual',
    specialty: 'Cardiología pediátrica',
    attendingDoctor: 'Dra. Rosa Manrique',
    district: 'Chorrillos',
    state: 'FIRST_CARE_DONE',
    summaryStatus: 'APPROVED',
    healthPost: POSTS.chorrillos,
    referredToPostAt: '2026-04-08T09:00',
    hospitalReferral: {
      hospital: 'Hospital María Auxiliadora',
      specialty: 'Cardiología de adultos',
      doctor: 'Dra. Lucía Ferrer',
      referredAt: '2026-04-22T09:00',
    },
    appointment: {
      hospital: 'Hospital María Auxiliadora',
      specialist: 'Dra. Lucía Ferrer — Cardiología de adultos',
      date: '2026-05-20T11:00',
      reason: 'Continuidad de control cardiológico',
      managedBy: 'P.S. Delicias de Villa',
    },
    lastAction: 'Primera atención · 20 may',
    daysWaitingOnPost: 42,
    postNotices: [{ sentAt: '2026-04-08T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'SENT',
    referralReviewStatus: 'NONE',
    checklistProgress: 1,
  },
  {
    // El que se cayó: no fue a su primera cita y nadie lo agarró.
    id: 'jl',
    initials: 'J.L.',
    dni: '70620497',
    medicalRecord: 'HC-179003',
    sex: 'F',
    age: '18a 2m',
    monthsToEighteen: -2,
    turnedEighteenAt: '2026-06-02T00:00',
    diagnosis: 'Lupus eritematoso sistémico con nefritis',
    specialty: 'Reumatología pediátrica',
    attendingDoctor: 'Dra. Rosa Manrique',
    district: 'Ate',
    state: 'LOST_TO_FOLLOW_UP',
    summaryStatus: 'APPROVED',
    healthPost: POSTS.ate,
    referredToPostAt: '2026-04-20T09:00',
    hospitalReferral: {
      hospital: 'Hospital Hipólito Unanue',
      specialty: 'Reumatología de adultos',
      doctor: 'Dr. Marco Vega',
      referredAt: '2026-05-11T09:00',
    },
    appointment: {
      hospital: 'Hospital Hipólito Unanue',
      specialist: 'Dr. Marco Vega — Reumatología de adultos',
      date: '2026-06-11T08:30',
      reason: 'Continuidad de tratamiento inmunosupresor',
      managedBy: 'C.S. Ate Vitarte',
    },
    lastAction: 'No asistió · 11 jun',
    daysWaitingOnPost: 61,
    postNotices: [{ sentAt: '2026-04-20T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'SENT',
    referralReviewStatus: 'NONE',
    checklistProgress: 0.3,
  },
  {
    // Se lo recuperó con búsqueda activa después de dos citas perdidas.
    id: 'td',
    initials: 'T.D.',
    dni: '71938205',
    medicalRecord: 'HC-176882',
    sex: 'M',
    age: '18a 5m',
    monthsToEighteen: -5,
    turnedEighteenAt: '2026-03-15T00:00',
    diagnosis: 'Distrofia muscular de Duchenne',
    specialty: 'Neurología pediátrica',
    attendingDoctor: 'Dra. Nadia Ortiz',
    district: 'Comas',
    state: 'READMITTED',
    summaryStatus: 'APPROVED',
    healthPost: POSTS.comas,
    referredToPostAt: '2026-02-10T09:00',
    hospitalReferral: {
      hospital: 'Hospital Sergio Bernales',
      specialty: 'Neurología de adultos',
      doctor: 'Dr. Sergio Antúnez',
      referredAt: '2026-03-02T09:00',
    },
    appointment: {
      hospital: 'Hospital Sergio Bernales',
      specialist: 'Dr. Sergio Antúnez — Neurología de adultos',
      date: '2026-08-28T09:00',
      reason: 'Reingreso tras 2 citas perdidas',
      managedBy: 'P.S. Año Nuevo — Comas',
    },
    lastAction: 'Reingreso registrado · 7 ago',
    daysWaitingOnPost: 182,
    postNotices: [{ sentAt: '2026-02-10T09:00', sentBy: REFERRAL_AREA_STAFF }],
    referralAlerts: [],
    counterReferralStatus: 'UPLOADED',
    referralReviewStatus: 'NONE',
    checklistProgress: 0.6,
  },
];

/* ============================================================
   Y DIEZ POST-18 MÁS — el panel de seguimiento con volumen real
   ============================================================
   Con 5 filas la paginación y el orden por problema no se ven. Estos diez
   completan 15: la mayoría siguiendo su tratamiento, un par perdidos y un
   par recuperados, porque esa es la proporción que el panel tiene que
   enseñar a leer. Deterministas, como los de tutela. */

function extraPostTransition(count: number): PatientRow[] {
  // El tramo de iniciales que viene DESPUÉS del que usan los 50 de tutela.
  const initialsPool = freeInitials(count, 50);
  const specialties = Object.keys(DOCTOR_BY_SPECIALTY);
  const districts = Object.keys(BY_DISTRICT);
  const outcomes: readonly TransitionState[] = [
    'FIRST_CARE_DONE',
    'FIRST_CARE_DONE',
    'FIRST_CARE_DONE',
    'LOST_TO_FOLLOW_UP',
    'READMITTED',
  ];

  return initialsPool.map((initials, index) => {
    const specialty = specialties[index % specialties.length];
    const district = districts[index % districts.length];
    const care = BY_DISTRICT[district];
    const monthsPast = 1 + (index % 6);
    const state = outcomes[index % outcomes.length];
    const adultSpecialty = specialty.replace(' pediátrica', ' de adultos');
    const appointmentAt = daysAgo(30 + index * 11, '09:30');

    return {
      id: initials.toLowerCase().replaceAll('.', ''),
      initials,
      dni: String(74200000 + index * 911),
      medicalRecord: `HC-4${String(20000 + index * 17).padStart(5, '0')}`,
      sex: index % 2 === 0 ? ('M' as const) : ('F' as const),
      age: `18a ${monthsPast}m`,
      monthsToEighteen: -monthsPast,
      turnedEighteenAt: daysAgo(monthsPast * 30 + 5, '00:00'),
      diagnosis:
        EXTRA_DIAGNOSES[specialty][index % EXTRA_DIAGNOSES[specialty].length],
      specialty,
      attendingDoctor: DOCTOR_BY_SPECIALTY[specialty],
      district,
      state,
      summaryStatus: 'APPROVED' as const,
      healthPost: care.post,
      referredToPostAt: daysAgo(60 + monthsPast * 30),
      hospitalReferral: {
        hospital: care.hospital,
        specialty: adultSpecialty,
        doctor: null,
        referredAt: daysAgo(20 + monthsPast * 30, '11:00'),
      },
      appointment: {
        hospital: care.hospital,
        specialist: `${adultSpecialty} — ${care.hospital}`,
        date: appointmentAt,
        reason: `Continuidad de control en ${adultSpecialty.toLowerCase()}`,
        managedBy: care.post.name,
      },
      lastAction:
        state === 'FIRST_CARE_DONE'
          ? `Primera atención · ${formatShortDate(appointmentAt)}`
          : state === 'READMITTED'
            ? `Reingreso registrado · ${formatShortDate(daysAgo(6 + index))}`
            : `No asistió · ${formatShortDate(appointmentAt)}`,
      daysWaitingOnPost: null,
      postNotices: [
        {
          sentAt: daysAgo(60 + monthsPast * 30),
          sentBy: REFERRAL_AREA_STAFF,
        },
      ],
      referralAlerts: [],
      counterReferralStatus: 'SENT' as const,
      referralReviewStatus: 'NONE',
      checklistProgress: state === 'LOST_TO_FOLLOW_UP' ? 0.3 : 1,
    };
  });
}

const EXTRA_POST_TRANSITION: readonly PatientRow[] = extraPostTransition(10);

/** La cohorte del especialista: los doce con nombre propio y el resto. */
const TUTELAGE: readonly PatientRow[] = [
  ...IN_TUTELAGE,
  ...MORE_IN_TUTELAGE,
  ...EXTRA_IN_TUTELAGE,
];

/** Todas las filas de la tabla, sin importar el tramo. */
export const PATIENTS: readonly PatientRow[] = [
  ...TUTELAGE,
  ...POST_TRANSITION,
  ...EXTRA_POST_TRANSITION,
];

/* ============================================================
   Hidratación — la fila como la devolvería el servidor
   ============================================================
   Las filas de arriba son la tabla; todo lo que pasó **después** vive en los
   stores de cada dominio (historias clínicas, referencias). Aquí se juntan,
   igual que un SELECT con sus JOIN. */

/** Una fila con sus documentos y lo que el área hizo con el caso. */
function hydrateOne(row: PatientRow): Patient {
  const patient = applyClinicalSummary(applyReferrals(row));

  // "Lo último" es lo último de verdad: cada store propone su acción con
  // fecha y gana la más nueva. Sin esto, firmar un resumen borraría de la
  // vista un aviso a la posta posterior (o al revés) según el orden en que
  // corran las proyecciones.
  const latest = [clinicalSummaryAction(row.id), referralAction(row.id)]
    .filter((action) => action !== null)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .at(0);

  return latest ? { ...patient, lastAction: latest.text } : patient;
}

function hydrate(rows: readonly PatientRow[]): Patient[] {
  return rows.map(hydrateOne);
}

/** Los que todavía no cumplieron 18: el tablero del especialista. */
export function listInTutelage(): Patient[] {
  return hydrate(TUTELAGE);
}

/** Los que ya cruzaron: el panel de seguimiento. */
export function listPostTransition(): Patient[] {
  return hydrate([...POST_TRANSITION, ...EXTRA_POST_TRANSITION]);
}

export function findPatient(patientId: string): Patient | null {
  const row = PATIENTS.find((patient) => patient.id === patientId);
  return row ? hydrateOne(row) : null;
}
