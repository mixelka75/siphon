import { create } from 'zustand';
import { apiUrl } from './desktop';
import {
  api, type AppState, type ADBStatus, type Device, type Exchange, type Frame, type Session, type LogLine, type Rule,
} from './api';

// ---------- Трафик ----------
// Тысячи записей держим в изменяемой структуре вне React, а в zustand кладём
// только «версию»: так обновления не копируют массивы на каждое событие.

let items: Exchange[] = [];
let index = new Map<string, number>();

export const getItems = () => items;

function rebuildIndex() {
  index = new Map(items.map((e, i) => [e.id, i]));
}

interface TrafficEvent {
  type: 'add' | 'update' | 'delete' | 'clear' | 'frame' | 'resync';
  exchange?: Exchange;
  frame?: Frame;
  id?: string;
  ids?: string[];
}

interface UI {
  ruleDraft: Rule | null;
  page: 'traffic' | 'android' | 'rules' | 'settings';
  setPage: (p: UI['page']) => void;
  connected: boolean;
  appState: AppState | null;
  toast: string | null;
  showToast: (t: string) => void;

  version: number; // растёт при каждом изменении списка
  selectedId: string | null;
  select: (id: string | null) => void;
  filter: string;
  setFilter: (f: string) => void;
  paused: boolean;
  pendingCount: number;
  setPaused: (p: boolean) => void;
}

let pendingQueue: TrafficEvent[] = [];
let flushScheduled = false;
const frameListeners = new Map<string, Set<(f: Frame) => void>>();

export const onFrames = (id: string, cb: (f: Frame) => void) => {
  let set = frameListeners.get(id);
  if (!set) frameListeners.set(id, (set = new Set()));
  set.add(cb);
  return () => { set!.delete(cb); };
};

export const useUI = create<UI>((set, get) => ({
  ruleDraft: null,
  page: (localStorage.getItem('siphon.page') as UI['page']) || 'traffic',
  setPage: (page) => { localStorage.setItem('siphon.page', page); set({ page }); },
  connected: false,
  appState: null,
  toast: null,
  showToast: (toast) => {
    set({ toast });
    setTimeout(() => { if (get().toast === toast) set({ toast: null }); }, 2200);
  },

  version: 0,
  selectedId: null,
  select: (selectedId) => set({ selectedId }),
  filter: '',
  setFilter: (filter) => set({ filter }),
  paused: false,
  pendingCount: 0,
  setPaused: (paused) => {
    set({ paused });
    if (!paused) scheduleFlush();
  },
}));

function applyEvent(ev: TrafficEvent): boolean {
  switch (ev.type) {
    case 'add':
      if (ev.exchange && !index.has(ev.exchange.id)) {
        index.set(ev.exchange.id, items.length);
        items.push(ev.exchange);
        return true;
      }
      return false;
    case 'update': {
      if (!ev.exchange) return false;
      const i = index.get(ev.exchange.id);
      if (i === undefined) {
        index.set(ev.exchange.id, items.length);
        items.push(ev.exchange);
      } else {
        items[i] = ev.exchange;
      }
      return true;
    }
    case 'delete': {
      const drop = new Set(ev.ids ?? []);
      items = items.filter((e) => !drop.has(e.id));
      rebuildIndex();
      if (useUI.getState().selectedId && drop.has(useUI.getState().selectedId!)) useUI.setState({ selectedId: null });
      return true;
    }
    case 'clear':
      items = items.filter((e) => e.pinned);
      rebuildIndex();
      if (!items.some((e) => e.id === useUI.getState().selectedId)) useUI.setState({ selectedId: null });
      return true;
    case 'frame':
      if (ev.id && ev.frame) frameListeners.get(ev.id)?.forEach((cb) => cb(ev.frame!));
      return false;
  }
  return false;
}

