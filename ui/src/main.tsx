import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { initDesktop } from './desktop';

initDesktop().then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)).catch((err) => { document.getElementById('root')!.textContent = `Не удалось запустить Siphon: ${err.message}`; });
