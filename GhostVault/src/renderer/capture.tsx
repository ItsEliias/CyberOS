import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import CaptureApp from './CaptureApp';

createRoot(document.getElementById('capture-root')!).render(
  <StrictMode>
    <CaptureApp />
  </StrictMode>
);
