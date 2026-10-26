import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api, type Exchange } from '../api';
import { Detail } from '../components/Detail';
import { Empty, Icon } from '../components/ui';
import {
  displayPath, fmtBytes, fmtMs, methodLabel, parseFilter, shortType, statusClass, statusText,
} from '../format';
import { downloadHAR, downloadJSON } from '../har';
import { getItems, useUI } from '../store';

const ROW = 26;

const Row = memo(function Row({ e, selected, top, onSelect }: {
  e: Exchange; selected: boolean; top: number; onSelect: (id: string) => void;
}) {
  const icon = e.kind === 'tls-error' ? 'warn' : e.kind === 'websocket' ? 'ws' : e.kind === 'raw' ? 'tcp' : e.kind === 'tls-passthrough' ? 'lock' : null;
  const size = e.kind === 'raw' || e.kind === 'tls-passthrough' ? (e.bytesIn ?? 0) + (e.bytesOut ?? 0) : e.response?.size;
  return (
    <div className={'trow' + (selected ? ' sel' : '')} style={{ top }} onMouseDown={() => onSelect(e.id)}>
      <span className={'status ' + statusClass(e)}>{e.state === 'paused' ? '⏸' : statusText(e)}</span>
      <span className={'method m-' + methodLabel(e)}>{methodLabel(e)}</span>
      <span className="host" title={e.host}>
        {e.pinned && <span className="pinned-mark"><Icon name="pin" size={11} /></span>}
        {icon && <span style={{ marginRight: 4, color: e.kind === 'tls-error' ? 'var(--orange)' : 'var(--fg-3)', verticalAlign: '-2px' }}><Icon name={icon} size={12} /></span>}
        {e.host}
      </span>
      <span className="path" title={e.path}>{displayPath(e)}</span>
      <span className="faint">{shortType(e.response?.contentType)}</span>
      <span className="num">{fmtBytes(size)}</span>
      <span className="num">{e.state === 'pending' ? '' : fmtMs(e.timing.end)}</span>
    </div>
  );
});

const CHIPS: { label: string; token: string }[] = [
  { label: 'Ошибки', token: 'is:error' },
  { label: 'JSON', token: 'type:json' },
  { label: 'POST', token: 'method:post' },
  { label: 'WebSocket', token: 'kind:websocket' },
  { label: 'Закреплённые', token: 'is:pinned' },
];

function toggleToken(filter: string, token: string): string {
  const parts = filter.split(/\s+/).filter(Boolean);
  return (parts.includes(token) ? parts.filter((p) => p !== token) : [...parts, token]).join(' ');
}

