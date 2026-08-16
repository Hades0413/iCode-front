import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { referralReviewService } from '../../composition-root';
import type { Patient } from '../../domain/entities/patient.entity';
import {
  DEFAULT_COHORT_FILTER,
  cohortFilterLabel,
  cohortKpis,
  cohortSummary,
  isCohortFilterKey,
  isCohortSort,
  isReferralStatusFilter,
  selectCohort,
  type CohortFilterKey,
  type CohortSort,
  type ReferralStatusFilter,
} from '../../domain/rules/cohort.rules';
import { PERMISSIONS } from '../../domain/rules/permissions';
import { formatLongDate } from '../../common/utils/format-date';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { saveBlob } from '../../common/utils/save-blob';
import { CohortFilterBar } from '../components/cohort-filter-bar';
import { CohortStats } from '../components/cohort-stats';
import { PatientsTable } from '../components/patients-table';
import { Toasts } from '../components/toasts';
import { PageHeader, PageHeaderStat } from '../components/ui/page-header';
import { Pagination } from '../components/ui/pagination';
import { Section } from '../components/ui/section';
import { LoadErrorState, LoadingRows } from '../components/ui/states';
import { useCohort } from '../hooks/use-cohort';
import { useToasts } from '../hooks/use-toasts';
import styles from './patients.page.module.css';

/** Ancla del listado, para que la barra de filtros pueda llevar el scroll. */
const LIST_ANCHOR = 'lista';

/**
 * Cuántas filas por página. Diez es lo que entra en pantalla sin scrollear la
 * tabla: la cohorte de un especialista son decenas de pacientes y mostrarlas
 * todas juntas convierte el tablero en una lista infinita que nadie recorre.
 */
const PAGE_SIZE = 10;

/**
 * "Pacientes en tutela" — el tablero del especialista de pediatría.
 *
 * En tutela significa **todavía no cumplió 18**: en cuanto los cumple, el
 * paciente sale de esta lista y pasa a "Referencias aceptadas".
 *
 * La pantalla es **la lista y nada más**: los cortes con sus conteos arriba
 * (que son navegación, no contenido) y la cohorte completa abajo. Cada fila
 * abre la ficha del paciente, que es donde se genera/completa la historia
 * clínica y se firma; la única acción que vive en la fila es "Ver PDF" de
 * una observación, porque no tiene sentido abrir la ficha entera para eso.
 */
