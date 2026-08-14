import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/auth.context';
import { CohortProvider } from './context/cohort.context';
import { ProtectedRoute } from './routes/protected-route';
import { ClinicLayout } from './layouts/clinic-layout';
import { LoginPage } from './pages/login.page';
import { PatientsPage } from './pages/patients.page';
import { PatientDetailPage } from './pages/patient-detail.page';
import { FollowUpPage } from './pages/follow-up.page';
import { FollowUpDetailPage } from './pages/follow-up-detail.page';
import { ReferralNoticesPage } from './pages/referral-notices.page';
import { CounterReferralsPage } from './pages/counter-referrals.page';
import { JourneyLayout } from './layouts/journey-layout';
import { JourneyPage } from './pages/journey.page';
import { ConsultationLayout } from './layouts/consultation-layout';
import { ConsultationPage } from './pages/consultation.page';
import { HomeRedirect } from './routes/home-redirect';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/*
            Todo el escritorio comparte marco (riel + contenido).
            CohortProvider va por dentro de ProtectedRoute a propósito: así no
            se pide GET /patients hasta que haya sesión, y el riel y la tabla
            leen exactamente la misma cohorte.
          */}
          <Route
            element={
              <ProtectedRoute>
                <CohortProvider>
                  <ClinicLayout />
                </CohortProvider>
              </ProtectedRoute>
            }
          >
            {/* Consultorio: el especialista de pediatría. */}
            <Route path="/pacientes" element={<PatientsPage />} />
            <Route
              path="/pacientes/:patientId"
              element={<PatientDetailPage />}
            />
            <Route path="/seguimiento" element={<FollowUpPage />} />
            <Route
              path="/seguimiento/:patientId"
              element={<FollowUpDetailPage />}
            />

            {/* Referencias y Contrarreferencias: la oficina que habla con la
                posta. Son sus propias pantallas y no un modo de las otras. */}
            <Route path="/referencias" element={<ReferralNoticesPage />} />
            <Route
              path="/contrarreferencias"
              element={<CounterReferralsPage />}
            />
          </Route>

          {/*
            La app del paciente y de quien lo acompaña. Va por fuera del
            escritorio clínico —otro marco, otra columna, pensada para un
            celular— y sin CohortProvider: un paciente no tiene una cohorte
            que cargar, tiene su propio recorrido.
          */}
          <Route
            element={
              <ProtectedRoute>
                <JourneyLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/mi-recorrido" element={<JourneyPage />} />
          </Route>

          {/*
            El "pase de consulta": el médico del hospital de adultos que
            resuelve el código único de "Mi recorrido". Tampoco lleva
            CohortProvider — este médico no tiene PATIENT_COHORT_READ, no
            hay una cohorte que cargar (ver workspace-sections.ts sobre por
            qué su landing es esta ruta y no /pacientes).
          */}
          <Route
            element={
              <ProtectedRoute>
                <ConsultationLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/consulta" element={<ConsultationPage />} />
          </Route>

          {/* A dónde entra cada uno depende de sus permisos, no de una ruta
              fija: quien trabaja en referencias no cae en el consultorio. */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
