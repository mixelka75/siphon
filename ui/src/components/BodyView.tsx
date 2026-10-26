import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { bodyUrl, fetchBody, type BodyResult, type Message } from '../api';
import { copyText, decodeText, fmtBytes, looksBinary, shortType } from '../format';
import { useUI } from '../store';
import { Icon, Spinner, Seg } from './ui';
import { saveURL } from '../desktop';

const MAX_TEXT = 512 * 1024;
const MAX_HEX = 64 * 1024;

// Форматируем по тексту, а не через JSON.parse/stringify: так большие
// целые (64-битные ID) не округляются.
export function prettyJSON(src: string): string {
  let out = '';
  let indent = 0;
  let inStr = false;
  let esc = false;
  const nl = () => '\n' + '  '.repeat(Math.max(indent, 0));
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    switch (c) {
      case '"': inStr = true; out += c; break;
      case '{': case '[': {
        let j = i + 1;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] === (c === '{' ? '}' : ']')) { out += c + src[j]; i = j; }
        else { indent++; out += c + nl(); }
        break;
      }
      case '}': case ']': indent--; out += nl() + c; break;
      case ',': out += ',' + nl(); break;
      case ':': out += ': '; break;
      default: if (!/\s/.test(c)) out += c;
    }
  }
  return out;
}

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

function highlightJSON(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(src); m; m = TOKEN.exec(src)) {
    if (m.index > last) out.push(src.slice(last, m.index));
    if (m[1]) {
      out.push(<span key={k++} className={m[2] ? 'j-key' : 'j-str'}>{m[1]}</span>);
      if (m[2]) out.push(m[2]);
    } else if (m[3]) {
      out.push(<span key={k++} className="j-bool">{m[0]}</span>);
    } else if (m[0] === 'null') {
      out.push(<span key={k++} className="j-null">null</span>);
    } else {
      out.push(<span key={k++} className="j-num">{m[0]}</span>);
    }
    last = TOKEN.lastIndex;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

function Hex({ bytes }: { bytes: Uint8Array }) {
  const shown = bytes.subarray(0, MAX_HEX);
  const rows = [];
  for (let off = 0; off < shown.length; off += 16) {
    const chunk = shown.subarray(off, off + 16);
    const hex = Array.from(chunk, (b) => b.toString(16).padStart(2, '0')).join(' ');
    const asc = Array.from(chunk, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '·')).join('');
    rows.push(
      <div key={off} style={{ display: 'contents' }}>
        <span className="off">{off.toString(16).padStart(6, '0')}</span>
        <span>{hex}</span>
        <span className="asc">{asc}</span>
      </div>,
    );
  }
  return (
    <div className="hex">
      {rows}
      {bytes.length > MAX_HEX && <span className="faint" style={{ gridColumn: '1 / -1' }}>… показаны первые {fmtBytes(MAX_HEX)} из {fmtBytes(bytes.length)}</span>}
    </div>
  );
}

type Mode = 'auto' | 'text' | 'hex';

function useImageUrl(bytes: Uint8Array | undefined, type: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!bytes || !type) { setUrl(null); return; }
    const u = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bytes, type]);
  return url;
}

export function BodyView({ id, side, message, refreshKey }: {
  id: string; side: 'request' | 'response'; message: Message; refreshKey: string;
}) {
  const [body, setBody] = useState<BodyResult | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const showToast = useUI((s) => s.showToast);

  useEffect(() => {
    let alive = true;
    setError('');
    fetchBody(id, side).then((b) => { if (alive) setBody(b); }).catch((e) => { if (alive) setError(String(e.message ?? e)); });
    return () => { alive = false; };
  }, [id, side, refreshKey]);

  const ct = (body?.contentType || message.contentType || '').toLowerCase();
  const bytes = body?.bytes;

  const view = useMemo(() => {
    if (!bytes || bytes.length === 0) return null;
    const isImage = ct.startsWith('image/');
    const binary = looksBinary(bytes);
    if (isImage && mode === 'auto') return { kind: 'image' as const };
    if (mode === 'hex' || (binary && mode === 'auto')) return { kind: 'hex' as const };

    const clipped = bytes.length > MAX_TEXT ? bytes.subarray(0, MAX_TEXT) : bytes;
    const text = decodeText(clipped);
    const trimmed = text.trimStart();
    if (mode === 'auto' && (ct.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        JSON.parse(text);
        return { kind: 'json' as const, text: prettyJSON(text), clipped: bytes.length > MAX_TEXT };
      } catch { /* не JSON или обрезан — покажем как текст */ }
    }
    if (mode === 'auto' && ct.includes('x-www-form-urlencoded')) {
      return { kind: 'form' as const, pairs: Array.from(new URLSearchParams(text).entries()) };
    }
    return { kind: 'text' as const, text, clipped: bytes.length > MAX_TEXT };
  }, [bytes, ct, mode]);

  const imgUrl = useImageUrl(view?.kind === 'image' ? bytes : undefined, ct.split(';')[0] || 'image/png');

  if (error) return <div className="muted" style={{ padding: '4px 0' }}>Не удалось загрузить тело: {error}</div>;
  if (!body) return <div className="row muted"><Spinner /> Загружаю…</div>;
  if (body.evicted) return <div className="muted">Тело выгружено из памяти: превышен лимит хранилища.</div>;
  if (!bytes || bytes.length === 0) return <div className="muted">Тела нет</div>;

  const copyBody = async () => {
    const ok = view?.kind === 'text' || view?.kind === 'json'
      ? await copyText(view.text)
      : await copyText(decodeText(bytes));
    showToast(ok ? 'Скопировано' : 'Не удалось скопировать');
  };

  return (
    <div className="bodybox">
      <div className="bodybar">
        <span>{fmtBytes(body.size || bytes.length)}</span>
        {ct && <span className="tag">{shortType(ct) || ct.split(';')[0]}</span>}
        {message.encoding && <span className="tag">{message.encoding}</span>}
        {body.decodeError && <span className="tag orange" title={body.decodeError}>не распаковано</span>}
        {(body.truncated || message.truncated) && <span className="tag orange">обрезано</span>}
        <span className="spacer" />
        {view?.kind !== 'image' && <Seg<Mode> value={mode} onChange={setMode}
          options={[{ value: 'auto', label: 'Авто' }, { value: 'text', label: 'Текст' }, { value: 'hex', label: 'Hex' }]} />}
        <button className="btn ghost sm icon-only" title="Копировать" onClick={copyBody}><Icon name="copy" size={14} /></button>
        <button className="btn ghost sm icon-only" title="Скачать" onClick={() => saveURL(bodyUrl(id, side), `siphon-${id}-${side}.bin`).catch((e) => showToast(e.message))}><Icon name="download" size={14} /></button>
      </div>
      {view?.kind === 'image' && (imgUrl ? <img src={imgUrl} alt="" /> : <Spinner />)}
      {view?.kind === 'hex' && <Hex bytes={bytes} />}
      {view?.kind === 'json' && <pre><code>{highlightJSON(view.text)}</code></pre>}
      {view?.kind === 'text' && <pre className="nowrap"><code>{view.text}</code></pre>}
      {view?.kind === 'form' && (
        <div style={{ padding: '8px 11px' }}>
          <div className="kv">
            {view.pairs.map(([k, v], i) => (
              <div key={i} style={{ display: 'contents' }}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </div>
        </div>
      )}
      {(view?.kind === 'text' || view?.kind === 'json') && view.clipped && (
        <div className="bodybar" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>
          Показаны первые {fmtBytes(MAX_TEXT)} — остальное доступно через «Скачать»
        </div>
      )}
    </div>
  );
}