function flush() {
  flushScheduled = false;
  if (useUI.getState().paused) {
    useUI.setState({ pendingCount: pendingQueue.length });
    return;
  }
  const queue = pendingQueue;
  pendingQueue = [];
  let changed = false;
  for (const ev of queue) changed = applyEvent(ev) || changed;
  useUI.setState((s) => ({ version: changed ? s.version + 1 : s.version, pendingCount: 0 }));
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  requestAnimationFrame(flush);
}

async function loadTraffic() {
  const list = await api.exchanges();
  items = list;
  rebuildIndex();
  pendingQueue = [];
  useUI.setState((s) => ({ version: s.version + 1, pendingCount: 0 }));
}

// ---------- Android ----------

interface AndroidState {
  adb: ADBStatus | null;
  devices: Device[];
  sessions: Session[];
  progress: Record<string, string[]>;
  prepareError: Record<string, string>;
}

export const useAndroid = create<AndroidState>(() => ({
  adb: null, devices: [], sessions: [], progress: {}, prepareError: {},
}));

interface AndroidEvent { type: string; data: any }

function onAndroid(ev: AndroidEvent) {
  switch (ev.type) {
    case 'resync':
      void loadAndroid();
      break;
    case 'adb':
      useAndroid.setState({ adb: ev.data as ADBStatus });
      break;
    case 'devices':
      useAndroid.setState({ devices: (ev.data as Device[]) ?? [] });
      break;
    case 'progress': {
      const { serial, message } = ev.data as { serial: string; message: string };
      useAndroid.setState((s) => ({
        progress: { ...s.progress, [serial]: [...(s.progress[serial] ?? []).slice(-6), message] },
        prepareError: { ...s.prepareError, [serial]: '' },
      }));
      break;
    }
    case 'prepare-done': {
      const { serial, error } = ev.data as { serial: string; error?: string };
      useAndroid.setState((s) => ({
        prepareError: { ...s.prepareError, [serial]: error ?? '' },
        progress: error ? s.progress : { ...s.progress, [serial]: [] },
      }));
      break;
    }
    case 'session': {
      const sess = ev.data as Session;
      useAndroid.setState((s) => {
        if (sess.state === 'removed') return { sessions: s.sessions.filter((x) => x.id !== sess.id) };
        const i = s.sessions.findIndex((x) => x.id === sess.id);
        if (i < 0) return { sessions: [...s.sessions, sess] };
        const next = s.sessions.slice();
        next[i] = { ...sess, log: next[i].log };
        return { sessions: next };
      });
      break;
    }
    case 'session-log': {
      const { id, line } = ev.data as { id: string; line: LogLine };
      useAndroid.setState((s) => ({
        sessions: s.sessions.map((x) => (x.id === id ? { ...x, log: [...(x.log ?? []), line].slice(-500) } : x)),
      }));
      break;
    }
  }
}

export async function loadAndroid() {
  const a = await api.android();
  useAndroid.setState({ adb: a.adb, devices: a.devices ?? [], sessions: a.sessions ?? [] });
}

// ---------- Соединение ----------

let socket: WebSocket | null = null;
let retry = 0;

export function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  const url = new URL(apiUrl('/api/events'), location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    retry = 0;
    useUI.setState({ connected: true });
    void Promise.all([loadTraffic(), loadAndroid(), api.state().then((appState) => useUI.setState({ appState }))]).catch(() => {});
  };
  ws.onmessage = (m) => {
    let msg: { ch: string; event: any };
    try { msg = JSON.parse(m.data); } catch { return; }
    if (msg.ch === 'traffic') {
      const ev = msg.event as TrafficEvent;
      if (ev.type === 'resync') { void loadTraffic(); return; }
      pendingQueue.push(ev);
      scheduleFlush();
    } else if (msg.ch === 'android') {
      onAndroid(msg.event as AndroidEvent);
    }
  };
  ws.onclose = () => {
    useUI.setState({ connected: false });
    if (socket === ws) {
      const delay = Math.min(1000 * 2 ** retry++, 8000);
      setTimeout(connect, delay);
    }
  };
  ws.onerror = () => ws.close();
}

export const refreshState = () => api.state().then((appState) => useUI.setState({ appState }));
