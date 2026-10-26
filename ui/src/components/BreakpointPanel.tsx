import { useEffect, useState } from 'react';
import { api, type Header } from '../api';
import { useUI } from '../store';
import { Icon } from './ui';

// Панель останавливает на breakpoint запрос или ответ и ждёт решения:
// продолжить (с правками), сбросить изменения или оборвать соединение.
export function BreakpointPanel({ id, kind, method, url, status, headers, bodyText, bodyBinary, bodyError }: {
  id: string; kind: 'request' | 'response'; method: string; url: string; status?: number;
  headers: Header[]; bodyText: string | null; bodyBinary: boolean; bodyError?: string;
}) {
  const showToast = useUI((s) => s.showToast);
  const [m, setM] = useState(method);
  const [u, setU] = useState(url);
  const [st, setSt] = useState(status ?? 200);
  const [hdrText, setHdrText] = useState(headers.map((h) => `${h.name}: ${h.value}`).join('\n'));
  const [body, setBody] = useState(bodyText ?? '');
  const [bodyDirty, setBodyDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setM(method); setU(url); setSt(status ?? 200);
    setHdrText(headers.map((h) => `${h.name}: ${h.value}`).join('\n'));
    setBody(bodyText ?? '');
    setBodyDirty(false);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!bodyDirty) setBody(bodyText ?? ''); }, [bodyText, bodyDirty]);

  const parseHeaders = (): Header[] | string => {
    const out: Header[] = [];
    for (const line of hdrText.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      const i = l.indexOf(':');
      if (i < 1) return `строка «${l}» — ожидается «Имя: значение»`;
      out.push({ name: l.slice(0, i).trim(), value: l.slice(i + 1).trim() });
    }
    return out;
  };

  const send = async (drop: boolean) => {
    setBusy(true);
    try {
      if (drop) {
        await api.drop(id);
        return;
      }
      const parsed = parseHeaders();
      if (typeof parsed === 'string') {
        showToast(parsed);
        setBusy(false);
        return;
      }
      // Omit unchanged fields. In particular, a binary/compressed body must not
      // be replaced with its UTF-8 preview when simply continuing a breakpoint.
      const res = {
        ...(kind === 'request' && m !== method ? { method: m.trim().toUpperCase() } : {}),
        ...(kind === 'request' && u !== url ? { url: u.trim() } : {}),
        ...(kind === 'response' && st !== status ? { status: st } : {}),
        ...(hdrText !== headers.map((h) => `${h.name}: ${h.value}`).join('\n') ? { headers: parsed } : {}),
        ...(bodyDirty ? { body } : {}),
      };
      await api.resume(id, res);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notice blue" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div className="row">
        <Icon name="pause" />
        <strong>Остановлено на breakpoint ({kind === 'request' ? 'запрос' : 'ответ'})</strong>
        <span className="spacer" />
        <span className="faint">Изменения отправятся после «Продолжить»</span>
      </div>
      {kind === 'request' ? (
        <div className="row">
          <input className="input mono" style={{ width: 80 }} value={m} onChange={(e) => setM(e.target.value)} />
          <input className="input mono" value={u} onChange={(e) => setU(e.target.value)} />
        </div>
      ) : (
        <div className="row">
          <span className="muted">Статус</span>
          <input className="input mono" style={{ width: 90 }} value={st} onChange={(e) => setSt(Number(e.target.value) || 0)} />
        </div>
      )}
      <textarea className="input mono" style={{ minHeight: 110 }} spellCheck={false} value={hdrText} onChange={(e) => setHdrText(e.target.value)} placeholder="Заголовки: Имя: значение" />
      <textarea className="input mono" style={{ minHeight: 110 }} spellCheck={false} disabled={bodyText === null || bodyBinary}
        value={bodyBinary ? 'Двоичное тело сохраняется без изменений.' : body}
        onChange={(e) => { setBody(e.target.value); setBodyDirty(true); }} placeholder={bodyText === null ? 'Загружаю тело…' : 'Тело'} />
      {bodyError && <span className="faint">{bodyError} Исходное тело сохранится при продолжении.</span>}
      <div className="row">
        <button className="btn primary" disabled={busy || (bodyText === null && !bodyError)} onClick={() => send(false)}><Icon name="play" size={13} /> Продолжить</button>
        <button className="btn" disabled={busy} onClick={() => { setHdrText(headers.map((h) => `${h.name}: ${h.value}`).join('\n')); setBody(bodyText ?? ''); setBodyDirty(false); setSt(status ?? 200); setM(method); setU(url); }}>
          Сбросить правки
        </button>
        <span className="spacer" />
        <button className="btn danger" disabled={busy} onClick={() => send(true)}><Icon name="close" size={13} /> Оборвать</button>
      </div>
    </div>
  );
}
