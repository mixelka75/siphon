import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type App, type Device, type Session } from '../api';
import { Empty, Icon, Seg, Spinner, Toggle } from '../components/ui';
import { fmtTime } from '../format';
import { loadAndroid, useAndroid, useUI } from '../store';

// Стабильная ссылка: селектор zustand 5 не должен каждый раз возвращать новый массив.
const NO_PROGRESS: string[] = [];

function stateTag(state: string) {
  switch (state) {
    case 'device': return <span className="tag green">подключено</span>;
    case 'unauthorized': return <span className="tag orange">не разрешена отладка — подтвердите на телефоне</span>;
    case 'offline': return <span className="tag red">офлайн</span>;
    default: return <span className="tag">{state}</span>;
  }
}

function fridaTag(d: Device) {
  const f = d.info?.frida;
  if (!f) return null;
  if (f === 'running') return <span className="tag green"><span className="dot green" /> Frida работает</span>;
  if (f === 'launch-required') return <span className="tag orange">Frida установлена, не запущена</span>;
  return <span className="tag">Frida не установлена</span>;
}

function DeviceCard({ d, selected, onSelect }: { d: Device; selected: boolean; onSelect: () => void }) {
  const progress = useAndroid((s) => s.progress[d.serial] ?? NO_PROGRESS);
  const error = useAndroid((s) => s.prepareError[d.serial]) || d.prepareError;
  const showToast = useUI((s) => s.showToast);
  const info = d.info;
  const ready = info?.frida === 'running';
  const usable = d.state === 'device';

  const prepare = () => api.prepare(d.serial).catch((e) => showToast(e.message));
  const stop = () => api.stopFrida(d.serial).then(() => showToast('frida-server остановлен')).catch((e) => showToast(e.message));
  const recover = () => {
    if (window.confirm('Перезапустить Android framework? Все приложения на этом устройстве закроются, активные перехваты остановятся. Данные приложений сохранятся.')) {
      api.restartFramework(d.serial).then(() => showToast('Восстанавливаю Android…')).catch((e) => showToast(e.message));
    }
  };

  return (
    <div className={'card dev' + (selected ? ' selected' : '')} onClick={usable ? onSelect : undefined} style={{ cursor: usable ? 'pointer' : 'default' }}>
      <div className="dev-head">
        <div className="dev-icon"><Icon name={d.serial.startsWith('emulator-') ? 'terminal' : 'android'} size={18} /></div>
        <div className="grow">
          <div style={{ fontWeight: 600 }}>{d.model || d.deviceName || d.serial}</div>
          <div className="muted mono" style={{ fontSize: 11.5 }}>{d.serial}</div>
        </div>
        {stateTag(d.state)}
      </div>

      {usable && info && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {info.androidVersion && <span className="tag">Android {info.androidVersion}{info.sdk ? ` · API ${info.sdk}` : ''}</span>}
          {info.arch && <span className="tag">{info.arch}</span>}
          {info.emulator && <span className="tag">эмулятор</span>}
          {info.root && <span className="tag green">root: {info.root}</span>}
          {fridaTag(d)}
        </div>
      )}

      {usable && (
        <div className="row" onClick={(e) => e.stopPropagation()}>
          {d.busy ? (
            <span className="row muted"><Spinner /> Работаю с устройством…</span>
          ) : ready ? (
            <>
              <span className="muted">Готово к перехвату — выберите приложение ниже.</span>
              <span className="spacer" />
              <button className="btn sm ghost" onClick={stop}>Остановить Frida</button>
              <button className="btn sm ghost" onClick={recover}>Восстановить Android</button>
            </>
          ) : (
            <>
              <button className="btn primary" onClick={prepare}>
                <Icon name="bolt" size={14} /> {info?.frida === 'launch-required' ? 'Запустить Frida' : 'Подготовить устройство'}
              </button>
              <span className="muted">Нужен root. Установим и запустим frida-server автоматически.</span>
              {info?.root && <button className="btn sm ghost" onClick={recover}>Восстановить Android</button>}
            </>
          )}
        </div>
      )}

      {d.busy && progress.length > 0 && (
        <div className="progress">{progress.map((p, i) => <div key={i}>{p}</div>)}</div>
      )}
      {error && !d.busy && <div className="notice red"><Icon name="warn" /> <div>{error}</div></div>}
    </div>
  );
}

