import { useEffect } from 'react';
import { AgentBanner } from './components/AgentBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Icon } from './components/ui';
import { AndroidPage } from './pages/Android';
import { SettingsPage } from './pages/Settings';
import { RulesPage } from './pages/Rules';
import { TrafficPage } from './pages/Traffic';
import { connect, getItems, useAgent, useAndroid, useUI } from './store';

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
  const asks = useAgent((s) => s.asks.length);

  useEffect(() => { connect(); }, []);

  const active = sessions.filter((s) => s.state === 'running' || s.state === 'starting').length;
  const badge = (id: string) => {
    if (id === 'traffic') return getItems().length || null;
    if (id === 'android') return active || null;
    return null;
  };
  const proxy = appState ? `${appState.proxy.bind}:${appState.proxy.port}` : '';
  const total = getItems().length;

  // ⌘1…⌘4 / Ctrl+1…4 — быстрый переход между разделами.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!(ev.metaKey || ev.ctrlKey) || ev.altKey || ev.shiftKey) return;
      const n = NAV[Number(ev.key) - 1];
      if (n) { ev.preventDefault(); setPage(n.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPage]);

  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
  const items = [
    active ? `перехват: ${active} ${active === 1 ? 'приложение' : 'приложений'}` : 'готов к перехвату',
    `${total} запросов в сессии`,
    ...(proxy ? [`прокси ${proxy}`] : []),
    'works on my phone',
  ];
  const strip = items.flatMap((t, i) => [<span key={'t' + i}>{t}</span>, <span key={'s' + i} className="star">✱</span>]);

  return (
    <div className="workspace">
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">siphon<i>.</i><small>{appState?.version ? 'v' + appState.version : ''}</small></div>
          <nav className="nav">
            {NAV.map((n, i) => (
              <button key={n.id} className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => setPage(n.id)}
                title={`${n.label} (${mod}${i + 1})`}>
                <Icon name={n.icon} size={16} /> {n.label}
                {badge(n.id) !== null ? <span className="badge">{badge(n.id)}</span> : <span className="key">{mod}{i + 1}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            Android · Frida · HTTP(S)<br />
            <b>⌘K</b> — поиск в трафике
          </div>
        </aside>

        <main className="main">
          <AgentBanner />
          <ErrorBoundary key={page}>
            {page === 'traffic' && <TrafficPage />}
            {page === 'android' && <AndroidPage />}
            {page === 'rules' && <RulesPage />}
            {page === 'settings' && <SettingsPage />}
          </ErrorBoundary>
        </main>
      </div>

      <footer className="statusbar">
        {active > 0 && <div className="sb-cell live">● live</div>}
        {asks > 0 && <div className="sb-cell live">ИИ ждёт вас</div>}
        <div className="sb-cell">
          <span className={'dot ' + (connected ? 'green' : 'orange pulse')} />
          {connected ? 'подключено' : 'переподключаюсь…'}
        </div>
        <div className={'ticker' + (active > 0 ? '' : ' idle')}>
          {active > 0
            ? <div className="ticker-track">{strip}{strip}</div>
            : <div className="ticker-track">{items.slice(0, 3).join('  ·  ')}</div>}
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