export function PatientsPage() {
  const { patients, isLoading, error, reload } = useCohort();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, push } = useToasts();

  // Sin ?filtro, el tablero abre mostrando toda la cohorte (ver
  // DEFAULT_COHORT_FILTER).
  const rawFilter = params.get('filtro') ?? DEFAULT_COHORT_FILTER;
  const rawSort = params.get('orden') ?? 'meses';
  const filter: CohortFilterKey = isCohortFilterKey(rawFilter)
    ? rawFilter
    : DEFAULT_COHORT_FILTER;
  const sort: CohortSort = isCohortSort(rawSort) ? rawSort : 'meses';
  const query = params.get('q') ?? '';
  const rawReferralStatus = params.get('revision') ?? 'ALL';
  const referralStatus: ReferralStatusFilter = isReferralStatusFilter(
    rawReferralStatus,
  )
    ? rawReferralStatus
    : 'ALL';

  const visible = useMemo(
    () => selectCohort(patients, { filter, query, sort, referralStatus }),
    [patients, filter, query, sort, referralStatus],
  );
  const kpis = useMemo(() => cohortKpis(patients), [patients]);

  // La página vive en la URL como todo lo demás, y se acota a lo que hay: si
  // estabas en la 4 y un filtro deja una sola página, no te queda una tabla
  // vacía sin explicación.
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(
    Math.max(Number(params.get('pagina') ?? 1) || 1, 1),
    pageCount,
  );
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = cohortSummary(patients);

  function updateParams(
    changes: Record<string, string | null>,
    options?: { replace?: boolean },
  ) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      // Los valores por defecto no se escriben en la URL: /pacientes limpio
      // es "sin historia clínica firmada, sin buscar, por meses".
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setParams(next, { replace: options?.replace ?? false });
  }

  /** Todo lo que cambia el recorte vuelve a la página 1. */
  function changeView(
    changes: Record<string, string | null>,
    options?: { replace?: boolean },
  ) {
    updateParams({ ...changes, pagina: null }, options);
  }

  function changeFilter(key: CohortFilterKey) {
    changeView({ filtro: key === DEFAULT_COHORT_FILTER ? null : key });
  }

  function changeReferralStatus(value: ReferralStatusFilter) {
    changeView({ revision: value === 'ALL' ? null : value });
  }

  function goToPage(next: number) {
    updateParams({ pagina: next === 1 ? null : String(next) });
    document
      .getElementById(LIST_ANCHOR)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Filtrar y además llevar la vista a la lista. Sin el scroll, el click
   * cambiaba una tabla que quedaba abajo del pliegue y parecía no hacer nada.
   */
  function showInList(key: CohortFilterKey) {
    changeFilter(key);
    document
      .getElementById(LIST_ANCHOR)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openPatient(patient: Patient) {
    navigate(`/pacientes/${patient.id}`);
  }

  /** "Ver PDF" de una observación, directo desde la fila de la tabla. */
  async function viewReferralReviewDocument(patient: Patient) {
    try {
      const blob =
        await referralReviewService.downloadReferralReviewDocument(
          patient.id,
        );
      saveBlob(blob, `observacion-${patient.initials}.pdf`);
    } catch (err) {
      push({
        tone: 'err',
        title: 'No se pudo descargar el PDF',
        detail: getApiErrorMessage(err),
      });
    }
  }

  return (
    <div className={`${styles['patients-page-main']} enter`}>
      <PageHeader title="Mis pacientes">
        <PageHeaderStat>
          {summary.total} pacientes, todos menores de 18 años
        </PageHeaderStat>
        <PageHeaderStat tone="dim">
          Actualizado {formatLongDate(new Date())}
        </PageHeaderStat>
      </PageHeader>

      <div className={styles['patients-page-body']}>
        {error ? (
          <LoadErrorState
            status={error.status}
            message={error.message}
            permission={PERMISSIONS.patientsCohortRead}
            onRetry={reload}
          />
        ) : isLoading ? (
          <Section>
            <LoadingRows label="Cargando pacientes" />
          </Section>
        ) : (
          <>
            {/* Los tres números van arriba y solos: son el estado de la
                cohorte y la navegación de la lista, no un adorno de la
                tabla. */}
            <CohortStats kpis={kpis} active={filter} onSelect={showInList} />

            <Section
              id={LIST_ANCHOR}
              title={
                filter === 'todos'
                  ? 'Todos los pacientes'
                  : cohortFilterLabel(filter)
              }
              aside={`${visible.length} ${visible.length === 1 ? 'paciente' : 'pacientes'}`}
            >
              <CohortFilterBar
                query={query}
                // replace: escribir cada tecla en el historial haría que el
                // botón "atrás" tuviera que deshacer letra por letra.
                onQueryChange={(value) =>
                  changeView({ q: value }, { replace: true })
                }
                referralStatus={referralStatus}
                onReferralStatusChange={changeReferralStatus}
              />
              <PatientsTable
                patients={pageRows}
                sort={sort}
                onSortChange={(key) =>
                  changeView({ orden: key === 'meses' ? null : key })
                }
                onOpen={openPatient}
                onViewReferralReviewDocument={viewReferralReviewDocument}
              />
              <Pagination
                page={page}
                pageCount={pageCount}
                from={(page - 1) * PAGE_SIZE + 1}
                to={Math.min(page * PAGE_SIZE, visible.length)}
                total={visible.length}
                unit={['paciente', 'pacientes']}
                onChange={goToPage}
              />

              <p className="mini" style={{ paddingTop: 14 }}>
                Cómo funciona: la historia clínica de transferencia se puede
                hacer desde 9 meses antes de que el paciente cumpla 18 — la IA
                arma el borrador y el médico lo revisa y lo firma. El caso se
                manda a la posta de su barrio unos meses antes, para que la cita
                ya esté cuando cumpla; la posta lo manda al hospital de adultos
                y consigue el día y la hora. “Estado referencia” es lo que
                contestó el destino sobre esa historia ya firmada: aceptada,
                observada, rechazada o pendiente — no decide cuándo el caso
                pasa a “Referencias aceptadas”: eso ocurre al cumplir 18,
                tenga o no respuesta todavía. Datos de prueba.
              </p>
            </Section>
          </>
        )}
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}
