import { apiUrl } from './desktop';

export interface Header { name: string; value: string }

export interface Message {
  status?: number;
  statusText?: string;
  headers: Header[];
  size: number;
  truncated?: boolean;
  contentType?: string;
  encoding?: string;
}

export interface TLSInfo {
  version?: string; cipher?: string; alpn?: string; serverName?: string;
  certSubject?: string; certIssuer?: string; certExpires?: string;
}

export type Kind = 'http' | 'websocket' | 'raw' | 'tls-error' | 'tls-passthrough';
export type State = 'pending' | 'paused' | 'done' | 'error' | 'aborted';

export interface Exchange {
  id: string;
  seq: number;
  kind: Kind;
  source?: string;
  clientAddr?: string;
  state: State;
  error?: string;
  started: string;
  method?: string;
  scheme?: string;
  host: string;
  port?: number;
  path?: string;
  url?: string;
  proto?: string;
  request?: Message;
  response?: Message;
  timing: { requestDone?: number; responseStart?: number; end?: number };
  serverAddr?: string;
  clientTls?: TLSInfo;
  serverTls?: TLSInfo;
  pinned?: boolean;
  rule?: string;
  breakpoint?: 'request' | 'response';
  edited?: boolean;
  bodyEvicted?: boolean;
  frameCount?: number;
  bytesOut?: number;
  bytesIn?: number;
}

export interface Frame {
  seq: number;
  dir: 'out' | 'in';
  kind: string;
  time: string;
  size: number;
  truncated?: boolean;
  data?: string; // base64
}

export interface Settings {
  insecureUpstream: boolean;
  autoPassthrough: boolean;
  passthroughHosts: string[];
  ignoreCertHosts: string[];
  upstreamProxy: string;
}

export interface AppState {
  version: string;
  platform: string;
  dataDir: string;
  ca: { subject: string };
  proxy: { port: string; bind: string; lanIPs: string[] };
  adb: ADBStatus;
  settings: Settings;
}

export interface ADBStatus { found: boolean; path?: string; running: boolean; downloading?: boolean; error?: string }

export interface DeviceInfo {
  manufacturer?: string; androidVersion?: string; sdk?: number; arch?: string;
  emulator: boolean; debuggable: boolean; root?: string;
  frida: 'running' | 'launch-required' | 'setup-required';
  fridaVersion: string;
}

export interface Device {
  serial: string; state: string; model?: string; product?: string; deviceName?: string;
  info?: DeviceInfo; busy?: boolean; prepareError?: string;
}

export interface LogLine { time: string; level: 'info' | 'warn' | 'error'; text: string }

export interface Session {
  safeMode?: boolean;
  id: string; serial: string; device: string; appId: string; appName?: string;
  mode: 'spawn' | 'attach'; state: 'starting' | 'running' | 'stopped' | 'error' | 'removed';
  error?: string; proxyPort?: number; pid?: number; started: string; log?: LogLine[];
}

export interface App { id: string; name: string; pid: number }

// ---------- Правила ----------

export interface RuleReplace { find: string; with: string; regex?: boolean }

export interface RuleMods {
  setHeaders?: Header[];
  removeHeaders?: string[];
  replace?: RuleReplace[];
  setBody?: string;
  status?: number;
}

export interface Rule {
  id?: string;
  name?: string;
  enabled: boolean;
  match: {
    method?: string; host?: string; path?: string; url?: string;
    source?: string; headerName?: string; headerValue?: string;
  };
  delayMs?: number;
  mock?: { status?: number; headers?: Header[]; body?: string };
  block?: string;
  redirectTo?: string;
  request?: RuleMods;
  response?: RuleMods;
  breakRequest?: boolean;
  breakResponse?: boolean;
}

