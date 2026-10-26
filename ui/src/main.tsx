import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/roboto-flex/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import { initDesktop } from './desktop';

initDesktop().then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)).catch((err) => { document.getElementById('root')!.textContent = `Не удалось запустить Siphon: ${err.message}`; });
