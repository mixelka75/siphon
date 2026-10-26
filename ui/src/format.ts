import type { Exchange, Header } from './api';

export function fmtBytes(n: number | undefined): string {
  if (n === undefined || n < 0) return '';
  if (n < 1024) return `${n} Б`;
  const units = ['КБ', 'МБ', 'ГБ'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function fmtMs(ms: number | undefined): string {
  if (!ms) return '';
  if (ms < 1) return '<1 мс';
  if (ms < 1000) return `${Math.round(ms)} мс`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} с`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export function header(h: Header[] | undefined, name: string): string | undefined {
  const n = name.toLowerCase();
  return h?.find((x) => x.name.toLowerCase() === n)?.value;
}

export function statusClass(e: Exchange): string {
  if (e.kind === 'tls-error') return 'sx';
  if (e.state === 'error') return 'sx';
  if (e.state === 'aborted') return 'sx';
  const s = e.response?.status;
  if (!s) return 'sp';
  return 's' + String(s)[0];
}

export function statusText(e: Exchange): string {
  if (e.kind === 'tls-error') return 'TLS';
  if (e.state === 'error') return 'ERR';
  if (e.state === 'aborted') return 'ABT';
  if (e.kind === 'websocket' && e.response?.status === 101) return e.state === 'done' ? 'WS' : 'WS•';
  if (e.kind === 'raw') return e.state === 'done' ? 'TCP' : 'TCP•';
  if (e.kind === 'tls-passthrough') return 'TLS→';
  return e.response?.status ? String(e.response.status) : '…';
}

export function methodLabel(e: Exchange): string {
  if (e.kind === 'websocket') return 'WS';
  if (e.kind === 'raw') return 'TCP';
  if (e.kind === 'tls-error' || e.kind === 'tls-passthrough') return 'TLS';
  return e.method ?? '';
}

// Короткий тип содержимого для колонки.
export function shortType(ct: string | undefined): string {
  if (!ct) return '';
  const t = ct.split(';')[0].trim().toLowerCase();
  if (t.includes('json')) return 'json';
  if (t.includes('html')) return 'html';
  if (t.includes('xml')) return 'xml';
  if (t.includes('javascript')) return 'js';
  if (t.includes('css')) return 'css';
  if (t.includes('protobuf') || t.includes('grpc')) return 'proto';
  if (t.startsWith('image/')) return t.slice(6).replace('svg+xml', 'svg');
  if (t.startsWith('text/')) return t.slice(5);
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t.includes('x-www-form-urlencoded')) return 'form';
  if (t.includes('octet-stream')) return 'bin';
  const slash = t.indexOf('/');
  return slash >= 0 ? t.slice(slash + 1) : t;
}

export function displayPath(e: Exchange): string {
  if (e.kind === 'raw') return e.port ? `:${e.port}` : '';
  if (e.kind === 'tls-error' || e.kind === 'tls-passthrough') return e.port && e.port !== 443 ? `:${e.port}` : '';
  return e.path ?? '';
}

// ---------- Фильтр ----------

export type Predicate = (e: Exchange) => boolean;

// Синтаксис: слова ищутся в URL/методе/статусе; method:post status:4xx host:api type:json src:com.app,
// `-слово` исключает; несколько условий — через пробел (И).
export function parseFilter(q: string): Predicate {
  const terms = q.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return () => true;

  const preds: Predicate[] = terms.map((raw) => {
    const neg = raw.startsWith('-') && raw.length > 1;
    const term = (neg ? raw.slice(1) : raw).toLowerCase();
    const colon = term.indexOf(':');
    let p: Predicate;
    if (colon > 0) {
      const key = term.slice(0, colon);
      const val = term.slice(colon + 1);
      p = fieldPredicate(key, val) ?? ((e) => haystack(e).includes(term));
    } else {
      p = (e) => haystack(e).includes(term);
    }
    return neg ? (e) => !p(e) : p;
  });
  return (e) => preds.every((p) => p(e));
}

function haystack(e: Exchange): string {
  return `${e.method ?? ''} ${e.url ?? e.host} ${statusText(e)} ${e.source ?? ''}`.toLowerCase();
}

function fieldPredicate(key: string, val: string): Predicate | undefined {
  switch (key) {
    case 'method': return (e) => (e.method ?? methodLabel(e)).toLowerCase() === val;
    case 'host': return (e) => e.host.toLowerCase().includes(val);
    case 'path': return (e) => (e.path ?? '').toLowerCase().includes(val);
    case 'src': case 'source': case 'app': return (e) => (e.source ?? '').toLowerCase().includes(val);
    case 'type': return (e) => shortType(e.response?.contentType).includes(val) || (e.response?.contentType ?? '').toLowerCase().includes(val);
    case 'kind': return (e) => e.kind.includes(val);
    case 'status': {
      const m = /^([1-5])xx$/.exec(val);
      if (m) return (e) => String(e.response?.status ?? '')[0] === m[1];
      return (e) => String(e.response?.status ?? '') === val;
    }
    case 'is': {
      if (val === 'error') return (e) => e.state === 'error' || e.kind === 'tls-error' || (e.response?.status ?? 0) >= 400;
      if (val === 'pinned') return (e) => !!e.pinned;
      if (val === 'pending') return (e) => e.state === 'pending';
    }
  }
  return undefined;
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function looksBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 2048);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const b = bytes[i];
    if (b === 0) return true;
    if (b < 9 || (b > 13 && b < 32)) bad++;
  }
  return n > 0 && bad / n > 0.1;
}

export function b64ToBytes(b64: string | undefined): Uint8Array {
  if (!b64) return new Uint8Array();
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await nativeCopy(text);
    return true;
  } catch {
    return false;
  }
}
import { nativeCopy } from './desktop';