export interface Resolution {
  drop?: boolean;
  method?: string;
  url?: string;
  status?: number;
  headers?: Header[];
  body?: string;
  bodyBase64?: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'error' in data) ? String((data as { error: unknown }).error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// Страховка от null вместо пустого массива в ответах сервера.
const normSettings = (s: Settings): Settings => ({
  ...s,
  passthroughHosts: s.passthroughHosts ?? [],
  ignoreCertHosts: s.ignoreCertHosts ?? [],
  upstreamProxy: s.upstreamProxy ?? '',
});

export const api = {
  state: () => request<AppState>('GET', '/api/state').then((s) => ({ ...s, settings: normSettings(s.settings) })),
  exchanges: () => request<Exchange[]>('GET', '/api/exchanges'),
  frames: (id: string) => request<Frame[]>('GET', `/api/exchanges/${id}/frames`),
  curl: async (id: string) => (await fetch(apiUrl(`/api/exchanges/${id}/curl`))).text(),
  pin: (id: string, pinned: boolean) => request('POST', `/api/exchanges/${id}/pin`, { pinned }),
  remove: (ids: string[]) => request('POST', '/api/exchanges/delete', { ids }),
  clear: (keepPinned: boolean) => request('POST', '/api/exchanges/clear', { keepPinned }),
  getSettings: () => request<Settings>('GET', '/api/settings').then(normSettings),
  putSettings: (s: Settings) => request<Settings>('PUT', '/api/settings', s).then(normSettings),

  getRules: () => request<Rule[]>('GET', '/api/rules'),
  putRules: (rules: Rule[]) => request<Rule[]>('PUT', '/api/rules', rules),
  resume: (id: string, res: Resolution) => request('POST', `/api/exchanges/${id}/resume`, res),
  drop: (id: string) => request('POST', `/api/exchanges/${id}/drop`),

  android: () => request<{ adb: ADBStatus; devices: Device[]; sessions: Session[] }>('GET', '/api/android'),
  downloadADB: () => request('POST', '/api/android/adb/download'),
  inspect: (serial: string) => request<DeviceInfo>('POST', `/api/android/devices/${encodeURIComponent(serial)}/inspect`),
  prepare: (serial: string) => request('POST', `/api/android/devices/${encodeURIComponent(serial)}/prepare`),
  stopFrida: (serial: string) => request('POST', `/api/android/devices/${encodeURIComponent(serial)}/stop-frida`),
  restartFramework: (serial: string) => request('POST', `/api/android/devices/${encodeURIComponent(serial)}/restart-framework`),
  apps: (serial: string) => request<App[]>('GET', `/api/android/devices/${encodeURIComponent(serial)}/apps`),
  startSession: (req: {
    serial: string; appId: string; appName?: string; mode: 'spawn' | 'attach';
    disableRootDetection?: boolean; flutter?: boolean; safeMode?: boolean;
  }) => request<Session>('POST', '/api/android/sessions', req),
  stopSession: (id: string) => request('POST', `/api/android/sessions/${id}/stop`),
  dismissSession: (id: string) => request('DELETE', `/api/android/sessions/${id}`),
};

export interface BodyResult {
  bytes: Uint8Array;
  contentType: string;
  size: number;
  truncated: boolean;
  evicted: boolean;
  decodeError?: string;
}

export async function fetchBody(id: string, side: 'request' | 'response'): Promise<BodyResult> {
  const res = await fetch(apiUrl(`/api/exchanges/${id}/body?side=${side}`));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get('X-Body-Content-Type') ?? '',
    size: Number(res.headers.get('X-Body-Size') ?? 0),
    truncated: res.headers.has('X-Body-Truncated'),
    evicted: res.headers.has('X-Body-Evicted'),
    decodeError: res.headers.get('X-Decode-Error') ?? undefined,
  };
}

export const bodyUrl = (id: string, side: 'request' | 'response', raw = false) =>
  apiUrl(`/api/exchanges/${id}/body?side=${side}&download=1${raw ? '&raw=1' : ''}`);
