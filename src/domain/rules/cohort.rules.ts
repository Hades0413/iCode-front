import type { Patient } from '../entities/patient.entity';
import {
  TRANSITION_STATES,
  isTransitionEnabled,
  needsApprovedSummary,
} from './transition.rules';

/**
 * Reglas que valen para la COHORTE entera (la lista de pacientes en
 * tutela), no para uno solo: qué significa cada filtro, qué mide cada KPI,
 * qué merece una alerta y en qué orden.
 *
 * Están aquí y no en el componente porque son definiciones de negocio:
 * "esperando a la posta" significa lo mismo en el KPI, en el chip de filtro,
 * en la tabla y en un reporte. La cohorte de un especialista es acotada
 * (decenas de pacientes), así que filtrar y ordenar en el cliente es
 * correcto; si algún día crece, estas mismas funciones se mueven a query
 * params sin tocar la UI.
 */

export type CohortFilterKey = 'todos' | 'proximos' | 'accion';

export interface CohortFilter {
  key: CohortFilterKey;
  label: string;
  matches: (patient: Patient) => boolean;
}

/**
 * Los tres cortes que se hace un especialista sobre su cohorte, todos sobre
 * lo mismo: el trabajo que le falta antes de que el paciente cumpla 18.
 *
 * Ojo con lo que NO está. "Riesgo de pérdida" no aparece porque nadie puede
 * perderse antes de cruzar — eso se mide después de los 18, en el panel de
 * seguimiento. Y "esperando a la posta" / "ya tienen cita" tampoco: son
 * estados del caso, no trabajo del especialista, y ya se leen en la columna
 * de estado de cada fila.
 */
export const COHORT_FILTERS: readonly CohortFilter[] = [
  { key: 'todos', label: 'Todos', matches: () => true },
  {
    key: 'proximos',
    label: 'Cumplen 18 pronto',
    matches: (p) => p.monthsToEighteen > 0 && p.monthsToEighteen <= 3,
  },
  {
    key: 'accion',
    label: 'Sin historia clínica firmada',
    matches: needsApprovedSummary,
  },
];

/**
 * Con qué corte abre el tablero. No es "todos" a propósito: antes de los 18
 * el trabajo del especialista es la historia clínica, así que la lista arranca
 * mostrando **lo que le falta hacer** y no la cohorte entera. Los demás cortes
 * (incluido "Todos") siguen a un click en la barra y en el riel — filtrar por
 * defecto es ordenar el trabajo, no esconder pacientes.
 */
export const DEFAULT_COHORT_FILTER: CohortFilterKey = 'accion';

export function isCohortFilterKey(value: string): value is CohortFilterKey {
  return COHORT_FILTERS.some((filter) => filter.key === value);
}

export function cohortFilterLabel(key: CohortFilterKey): string {
  return COHORT_FILTERS.find((filter) => filter.key === key)?.label ?? 'Todos';
}

export type CohortSort = 'meses' | 'estado';

export function isCohortSort(value: string): value is CohortSort {
  return value === 'meses' || value === 'estado';
}

/** Solo los dígitos: así "12.345.678" y "12345678" son el mismo DNI. */
function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Busca **por DNI**, y no por texto libre sobre media ficha.
 *
 * Es el cambio que pidió el uso real: el especialista no busca "el de
 * cardiología", busca a UNO, y llega con el documento en la mano — se lo dijo
 * la madre por teléfono, está en la orden, lo tiene en la pantalla del SIS.
 * Para lo otro están los cortes y el filtro por especialidad, que son
 * exactos; una búsqueda que además matchea diagnósticos devuelve nueve filas
 * cuando querías una.
 *
 * Se acepta cualquier prefijo para poder ir tipeando, y se ignoran puntos y
 * espacios.
 */
function matchesDni(patient: Patient, query: string): boolean {
  const typed = digits(query);
  return typed === '' || digits(patient.dni).startsWith(typed);
}

/**
 * La misma búsqueda, suelta: el panel de seguimiento no usa los cortes de la
 * cohorte pero busca por DNI igual que el tablero — y tiene que encontrar
 * con las mismas reglas (prefijo, sin puntos).
 */
export function searchByDni(
  patients: readonly Patient[],
  query: string,
): Patient[] {
  const typed = query.trim();
  return typed === ''
    ? [...patients]
    : patients.filter((patient) => matchesDni(patient, typed));
}

export interface CohortView {
  filter: CohortFilterKey;
  /** El DNI que se está tipeando. Vacío = sin buscar. */
  query: string;
  sort: CohortSort;
}

/*
 * Ojo con lo que NO hay: filtro por especialidad. El médico solo recibe
 * pacientes de la suya —el recorte lo hace el servidor con su sesión— y un
 * filtro del cliente sobre eso sería o redundante o, peor, la ilusión de que
 * el recorte es una preferencia de la pantalla.
 */

export function selectCohort(
  patients: readonly Patient[],
  view: CohortView,
): Patient[] {
  const filter = COHORT_FILTERS.find((f) => f.key === view.filter);
  const query = view.query.trim();

  return patients
    .filter((patient) => (filter ? filter.matches(patient) : true))
    .filter((patient) => (query ? matchesDni(patient, query) : true))
    .sort((a, b) =>
      view.sort === 'estado'
        ? TRANSITION_STATES.indexOf(a.state) -
          TRANSITION_STATES.indexOf(b.state)
        : a.monthsToEighteen - b.monthsToEighteen,
    );
}

