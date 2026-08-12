import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
