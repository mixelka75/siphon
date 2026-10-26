import { useEffect, useState } from 'react';
import { api, type Settings } from '../api';
import { Icon, Toggle } from '../components/ui';
import { copyText } from '../format';
import { refreshState, useUI } from '../store';
import { apiUrl, saveURL } from '../desktop';

function HostList({ title, hint, hosts, onChange }: {
  title: string; hint: string; hosts: string[]; onChange: (h: string[]) => void;
}) {
  const [value, setValue] = useState('');
  const add = () => {
    const v = value.trim().toLowerCase();
    if (v && !hosts.includes(v)) onChange([...hosts, v]);
    setValue('');
  };
  return (
    <div className="setting" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
      <div>
        <div className="t">{title}</div>
        <div className="d">{hint}</div>
      </div>
      <div className="hostlist">
        {hosts.length === 0 && <span className="faint">список пуст</span>}
        {hosts.map((h) => (
          <span className="hostchip" key={h}>{h}<button title="Убрать" onClick={() => onChange(hosts.filter((x) => x !== h))}><Icon name="close" size={11} /></button></span>
        ))}
      </div>
      <div className="row" style={{ width: '100%', maxWidth: 420 }}>
        <input className="input" placeholder="example.com или *.example.com" value={value}
          onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add}>Добавить</button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const appState = useUI((s) => s.appState);
  const showToast = useUI((s) => s.showToast);
  const [s, setS] = useState<Settings | null>(null);
  const [upstream, setUpstream] = useState('');

  useEffect(() => {
    void refreshState();
    api.getSettings().then((x) => { setS(x); setUpstream(x.upstreamProxy); });
  }, []);

  const save = async (next: Settings) => {
    setS(next);
    try { setS(await api.putSettings(next)); } catch (e) { showToast((e as Error).message); }
  };

  if (!s) return null;
  const proxy = appState?.proxy;
  const exe = appState?.agent?.executable ?? '';
  const quoted = /\s/.test(exe) ? `"${exe}"` : exe;
  const mcpCommand = `claude mcp add --scope user siphon -- ${quoted} mcp`;
  const exposed = proxy?.bind === '0.0.0.0';
  const addr = (host: string) => `${host}:${proxy?.port ?? ''}`;

  return (
    <div className="page">
      <div className="page-pad">
        <h1>Настройки</h1>
        <p className="lead">Прокси, сертификат и поведение TLS.</p>

        <h2>Ручной прокси</h2>
        <div className="card pad" style={{ marginBottom: 20 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Для клиентов, кроме Android-перехвата: браузера, Postman, iOS-симулятора, любого процесса с настройкой HTTP-прокси.
            Принимает HTTP, HTTPS (CONNECT) и SOCKS5 на одном порту.
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {(exposed ? (proxy?.lanIPs ?? []) : [proxy?.bind ?? '127.0.0.1']).map((ip) => (
              <button key={ip} className="chip" title="Копировать" onClick={async () => showToast((await copyText(addr(ip))) ? 'Скопировано' : 'Ошибка')}>
                <Icon name="copy" size={12} /> <code>{addr(ip)}</code>
              </button>
            ))}
          </div>
          {!exposed && (
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Сейчас прокси слушает только этот компьютер. Чтобы подключать устройства по сети, запустите Siphon с <code>--proxy 0.0.0.0:8000</code>{' '}
              — но тогда любой в вашей сети сможет им пользоваться.
            </div>
          )}
        </div>

        <h2>Сертификат Siphon</h2>
        <div className="card pad" style={{ marginBottom: 20 }}>
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 550 }}>{appState?.ca.subject}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Для Android-перехвата через Frida устанавливать его не нужно — скрипт сам добавляет его в доверенные внутри приложения.
                Для остальных клиентов импортируйте сертификат в доверенные.
              </div>
            </div>
            <button className="btn" onClick={() => saveURL(apiUrl('/api/ca.pem'), 'siphon-ca.pem').catch((e) => showToast(e.message))}><Icon name="download" size={14} /> .pem</button>
            <button className="btn" onClick={() => saveURL(apiUrl('/api/ca.der'), 'siphon-ca.cer').catch((e) => showToast(e.message))}><Icon name="download" size={14} /> .cer</button>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Файл ключа лежит в <code>{appState?.dataDir}/ca</code>. Никому его не передавайте: с ним можно подписать сертификат для любого сайта.
          </div>
        </div>

        <h2>ИИ-агенты</h2>
        <div className="card pad" style={{ marginBottom: 20 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Siphon работает как MCP-сервер. Claude Code, Cursor, Codex и другие агенты сами запускают эмулятор,
            включают перехват, просят вас выполнить действия в приложении (баннер с кнопкой «Готово») и разбирают трафик.
            Подключение для Claude Code — одна команда:
          </div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <code className="grow" style={{ padding: '6px 8px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{mcpCommand}</code>
            <button className="btn" disabled={!exe}
              onClick={async () => showToast((await copyText(mcpCommand)) ? 'Скопировано' : 'Ошибка')}>
              <Icon name="copy" size={14} /> Копировать
            </button>
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Для других клиентов: команда <code style={{ overflowWrap: 'anywhere' }}>{exe}</code> с аргументом <code>mcp</code>, транспорт stdio.
            Агентам без MCP подойдёт HTTP API — описание в <code>docs/AI.md</code>.
          </div>
        </div>

        <h2>TLS и upstream</h2>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="setting">
            <div className="grow">
              <div className="t">Автоматически пропускать хосты, отвергшие сертификат</div>
              <div className="d">Если приложение закрепило сертификат (pinning) и оборвало соединение, хост попадает в список passthrough, и следующая попытка пройдёт без расшифровки — приложение продолжит работать.</div>
            </div>
            <Toggle on={s.autoPassthrough} onChange={(v) => save({ ...s, autoPassthrough: v })} />
          </div>
          <div className="setting">
            <div className="grow">
              <div className="t">Не проверять сертификаты серверов</div>
              <div className="d">Siphon будет принимать любые сертификаты upstream-серверов, в том числе просроченные и самоподписанные. Включайте только для тестовых окружений.</div>
            </div>
            <Toggle on={s.insecureUpstream} onChange={(v) => save({ ...s, insecureUpstream: v })} />
          </div>
          <HostList title="Пропускать без расшифровки (TLS passthrough)"
            hint="Трафик этих хостов идёт как есть, мы видим только факт соединения. Поддерживаются маски вида *.example.com."
            hosts={s.passthroughHosts} onChange={(h) => save({ ...s, passthroughHosts: h })} />
          <HostList title="Игнорировать ошибки сертификата для хостов"
            hint="Для этих серверов проверка сертификата отключена, для остальных — нет."
            hosts={s.ignoreCertHosts} onChange={(h) => save({ ...s, ignoreCertHosts: h })} />
          <div className="setting" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
            <div>
              <div className="t">Внешний прокси</div>
              <div className="d">Пересылать HTTP(S)-запросы через другой прокси: <code>http://host:port</code>, <code>https://…</code> или <code>socks5://host:port</code>. Пусто — напрямую. Не действует на WebSocket и сырой TCP.</div>
            </div>
            <div className="row" style={{ width: '100%', maxWidth: 420 }}>
              <input className="input" placeholder="напрямую" value={upstream} onChange={(e) => setUpstream(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save({ ...s, upstreamProxy: upstream.trim() })} />
              <button className="btn" disabled={upstream.trim() === s.upstreamProxy} onClick={() => save({ ...s, upstreamProxy: upstream.trim() })}>Сохранить</button>
            </div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          Siphon {appState?.version} · данные: <code>{appState?.dataDir}</code>
        </div>
      </div>
    </div>
  );
}