/* ---------- resumen y KPIs ---------- */

export function cohortSummary(patients: readonly Patient[]) {
  return {
    total: patients.length,
    turning18Soon: patients.filter(
      (p) => p.monthsToEighteen > 0 && p.monthsToEighteen <= 3,
    ).length,
    withoutApprovedSummary: patients.filter(needsApprovedSummary).length,
    /** De esos, los que ni borrador tienen: hay que generarlo. */
    withoutSummary: patients.filter(
      (p) => needsApprovedSummary(p) && p.summaryStatus === 'NONE',
    ).length,
    /** Y los que ya tienen borrador esperando que un médico lo firme. */
    awaitingReview: patients.filter(
      (p) => needsApprovedSummary(p) && p.summaryStatus === 'DRAFT',
    ).length,
    enabled: patients.filter(isTransitionEnabled).length,
  };
}

export type KpiSeverity = 'neutral' | 'ok' | 'warn' | 'crit';

/**
 * Un pedazo del número, para poder mostrar de qué está hecho. "22 sin
 * historia clínica" no dice lo mismo que "13 sin generar y 9 esperando tu
 * firma", y son dos trabajos distintos.
 */
export interface KpiPart {
  label: string;
  value: number;
  severity: KpiSeverity;
}

export interface CohortKpi {
  /** El filtro que aplica al hacer click: el KPI y la lista dicen lo mismo. */
  key: CohortFilterKey;
  label: string;
  value: number;
  /** Sobre cuántos, para el medidor de proporción. */
  total: number;
  /** Una línea de contexto: qué hay detrás del número. */
  hint: string;
  severity: KpiSeverity;
  /** De qué está hecho el número. Vacío = no se descompone. */
  parts: KpiPart[];
}

/**
 * Los tres números que le dicen a un especialista si tiene que hacer algo
 * hoy. Cada uno es clickeable y filtra la lista por lo mismo que mide — un
 * KPI que no lleva a ninguna parte es un adorno — y cada uno dice **de qué
 * está hecho**, porque el total solo esconde el trabajo: "22 sin historia
 * clínica" son 13 que hay que generar y 9 que hay que leer y firmar, que no
 * es lo mismo ni lleva el mismo tiempo.
 */
export function cohortKpis(patients: readonly Patient[]): CohortKpi[] {
  const s = cohortSummary(patients);
  const nextBirthday = patients
    .filter((p) => p.monthsToEighteen > 0)
    .reduce(
      (soonest, p) => Math.min(soonest, p.monthsToEighteen),
      Number.POSITIVE_INFINITY,
    );

  return [
    {
      key: 'todos',
      label: 'Pacientes en tutela',
      value: s.total,
      total: s.total,
      hint:
        s.enabled > 0
          ? `${s.enabled} ya entraron al proceso de traspaso; el resto todavía no le toca`
          : 'ninguno entró todavía al proceso de traspaso',
      severity: 'neutral',
      parts: [
        { label: 'en proceso', value: s.enabled, severity: 'warn' },
        {
          label: 'aún no arranca',
          value: s.total - s.enabled,
          severity: 'neutral',
        },
      ],
    },
    {
      key: 'proximos',
      label: 'Cumplen 18 pronto',
      value: s.turning18Soon,
      total: s.total,
      hint:
        s.turning18Soon > 0
          ? Number.isFinite(nextBirthday)
            ? `su historia ya se puede crear · el más próximo cumple en ${nextBirthday === 1 ? '1 mes' : `${nextBirthday} meses`}`
            : 'en 3 meses o menos: su historia ya se puede crear'
          : 'nadie cumple 18 en los próximos 3 meses',
      severity: s.turning18Soon > 0 ? 'warn' : 'neutral',
      parts: [],
    },
    {
      key: 'accion',
      label: 'Sin historia clínica',
      value: s.withoutApprovedSummary,
      total: s.total,
      hint:
        s.withoutApprovedSummary > 0
          ? 'se firma 1 día antes del cumpleaños: la campanita avisa'
          : 'todos tienen su historia clínica firmada',
      severity: s.withoutApprovedSummary > 0 ? 'crit' : 'ok',
      parts: [
        { label: 'sin generar', value: s.withoutSummary, severity: 'crit' },
        {
          label: 'esperando tu firma',
          value: s.awaitingReview,
          severity: 'warn',
        },
      ],
    },
  ];
}

/* ---------- seguimiento post-transición ---------- */

/** Los números del panel de los que ya cumplieron 18. */
export function followUpSummary(patients: readonly Patient[]) {
  const attended = patients.filter((p) => p.state === 'FIRST_CARE_DONE').length;
  const lost = patients.filter((p) => p.state === 'LOST_TO_FOLLOW_UP').length;
  const readmitted = patients.filter((p) => p.state === 'READMITTED').length;
  const total = patients.length;

  return {
    total,
    attended,
    lost,
    readmitted,
    /** % que llegó a su primera cita de adultos. */
    adherence: total === 0 ? 0 : Math.round((attended / total) * 100),
  };
}
