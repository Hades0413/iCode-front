import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// La tipografía de la marca, autohospedada (nada de pedirle la fuente a
// Google en runtime). Solo los pesos que el sistema de diseño usa de verdad;
// los intermedios (660, 680…) el navegador los redondea al más cercano.
//
// El @font-face es global porque no puede ser otra cosa, pero QUIÉN la usa no
// lo es: hoy la pide solo la vista de pacientes del médico
// (pages/patients.module.css), que es donde vive el tema del diseñador.
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import './index.css';
// El sistema de diseño va global (declara los tokens en :root, que el body
// también usa). Lo propio de cada pantalla lo importa su componente.
import './presentation/styles/design-system.css';
import { App } from './presentation/App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
