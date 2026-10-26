import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Icon } from './components/ui';
import { AndroidPage } from './pages/Android';
import { SettingsPage } from './pages/Settings';
import { RulesPage } from './pages/Rules';
import { TrafficPage } from './pages/Traffic';
import { connect, getItems, useAndroid, useUI } from './store';

const NAV = [
  { id: 'traffic', label: 'Трафик', icon: 'traffic' },
  { id: 'android', label: 'Android', icon: 'android' },
  { id: 'rules', label: 'Правила', icon: 'bolt' },
  { id: 'settings', label: 'Настройки', icon: 'settings' },
] as const;

export default function App() {
  const page = useUI((s) => s.page);
  const setPage = useUI((s) => s.setPage);
  const connected = useUI((s) => s.connected);
  const toast = useUI((s) => s.toast);
  const appState = useUI((s) => s.appState);
  useUI((s) => s.version); // перерисовка счётчика
  const sessions = useAndroid((s) => s.sessions);

  useEffect(() => { connect(); }, []);

  const active = sessions.filter((s) => s.state === 'running' || s.state === 'starting').length;
  const badge = (id: string) => {
    if (id === 'traffic') return getItems().length || null;
    if (id === 'android') return active || null;
    return null;
  };
  const proxy = appState ? `${appState.proxy.bind}:${appState.proxy.port}` : '';

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M2.5 4.5h11M2.5 8h7.5M2.5 11.5h4.5" /></svg>
          </div>
          Siphon
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.id} className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => setPage(n.id)}>
              <Icon name={n.icon} size={16} /> {n.label}
              {badge(n.id) !== null && <span className="badge">{badge(n.id)}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="conn">
            <span className={'dot ' + (connected ? 'green' : 'orange pulse')} />
            {connected ? 'Подключено' : 'Переподключаюсь…'}
          </div>
          {proxy && <div title="Адрес ручного прокси">Прокси <code>{proxy}</code></div>}
        </div>
      </aside>

      <main className="main">
        <ErrorBoundary key={page}>
          {page === 'traffic' && <TrafficPage />}
          {page === 'android' && <AndroidPage />}
        {page === 'rules' && <RulesPage />}
          {page === 'settings' && <SettingsPage />}
        </ErrorBoundary>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