export function TrafficPage() {
  const version = useUI((s) => s.version);
  const filter = useUI((s) => s.filter);
  const setFilter = useUI((s) => s.setFilter);
  const selectedId = useUI((s) => s.selectedId);
  const select = useUI((s) => s.select);
  const paused = useUI((s) => s.paused);
  const pending = useUI((s) => s.pendingCount);
  const setPaused = useUI((s) => s.setPaused);
  const setPage = useUI((s) => s.setPage);
  const showToast = useUI((s) => s.showToast);
  const appState = useUI((s) => s.appState);

  const [width, setWidth] = useState(() => Number(localStorage.getItem('siphon.detailWidth')) || 520);
  const [dragging, setDragging] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const all = getItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => {
    const p = parseFilter(filter);
    return all.filter(p);
  }, [version, filter]);

  const virt = useVirtualizer({
    count: filtered.length, getScrollElement: () => scroller.current, estimateSize: () => ROW, overscan: 14,
  });

  // Следим за концом списка, пока пользователь сам не прокрутил вверх.
  useEffect(() => {
    if (atBottom.current && filtered.length) virt.scrollToIndex(filtered.length - 1, { align: 'end' });
  }, [filtered.length, virt]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const selected = selectedId ? all.find((e) => e.id === selectedId) : undefined;
  const selectedIndex = selectedId ? filtered.findIndex((e) => e.id === selectedId) : -1;

  const move = useCallback((delta: number | 'start' | 'end') => {
    if (!filtered.length) return;
    let i = selectedIndex < 0 ? (delta === 'start' ? 0 : filtered.length - 1) : selectedIndex;
    if (delta === 'start') i = 0;
    else if (delta === 'end') i = filtered.length - 1;
    else i = Math.min(Math.max(i + delta, 0), filtered.length - 1);
    select(filtered[i].id);
    virt.scrollToIndex(i, { align: 'auto' });
  }, [filtered, selectedIndex, select, virt]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'f' || ev.key === 'k')) {
        ev.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (typing) { if (ev.key === 'Escape') (ev.target as HTMLElement).blur(); return; }
      if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
      else if (ev.key === 'Home') { ev.preventDefault(); move('start'); }
      else if (ev.key === 'End') { ev.preventDefault(); move('end'); }
      else if (ev.key === 'Escape') select(null);
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedId) {
        ev.preventDefault();
        const next = filtered[selectedIndex + 1] ?? filtered[selectedIndex - 1];
        void api.remove([selectedId]).then(() => select(next?.id ?? null));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, select, selectedId, filtered, selectedIndex]);

  const startDrag = (ev: React.MouseEvent) => {
    ev.preventDefault();
    setDragging(true);
    const startX = ev.clientX;
    const startW = width;
    const onMove = (m: MouseEvent) => setWidth(Math.min(Math.max(startW + (startX - m.clientX), 360), window.innerWidth - 560));
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setWidth((w) => { localStorage.setItem('siphon.detailWidth', String(w)); return w; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const sources = useMemo(() => [...new Set(all.map((e) => e.source).filter(Boolean) as string[])], [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeSource = /(?:^|\s)src:(\S+)/.exec(filter)?.[1];
  const setSource = (src: string) => {
    const rest = filter.replace(/(?:^|\s)src:\S+/g, '').trim();
    setFilter(src ? `${rest} src:${src}`.trim() : rest);
  };

  const errors = filtered.filter((e) => e.state === 'error' || e.kind === 'tls-error' || (e.response?.status ?? 0) >= 400).length;
  const proxyAddr = appState ? `${appState.proxy.bind === '0.0.0.0' ? (appState.proxy.lanIPs[0] ?? '127.0.0.1') : appState.proxy.bind}:${appState.proxy.port}` : '127.0.0.1:8000';

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={14} />
          <input ref={searchRef} className="input" value={filter} spellCheck={false}
            placeholder="Фильтр: host:api status:4xx method:post type:json -слово   (⌘K)"
            onChange={(e) => setFilter(e.target.value)} />
        </div>
        {CHIPS.map((c) => (
          <button key={c.token} className={'chip' + (filter.split(/\s+/).includes(c.token) ? ' on' : '')}
            onClick={() => setFilter(toggleToken(filter, c.token))}>{c.label}</button>
        ))}
        {sources.length > 0 && (
          <select className="input" style={{ width: 'auto', maxWidth: 200 }} value={activeSource ?? ''} onChange={(e) => setSource(e.target.value)}>
            <option value="">Все источники</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <span className="spacer" />
        <button className={'btn sm' + (paused ? ' active' : '')} onClick={() => setPaused(!paused)}
          title="Заморозить список, пока вы изучаете запросы">
          <Icon name={paused ? 'play' : 'pause'} size={13} />
          {paused ? `Продолжить${pending ? ` (+${pending})` : ''}` : 'Пауза'}
        </button>
        <button className="btn sm" disabled={!all.length} title="Сохранить показанные запросы как HAR"
          onClick={() => downloadHAR(filtered.map((e) => e.id)).catch((err) => showToast(String(err.message ?? err)))}>
          <Icon name="export" size={13} /> HAR
        </button>
        <button className="btn sm" disabled={!all.length} title="Сохранить показанные запросы в JSON: заголовки, раскодированные тела, кадры WebSocket"
          onClick={() => downloadJSON(filtered.map((e) => e.id)).catch((err) => showToast(String(err.message ?? err)))}>
          <Icon name="export" size={13} /> JSON
        </button>
        <button className="btn sm danger" disabled={!all.length} title="Удалить всё, кроме закреплённых"
          onClick={() => { select(null); void api.clear(true); }}>
          <Icon name="trash" size={13} /> Очистить
        </button>
      </div>

      <div className="split">
        <div className="list-pane">
          {all.length === 0 ? (
            <Empty icon="traffic" title="Трафика пока нет">
              Подключите Android-устройство и выберите приложение — запросы появятся здесь сами.
              Либо направьте любой клиент на HTTP-прокси <code>{proxyAddr}</code> и установите сертификат Siphon.
              <span className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
                <button className="btn primary" onClick={() => setPage('android')}><Icon name="android" size={14} /> Перехват Android</button>
                <button className="btn" onClick={() => setPage('settings')}>Сертификат и прокси</button>
              </span>
            </Empty>
          ) : (
            <>
              <div className="thead">
                <span>Статус</span><span>Метод</span><span>Хост</span><span>Путь</span><span>Тип</span>
                <span style={{ textAlign: 'right' }}>Размер</span><span style={{ textAlign: 'right' }}>Время</span>
              </div>
              <div className="tbody" ref={scroller} onScroll={onScroll} tabIndex={0} style={{ outline: 'none' }}>
                {filtered.length === 0 ? (
                  <Empty icon="search" title="Ничего не найдено">Измените фильтр или сбросьте его.</Empty>
                ) : (
                  <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
                    {virt.getVirtualItems().map((v) => (
                      <Row key={filtered[v.index].id} e={filtered[v.index]} top={v.start}
                        selected={filtered[v.index].id === selectedId} onSelect={select} />
                    ))}
                  </div>
                )}
              </div>
              <div className="listfoot">
                <span>{filtered.length === all.length ? `${all.length} запросов` : `${filtered.length} из ${all.length}`}</span>
                {errors > 0 && <span style={{ color: 'var(--red)' }}>{errors} с ошибками</span>}
                {paused && <span style={{ color: 'var(--orange)' }}>● список заморожен</span>}
                <span className="spacer" />
                <span><span className="kbd">↑</span> <span className="kbd">↓</span> навигация · <span className="kbd">⌫</span> удалить</span>
              </div>
            </>
          )}
        </div>

        {selected && (
          <div className="detail-pane" style={{ width }}>
            <div className={'resizer' + (dragging ? ' drag' : '')} onMouseDown={startDrag} />
            <Detail e={selected} />
          </div>
        )}
      </div>
    </>
  );
}
