import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, fetchBody, type Exchange, type Frame, type Header, type TLSInfo } from '../api';
import {
  b64ToBytes, copyText, decodeText, fmtBytes, fmtMs, fmtTime, looksBinary, methodLabel, statusClass, statusText,
} from '../format';
import { onFrames, useUI } from '../store';
import { BodyView } from './BodyView';
import { BreakpointPanel } from './BreakpointPanel';
import { Icon, Section, Spinner } from './ui';
import { downloadHAR } from '../har';

function KV({ rows, plain }: { rows: [string, ReactNode][]; plain?: boolean }) {
  const showToast = useUI((s) => s.showToast);
  return (
    <div className={'kv' + (plain ? ' plain' : '')}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <span className="k">{k}</span>
          <span className="v" title="Нажмите, чтобы скопировать"
            onClick={async () => { if (typeof v === 'string' && (await copyText(v))) showToast('Скопировано'); }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function Headers({ headers }: { headers: Header[] }) {
  const sorted = useMemo(() => [...headers].sort((a, b) => a.name.localeCompare(b.name)), [headers]);
  if (!sorted.length) return <div className="muted">Заголовков нет</div>;
  return <KV rows={sorted.map((h) => [h.name, h.value])} />;
}

function queryRows(url: string | undefined): [string, string][] {
  if (!url) return [];
  try { return Array.from(new URL(url).searchParams.entries()); } catch { return []; }
}

function TLSBlock({ title, tls }: { title: string; tls: TLSInfo }) {
  const rows: [string, string][] = [];
  if (tls.version) rows.push(['Версия', tls.version]);
  if (tls.cipher) rows.push(['Шифр', tls.cipher]);
  if (tls.alpn) rows.push(['ALPN', tls.alpn]);
  if (tls.serverName) rows.push(['SNI', tls.serverName]);
  if (tls.certSubject) rows.push(['Сертификат', tls.certSubject]);
  if (tls.certIssuer) rows.push(['Издатель', tls.certIssuer]);
  if (tls.certExpires) rows.push(['Истекает', new Date(tls.certExpires).toLocaleString('ru-RU')]);
  return (
    <div className="sub">
      <div className="sub-title">{title}</div>
      <KV plain rows={rows} />
    </div>
  );
}

function Timing({ e }: { e: Exchange }) {
  const total = e.timing.end ?? 0;
  const reqDone = e.timing.requestDone ?? 0;
  const respStart = e.timing.responseStart ?? 0;
  if (!total && !respStart) return <div className="muted">Запрос ещё выполняется…</div>;
  const span = Math.max(total, respStart, 1);
  const bars: [string, number, number][] = [
    ['Отправка', 0, reqDone],
    ['Ожидание', reqDone, Math.max(respStart, reqDone)],
    ['Получение', respStart, total || respStart],
  ];
  return (
    <div className="timing">
      {bars.map(([label, from, to]) => (
        <div className="tbar" key={label}>
          <span className="muted">{label}</span>
          <div className="track">
            <div className="fill" style={{ left: `${(from / span) * 100}%`, width: `${Math.max(((to - from) / span) * 100, to > from ? 1.5 : 0)}%` }} />
          </div>
          <span className="num" style={{ textAlign: 'right' }}>{fmtMs(Math.max(to - from, 0)) || '—'}</span>
        </div>
      ))}
      <div className="tbar">
        <strong>Всего</strong><span /><strong style={{ textAlign: 'right' }}>{fmtMs(total) || '—'}</strong>
      </div>
    </div>
  );
}

function FrameRow({ f, raw }: { f: Frame; raw: boolean }) {
  const bytes = useMemo(() => b64ToBytes(f.data), [f.data]);
  const binary = f.kind === 'binary' || (f.kind === 'data' && looksBinary(bytes));
  let content: string;
  if (f.kind === 'close' && bytes.length >= 2) {
    content = `код ${(bytes[0] << 8) | bytes[1]} ${decodeText(bytes.subarray(2))}`.trim();
  } else if (binary) {
    const head = Array.from(bytes.subarray(0, 64), (b) => b.toString(16).padStart(2, '0')).join(' ');
    content = head + (bytes.length > 64 ? ' …' : '');
  } else {
    content = decodeText(bytes);
  }
  const kindLabel = raw ? (f.dir === 'out' ? 'клиент' : 'сервер') : f.kind;
  return (
    <div className={'frame ' + f.dir}>
      <span title={f.dir === 'out' ? 'от клиента' : 'к клиенту'} style={{ color: f.dir === 'out' ? 'var(--accent)' : 'var(--green)' }}>
        {f.dir === 'out' ? '↑' : '↓'}
      </span>
      <span className="muted">{kindLabel}{binary && !raw ? ' · hex' : ''}</span>
      <span className="data" style={binary ? { color: 'var(--fg-2)' } : undefined}>
        {content || <span className="faint">пусто</span>}
        {f.truncated && <span className="tag orange" style={{ marginLeft: 6 }}>обрезано</span>}
      </span>
      <span className="muted" style={{ textAlign: 'right' }}>{fmtBytes(f.size)}</span>
    </div>
  );
}

function Frames({ id, raw }: { id: string; raw: boolean }) {
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setFrames(null);
    const live: Frame[] = [];
    let loaded = false;
    const off = onFrames(id, (f) => {
      if (!alive) return;
      if (!loaded) { live.push(f); return; }
      setFrames((cur) => (cur && !cur.some((x) => x.seq === f.seq) ? [...cur, f] : cur));
    });
    api.frames(id).then((list) => {
      if (!alive) return;
      loaded = true;
      const seen = new Set(list.map((x) => x.seq));
      setFrames([...list, ...live.filter((x) => !seen.has(x.seq))]);
    });
    return () => { alive = false; off(); };
  }, [id]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [frames?.length]);

  if (!frames) return <div className="row muted" style={{ padding: 12 }}><Spinner /> Загружаю…</div>;
  if (!frames.length) return <div className="muted" style={{ padding: 12 }}>Сообщений пока нет</div>;
  return (
    <div className="frames" style={{ maxHeight: 420, overflow: 'auto' }}>
      {frames.map((f) => <FrameRow key={f.seq} f={f} raw={raw} />)}
      <div ref={end} />
    </div>
  );
}

async function togglePassthrough(host: string, on: boolean) {
  const s = await api.getSettings();
  const set = new Set(s.passthroughHosts);
  if (on) set.add(host); else set.delete(host);
  await api.putSettings({ ...s, passthroughHosts: [...set] });
}

export function Detail({ e }: { e: Exchange }) {
  const [bpBody, setBpBody] = useState<{ key: string; text: string; binary: boolean; error?: string } | null>(null);
  const showToast = useUI((s) => s.showToast);
  const [passthrough, setPassthrough] = useState<boolean | null>(null);

  useEffect(() => {
    setPassthrough(null);
    if (e.kind === 'tls-error' || e.kind === 'tls-passthrough') {
      api.getSettings().then((s) => setPassthrough(s.passthroughHosts.some((h) => h === e.host.toLowerCase())));
    }
  }, [e.id, e.kind, e.host]);

  const copy = async (text: string, done = 'Скопировано') => {
    showToast((await copyText(text)) ? done : 'Не удалось скопировать');
  };
  const refreshKey = `${e.state}:${e.response?.size ?? 0}:${e.request?.size ?? 0}`;

  // Тело для редактирования на breakpoint (декодированный текст).
  useEffect(() => {
    setBpBody(null);
    if (e.state !== 'paused' || !e.id) return;
    let alive = true;
    const side = e.breakpoint === 'request' ? 'request' : 'response';
    fetchBody(e.id, side).then((b) => {
      if (alive) setBpBody({ key: `${e.id}:${e.breakpoint}`, text: decodeText(b.bytes), binary: looksBinary(b.bytes),
        error: b.evicted ? 'Тело удалено из памяти.' : b.decodeError });
    }).catch((err) => { if (alive) setBpBody({ key: `${e.id}:${e.breakpoint}`, text: '', binary: false, error: err.message }); });
    return () => { alive = false; };
  }, [e.id, e.breakpoint, e.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const isHTTP = e.kind === 'http' || e.kind === 'websocket';
  const q = queryRows(e.url);

  return (
    <>
      <div className="detail-head">
        <div className="grow">
          <div className="row" style={{ gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <strong className={'m-' + methodLabel(e)}>{methodLabel(e)}</strong>
            <span className={'status ' + statusClass(e)}>{statusText(e)}</span>
            {e.response?.statusText && <span className="muted">{e.response.statusText}</span>}
            {e.proto && <span className="tag">{e.proto}</span>}
            {e.source && <span className="tag blue">{e.source}</span>}
            {e.rule && <span className="tag purple">правило: {e.rule}</span>}
            {e.state === 'pending' && <span className="row muted"><Spinner /> выполняется</span>}
          </div>
          <div className="url">{e.url ?? e.host}</div>
        </div>
        <div className="row" style={{ gap: 2 }}>
          {e.kind === 'http' && <button className="btn sm ghost" onClick={() => {
            useUI.setState({ ruleDraft: { name: `${e.method ?? 'GET'} ${e.host}${e.path?.split('?')[0] ?? '/'}`, enabled: true,
              match: { method: e.method, host: e.host, path: e.path?.split('?')[0], source: e.source === 'manual' ? undefined : e.source },
              breakRequest: true } });
            useUI.getState().setPage('rules');
          }}>Правило</button>}
          <button className={'btn ghost sm icon-only' + (e.pinned ? ' active' : '')} title={e.pinned ? 'Открепить' : 'Закрепить (не удалится при очистке)'}
            onClick={() => api.pin(e.id, !e.pinned)}><Icon name="pin" size={14} /></button>
          {isHTTP && <button className="btn ghost sm icon-only" title="Копировать как cURL"
            onClick={async () => copy(await api.curl(e.id), 'cURL скопирован')}><Icon name="terminal" size={14} /></button>}
          {isHTTP && <button className="btn ghost sm icon-only" title="Сохранить как HAR"
            onClick={() => downloadHAR([e.id])}><Icon name="export" size={14} /></button>}
          <button className="btn ghost sm icon-only" title="Удалить" onClick={() => api.remove([e.id])}><Icon name="trash" size={14} /></button>
        </div>
      </div>

      <div className="detail-scroll">
        {e.state === 'paused' && (
          <BreakpointPanel
            key={`${e.id}:${e.breakpoint}`}
            id={e.id} kind={e.breakpoint as 'request' | 'response'}
            method={e.method ?? 'GET'} url={e.url ?? ''} status={e.response?.status}
            headers={((e.breakpoint === 'request' ? e.request : e.response) ?? { headers: [] }).headers}
            bodyText={bpBody?.key === `${e.id}:${e.breakpoint}` ? bpBody.text : null}
            bodyBinary={bpBody?.key === `${e.id}:${e.breakpoint}` && bpBody.binary}
            bodyError={bpBody?.key === `${e.id}:${e.breakpoint}` ? bpBody.error : undefined}
          />
        )}
        {e.error && (
          <div className="errbox">
            <strong>{e.kind === 'tls-error' ? 'Клиент не принял сертификат' : 'Ошибка'}</strong>
            <div style={{ marginTop: 3 }}>{e.error}</div>
          </div>
        )}

        {(e.kind === 'tls-error' || e.kind === 'tls-passthrough') && passthrough !== null && (
          <div className="row">
            {passthrough ? (
              <button className="btn" onClick={async () => { await togglePassthrough(e.host.toLowerCase(), false); setPassthrough(false); showToast('Хост снова расшифровывается'); }}>
                Расшифровывать этот хост снова
              </button>
            ) : (
              <button className="btn" onClick={async () => { await togglePassthrough(e.host.toLowerCase(), true); setPassthrough(true); showToast('Хост добавлен в passthrough'); }}>
                Пропускать этот хост без расшифровки
              </button>
            )}
            <span className="muted">Если приложение использует certificate pinning, его нужно «отпинить» (Frida) или пропускать хост.</span>
          </div>
        )}

        {isHTTP && e.request && (
          <Section title="Запрос" right={<span className="muted">{fmtBytes(e.request.size)}</span>}>
            <div className="sub">
              <div className="sub-title">Заголовки · {e.request.headers.length}</div>
              <Headers headers={e.request.headers} />
            </div>
            {q.length > 0 && (
              <div className="sub">
                <div className="sub-title">Параметры запроса · {q.length}</div>
                <KV rows={q} />
              </div>
            )}
            {(e.request.size > 0) && (
              <div className="sub">
                <div className="sub-title">Тело</div>
                <BodyView id={e.id} side="request" message={e.request} refreshKey={refreshKey} />
              </div>
            )}
          </Section>
        )}

        {isHTTP && e.response && (
          <Section title="Ответ" right={<span className="muted">{fmtBytes(e.response.size)}</span>}>
            <div className="sub">
              <div className="sub-title">Заголовки · {e.response.headers.length}</div>
              <Headers headers={e.response.headers} />
            </div>
            {e.kind === 'http' && (e.response.size > 0 || e.state === 'pending') && (
              <div className="sub">
                <div className="sub-title">Тело</div>
                {e.state === 'pending' && e.response.size === 0
                  ? <div className="row muted"><Spinner /> Ожидаю данные…</div>
                  : <BodyView id={e.id} side="response" message={e.response} refreshKey={refreshKey} />}
              </div>
            )}
          </Section>
        )}

        {e.kind === 'websocket' && (
          <Section title="Сообщения WebSocket" right={<span className="muted">{e.frameCount ?? 0}</span>}>
            <Frames id={e.id} raw={false} />
          </Section>
        )}

        {e.kind === 'raw' && (
          <Section title="Поток данных" right={<span className="muted">↑ {fmtBytes(e.bytesOut)} · ↓ {fmtBytes(e.bytesIn)}</span>}>
            <Frames id={e.id} raw />
          </Section>
        )}

        <Section title="Информация" defaultOpen={e.kind !== 'http'}>
          {isHTTP && (
            <div className="sub">
              <div className="sub-title">Время</div>
              <Timing e={e} />
            </div>
          )}
          <div className="sub">
            <div className="sub-title">Соединение</div>
            <KV plain rows={[
              ['Начало', fmtTime(e.started)],
              ['Клиент', e.clientAddr ?? '—'],
              ['Сервер', e.serverAddr ?? '—'],
              ['Источник', e.source ?? '—'],
              ...(e.kind === 'raw' || e.kind === 'tls-passthrough' ? [['Передано', `↑ ${fmtBytes(e.bytesOut)} · ↓ ${fmtBytes(e.bytesIn)}`] as [string, string]] : []),
            ]} />
          </div>
          {e.clientTls && <TLSBlock title="TLS: приложение → Siphon" tls={e.clientTls} />}
          {e.serverTls && <TLSBlock title="TLS: Siphon → сервер" tls={e.serverTls} />}
        </Section>
      </div>
    </>
  );
}
