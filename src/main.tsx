import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import OverlayDashboard from '../app/overlay-dashboard';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayDashboard />
  </StrictMode>,
);