function AppPicker({ device }: { device: Device }) {
  const [apps, setApps] = useState<App[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'spawn' | 'attach'>('spawn');
  const [hideRoot, setHideRoot] = useState(true);
  const [flutter, setFlutter] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const showToast = useUI((s) => s.showToast);
  const sessions = useAndroid((s) => s.sessions);
  const [reload, setReload] = useState(0);
  const running = device.info?.frida === 'running' && !device.busy;

  useEffect(() => {
    if (!running) { setApps(null); return; }
    let alive = true;
    setApps(null);
    setError('');
    api.apps(device.serial).then((a) => { if (alive) setApps(a ?? []); }).catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [device.serial, running, reload]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (apps ?? []).filter((a) => !t || a.name.toLowerCase().includes(t) || a.id.toLowerCase().includes(t));
  }, [apps, q]);

  const active = (id: string) => sessions.some((s) => s.serial === device.serial && s.appId === id && (s.state === 'starting' || s.state === 'running'));

  const start = (a: App) =>
    api.startSession({ serial: device.serial, appId: a.id, appName: a.name, mode, disableRootDetection: hideRoot, flutter, safeMode })
      .then(() => showToast(`Перехват ${a.name} запускается…`))
      .catch((e) => showToast(e.message));

  if (!running) {
    return <div className="card pad muted">Сначала подготовьте устройство — после этого здесь появится список приложений.</div>;
  }
  return (
    <div className="card">
      <div className="row" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        <div className="search" style={{ maxWidth: 280 }}>
          <Icon name="search" size={14} />
          <input className="input" placeholder="Найти приложение или пакет" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Seg value={mode} onChange={setMode} options={[
          { value: 'spawn', label: 'Перезапустить' },
          { value: 'attach', label: 'К запущенному' },
        ]} />
        <span className="spacer" />
        <button className="btn ghost sm icon-only" title="Обновить список" onClick={() => setReload((n) => n + 1)}><Icon name="refresh" size={14} /></button>
      </div>
      <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', gap: 18, flexWrap: 'wrap' }}>
        <label className="row" style={{ gap: 8 }}><Toggle on={hideRoot} onChange={setHideRoot} /> <span>Скрыть root от приложения</span></label>
        <label className="row" style={{ gap: 8 }}><Toggle on={flutter} onChange={setFlutter} /> <span>Pinning во Flutter</span></label>
        <label className="row" style={{ gap: 8 }} title="Для приложений, которые падают при обычном перехвате. Отключает нативные TLS-callback и автопатчер исключений; Java TLS продолжает перехватываться."><Toggle on={safeMode} onChange={setSafeMode} /> <span>Совместимый TLS</span></label>
        <span className="muted">
          {mode === 'spawn' ? 'Приложение запустится заново с хуками с самого старта — надёжнее всего.' : 'Хуки подключатся к уже работающему процессу: уже открытые соединения не перехватятся.'}
        </span>
      </div>
      {error && <div className="notice red" style={{ margin: 12 }}><Icon name="warn" /> <div>{error}</div></div>}
      {!apps && !error && <div className="row muted" style={{ padding: 16 }}><Spinner /> Читаю список приложений…</div>}
      {apps && (
        <div className="apps">
          {shown.length === 0 && <div className="muted" style={{ padding: 16 }}>Ничего не найдено</div>}
          {shown.map((a) => (
            <div className="app" key={a.id}>
              <div className="app-ico">{(a.name || a.id).slice(0, 1)}</div>
              <div className="grow">
                <div style={{ fontWeight: 550, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {a.name || a.id}
                  {a.pid > 0 && <span className="tag green">запущено</span>}
                  {a.id === 'ru.dublgis.dgismobile' && <span className="tag blue" title="Для 2ГИС автоматически включается совместимый TLS без хуков root и Flutter">профиль 2ГИС</span>}
                </div>
                <div className="muted mono" style={{ fontSize: 11.5 }}>{a.id}</div>
              </div>
              <button className="btn sm primary" disabled={device.busy || active(a.id) || (mode === 'attach' && a.pid === 0)}
                title={mode === 'attach' && a.pid === 0 ? 'Приложение не запущено' : undefined}
                onClick={() => start(a)}>
                {active(a.id) ? 'Перехватывается' : 'Перехватить'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ s }: { s: Session }) {
  const [open, setOpen] = useState(s.state === 'error' || s.state === 'starting');
  const setFilter = useUI((st) => st.setFilter);
  const setPage = useUI((st) => st.setPage);
  const showToast = useUI((st) => st.showToast);
  const logRef = useRef<HTMLDivElement>(null);
  const live = s.state === 'starting' || s.state === 'running';

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [s.log?.length, open]);

  return (
    <div className="card">
      <div className="row" style={{ padding: '12px 14px' }}>
        <div className="app-ico">{(s.appName || s.appId).slice(0, 1)}</div>
        <div className="grow">
          <div style={{ fontWeight: 600 }}>{s.appName || s.appId}</div>
          <div className="muted mono" style={{ fontSize: 11.5 }}>{s.appId} · {s.device}{s.proxyPort ? ` · прокси :${s.proxyPort}` : ''}</div>
        </div>
        {s.state === 'starting' && <span className="tag blue row"><Spinner /> запускается</span>}
        {s.state === 'running' && <span className="tag green"><span className="dot green pulse" /> перехват работает</span>}
        {s.state === 'stopped' && <span className="tag">остановлено</span>}
        {s.state === 'error' && <span className="tag red">ошибка</span>}
        {s.safeMode && <span className="tag blue">совместимый TLS</span>}
        <button className="btn sm" onClick={() => { setFilter(`src:${s.appId}`); setPage('traffic'); }}>Трафик</button>
        <button className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? 'Скрыть журнал' : 'Журнал'}</button>
        {live
          ? <button className="btn sm danger" onClick={() => api.stopSession(s.id).catch((e) => showToast(e.message))}>Остановить</button>
          : <button className="btn sm" onClick={() => api.dismissSession(s.id).catch((e) => showToast(e.message))}>Убрать</button>}
      </div>
      {s.error && <div className="notice red" style={{ margin: '0 14px 12px' }}><Icon name="warn" /> <div>{s.error}</div></div>}
      {open && (
        <div className="log" ref={logRef}>
          {(s.log ?? []).length === 0 && <span className="faint">журнал пуст</span>}
          {(s.log ?? []).map((l, i) => (
            <div key={i} className={'l-' + l.level}><span className="t">{fmtTime(l.time).slice(0, 8)}</span>{l.text}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AndroidPage() {
  const adb = useAndroid((s) => s.adb);
  const devices = useAndroid((s) => s.devices);
  const sessions = useAndroid((s) => s.sessions);
  const showToast = useUI((s) => s.showToast);
  const [selected, setSelected] = useState<string | null>(null);
  const inspected = useRef(new Set<string>());

  useEffect(() => { void loadAndroid(); }, []);

  // Автоматически опрашиваем новые устройства, чтобы сразу показать состояние Frida.
  useEffect(() => {
    for (const d of devices) {
      if (d.state === 'device' && !d.info && !d.busy && !inspected.current.has(d.serial)) {
        inspected.current.add(d.serial);
        api.inspect(d.serial).catch(() => inspected.current.delete(d.serial));
      }
    }
  }, [devices]);

  const usable = devices.filter((d) => d.state === 'device');
  const current = devices.find((d) => d.serial === selected && d.state === 'device') ?? usable[0];

  return (
    <div className="page">
      <div className="page-pad">
        <h1>Перехват Android</h1>
        <p className="lead">
          Siphon запускает на устройстве Frida и перенаправляет трафик выбранного приложения через себя, подменяя доверенные
          сертификаты и обходя certificate pinning. Установка сертификата на телефон вручную не нужна.
        </p>

        {sessions.length > 0 && (
          <>
            <h2>Перехваты</h2>
            <div style={{ marginBottom: 8 }}>{sessions.map((s) => <SessionCard key={s.id} s={s} />)}</div>
          </>
        )}

        <div className="steps">
          <div className="step-title">Инструменты Android (adb)</div>
          {!adb ? (
            <div className="card pad row muted"><Spinner /> Проверяю…</div>
          ) : !adb.found ? (
            <div className="card pad">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Icon name="warn" />
                <div className="grow">
                  <strong>adb не найден.</strong>
                  <div className="muted" style={{ marginTop: 2 }}>
                    Siphon может скачать официальные Android platform-tools от Google (около 15 МБ) и пользоваться ими.
                    Если у вас стоит Android Studio или <code>brew install --cask android-platform-tools</code>, перезапустите Siphon.
                  </div>
                  {adb.error && adb.error !== 'adb не найден' && <div style={{ color: 'var(--red)', marginTop: 6 }}>{adb.error}</div>}
                </div>
                <button className="btn primary" disabled={adb.downloading}
                  onClick={() => api.downloadADB().catch((e) => showToast(e.message))}>
                  {adb.downloading ? <><Spinner /> Скачиваю…</> : <><Icon name="download" size={14} /> Скачать</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="card pad row">
              <span className={'dot ' + (adb.running ? 'green' : 'red')} />
              <div className="grow">
                {adb.running ? 'adb работает' : 'adb-сервер не отвечает'}
                <div className="muted mono" style={{ fontSize: 11.5 }}>{adb.path}</div>
                {adb.error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{adb.error} — Siphon пробует переподключиться.</div>}
              </div>
            </div>
          )}

          <div className="step-title">Устройство</div>
          {devices.length === 0 ? (
            <div className="card" style={{ height: 190 }}>
              <Empty icon="usb" title="Устройств не видно">
                Подключите телефон по USB и включите «Отладку по USB», либо запустите эмулятор.
                Для перехвата нужен root: подойдёт эмулятор без Google Play («Google APIs») или телефон с Magisk.
              </Empty>
            </div>
          ) : (
            devices.map((d) => (
              <DeviceCard key={d.serial} d={d} selected={d.serial === current?.serial && usable.length > 1}
                onSelect={() => setSelected(d.serial)} />
            ))
          )}

          {current && (
            <>
              <div className="step-title">Приложение — {current.model || current.serial}</div>
              <AppPicker device={current} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
