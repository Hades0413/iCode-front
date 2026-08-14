import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../composition-root';
import type { Patient } from '../../domain/entities/patient.entity';
import { followUpSummary, searchByDni } from '../../domain/rules/cohort.rules';
import { PERMISSIONS } from '../../domain/rules/permissions';
import { formatLongDate } from '../../common/utils/format-date';
import { followUpWeight } from '../../domain/rules/transition.rules';
import { CohortFilterBar } from '../components/cohort-filter-bar';
import { FollowUpTable } from '../components/follow-up-table';
import { Pagination } from '../components/ui/pagination';
import { usePagination } from '../hooks/use-pagination';
import { PageHeader, PageHeaderStat } from '../components/ui/page-header';
import { Notice } from '../components/ui/notice';
import { Section } from '../components/ui/section';
import { StatCard, StatGrid } from '../components/ui/stat-card';
import { LoadErrorState, LoadingRows } from '../components/ui/states';
import { useAsyncResource } from '../hooks/use-async-resource';

const NO_PATIENTS: Patient[] = [];

/** Siete por página: lo que entra en pantalla sin scrollear la tabla. */
const PAGE_SIZE = 7;

/**
 * Los que **ya cumplieron 18** y por lo tanto salieron de la lista del
 * especialista. Aquí la pregunta es otra — no "¿está listo para pasar?" sino
 * "¿llegó al otro lado?".
 *
 * Tiene su propia tabla (FollowUpTable): quién es, si tiene cita de adultos,
 * cuándo es y si acudió. Las tarjetas van sin onClick porque aquí no hay nada
 * que accionar — el caso ya no es del pediatra.
 */
export function FollowUpPage() {
  const navigate = useNavigate();
  const load = useCallback(() => patientService.getPostTransition(), []);
  const { data, isLoading, error, reload } = useAsyncResource(
    load,
    NO_PATIENTS,
    'No se pudo cargar el seguimiento.',
  );
  const [query, setQuery] = useState('');

  const summary = followUpSummary(data);
  // Primero el orden (los abandonos arriba), después la búsqueda, y recién
  // ahí el corte por página: cada paso trabaja sobre el anterior.
  const ordered = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          followUpWeight(a) - followUpWeight(b) ||
          b.monthsToEighteen - a.monthsToEighteen,
      ),
    [data],
  );
  const visible = useMemo(() => searchByDni(ordered, query), [ordered, query]);
  const paged = usePagination(visible, PAGE_SIZE);

  return (
    <div className="main enter">
      <PageHeader title="Ya cumplieron 18">
        <PageHeaderStat value={summary.total}>
          pacientes ya pasaron al hospital de adultos
        </PageHeaderStat>
        {summary.lost > 0 && (
          <PageHeaderStat value={summary.lost} tone="flag">
            no llegaron y nadie los buscó
          </PageHeaderStat>
        )}
        <PageHeaderStat tone="dim">
          Actualizado {formatLongDate(new Date())}
        </PageHeaderStat>
      </PageHeader>

      <div className="page-body">
        {error ? (
          <LoadErrorState
            status={error.status}
            message={error.message}
            permission={PERMISSIONS.reportsRead}
            onRetry={reload}
          />
        ) : isLoading ? (
          <Section>
            <LoadingRows label="Cargando" />
          </Section>
        ) : (
          <>
            <StatGrid>
              <StatCard
                label="Llegaron a su primera cita"
                value={summary.adherence}
                suffix="%"
                total={100}
                hint={`${summary.attended} de ${summary.total}. El número que mide si el puente funciona.`}
                severity="ok"
              />
              <StatCard
                label="Siguen en control"
                value={summary.attended}
                total={summary.total}
                hint="pasaron y se quedaron en control"
                severity="neutral"
              />
              <StatCard
                label="Se perdieron"
                value={summary.lost}
                total={summary.total}
                hint={
                  summary.lost > 0
                    ? 'no fueron a su cita y nadie los volvió a buscar'
                    : 'nadie quedó sin atención'
                }
                // Siempre en rojo: es la cifra mala del panel, y que se pinte
                // verde al llegar a cero la haría cambiar de identidad. El
                // cero en rojo también dice algo — "esto es lo que vigilas".
                severity="crit"
              />
            </StatGrid>

            <Section
              title="Quiénes son"
              aside={`${visible.length} ${visible.length === 1 ? 'paciente' : 'pacientes'}`}
            >
              <CohortFilterBar query={query} onQueryChange={setQuery} />
              <FollowUpTable
                patients={paged.rows}
                // Su ficha es la del otro lado del puente, no la de tutela:
                // esa ni siquiera lo encontraría (ya no está en la cohorte).
                onOpen={(patient) => navigate(`/seguimiento/${patient.id}`)}
              />
              <Pagination
                page={paged.page}
                pageCount={paged.pageCount}
                from={paged.from}
                to={paged.to}
                total={paged.total}
                unit={['paciente', 'pacientes']}
                onChange={paged.goToPage}
              />
            </Section>

            <Section>
              {/* Sin wrapmax: la nota de obra cruza todo el ancho de la
                  tarjeta — recortada a media pantalla parecía un error de
                  layout, no una decisión. */}
              <Notice>
                Faltan los gráficos: cuántos llegan por cada hospital, cómo
                viene mes a mes y cuánto tarda cada posta en conseguir la fecha.
                Es la próxima pantalla. Datos de prueba.
              </Notice>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
