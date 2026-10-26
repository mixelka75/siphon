import { useEffect, useState } from 'react';
import { api, type Rule } from '../api';
import { Icon, Toggle } from '../components/ui';
import { useUI } from '../store';

const EXAMPLE = (): Rule => ({
  enabled: true, name: 'Новое правило',
  match: {},
});

function headersToText(h?: { name: string; value: string }[]): string {
  return (h ?? []).map((x) => `${x.name}: ${x.value}`).join('\n');
}

function parseHeaderList(text: string): { name: string; value: string }[] | string {
  const out: { name: string; value: string }[] = [];
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    const i = l.indexOf(':');
    if (i < 1) return `строка «${l}» — ожидается «Имя: значение»`;
    out.push({ name: l.slice(0, i).trim(), value: l.slice(i + 1).trim() });
  }
  return out;
}

type Action = 'mock' | 'redirect' | 'modify' | 'break' | 'block' | 'delay' | 'close';

function actionOf(r: Rule): Action {
  if (r.mock) return 'mock';
  if (r.redirectTo !== undefined) return 'redirect';
  if (r.breakRequest || r.breakResponse) return 'break';
  if (r.block) return 'block';
  if (r.delayMs) return 'delay';
  if (r.request || r.response) return 'modify';
  return 'close';
}

const ACTION_LABEL: Record<Action, string> = {
  mock: 'Заглушить ответ',
  redirect: 'Перенаправить',
  modify: 'Изменить запрос/ответ',
  break: 'Останавливать на breakpoint',
  block: 'Оборвать соединение',
  delay: 'Замедлить',
  close: 'Ничего не делать',
};

export function RulesPage() {
  const showToast = useUI((s) => s.showToast);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [sel, setSel] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Rule | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const ruleDraft = useUI((s) => s.ruleDraft);

  const load = () => api.getRules().then((r) => setRules(r ?? [])).catch((e) => showToast(e.message));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ruleDraft) { setDraft(ruleDraft); setSel('new'); useUI.setState({ ruleDraft: null }); }
  }, [ruleDraft]);

  const startNew = (base?: Rule) => {
    setDraft(base ? { ...base, id: undefined } : EXAMPLE());
    setSel('new');
  };

  const save = async () => {
    if (!draft || !rules) return;
    setSaveBusy(true);
    const next = sel === 'new' ? [...rules, draft] : rules.map((r) => (r.id === sel ? draft : r));
    try {
      const saved = await api.putRules(next);
      setRules(saved);
      setSel(saved[saved.length - 1]?.id ?? null);
      setDraft(null);
      showToast('Правила сохранены');
    } catch (e) {
      showToast((e as Error).message); // сервер вернёт, какое правило не прошло проверку
    }
    setSaveBusy(false);
  };

  const remove = async (id: string) => {
    if (!rules) return;
    try {
      setRules(await api.putRules(rules.filter((r) => r.id !== id)));
      if (sel === id) { setSel(null); setDraft(null); }
    } catch (e) { showToast((e as Error).message); }
  };

  const toggle = async (id: string) => {
    if (!rules) return;
    try {
      setRules(await api.putRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))));
    } catch (e) { showToast((e as Error).message); }
  };

  const move = async (index: number, direction: number) => {
    if (!rules || saveBusy) return;
    const next = [...rules];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setSaveBusy(true);
    try { setRules(await api.putRules(next)); } catch (e) { showToast((e as Error).message); }
    finally { setSaveBusy(false); }
  };

  const d = draft;
  const action = d ? actionOf(d) : 'close';
  const setAction = (a: Action) => {
    if (!d) return;
    const clean: Rule = { ...d, mock: undefined, redirectTo: undefined, block: undefined, delayMs: undefined, breakRequest: false, breakResponse: false, request: undefined, response: undefined };
    if (a === 'mock') clean.mock = { status: 200, body: '' };
    if (a === 'redirect') clean.redirectTo = '';
    if (a === 'break') clean.breakRequest = true;
    if (a === 'block') clean.block = 'reset';
    if (a === 'delay') clean.delayMs = 500;
    if (a === 'modify') clean.request = { setHeaders: [] };
    setDraft(clean);
  };

  return (
    <div className="page">
      <div className="page-pad">
        <h1>Правила</h1>
        <p className="lead">
          Запросы проверяются по списку сверху вниз — срабатывает первое подходящее правило.
          Фильтры: <code>host:api.example.com</code>, <code>path:/v1/*</code>, <code>method:post</code>, <code>src:com.app</code>.
        </p>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ padding: '8px 10px 8px 14px' }}>
            <strong style={{ flex: 1 }}>Список</strong>
            <button className="btn primary sm" onClick={() => startNew()}><Icon name="bolt" size={13} /> Создать правило</button>
          </div>
          {!rules && <div className="muted" style={{ padding: 12 }}>Загружаю…</div>}
          {rules?.length === 0 && <div className="muted" style={{ padding: 12 }}>Правил пока нет. Создайте первое или добавьте прямо из трафика (кнопка «Правило» в деталях запроса).</div>}
          {rules?.map((r, index) => (
            <div className={'app' + (r.id === sel ? ' sel' : '')} key={r.id}
              style={r.id === sel ? { boxShadow: '0 0 0 2px var(--accent)', borderRadius: 6 } : undefined}
              onClick={() => { setSel(r.id!); setDraft(r); }}>
              <span onClick={(e) => e.stopPropagation()}><Toggle on={r.enabled} onChange={() => toggle(r.id!)} /></span>
              <div className="grow">
                <div style={{ fontWeight: 550 }}>{r.name || 'без названия'}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>
                  {ACTION_LABEL[actionOf(r)]} · {r.match.host || r.match.path || r.match.url || 'все запросы'}
                </div>
              </div>
              <span className="tag">{r.mock ? 'мок' : r.breakRequest || r.breakResponse ? 'bp' : r.redirectTo ? '→' : r.block ? '✕' : r.delayMs ? `${r.delayMs}мс` : 'изм'}</span>
              <button className="btn ghost sm" title="Выше" disabled={saveBusy || index === 0} onClick={(e) => { e.stopPropagation(); void move(index, -1); }}>↑</button>
              <button className="btn ghost sm" title="Ниже" disabled={saveBusy || index === rules.length - 1} onClick={(e) => { e.stopPropagation(); void move(index, 1); }}>↓</button>
              <button className="btn ghost sm icon-only" title="Удалить" onClick={(e) => { e.stopPropagation(); remove(r.id!); }}><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </div>

        {d && (
          <div className="card pad">
            <div className="row" style={{ marginBottom: 12 }}>
              <input className="input" style={{ fontWeight: 600 }} value={d.name} onChange={(e) => setDraft({ ...d, name: e.target.value })} placeholder="Название" />
              <Toggle on={d.enabled} onChange={(v) => setDraft({ ...d, enabled: v })} />
              <span className="muted">{d.enabled ? 'включено' : 'выключено'}</span>
              <span className="spacer" />
              <button className="btn primary" disabled={saveBusy} onClick={save}>Сохранить</button>
              <button className="btn ghost" onClick={() => { setSel(null); setDraft(null); }}>Отмена</button>
            </div>

            <div className="sub-title">Когда срабатывает</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <input className="input mono" style={{ width: 110 }} placeholder="METHOD" value={d.match.method ?? ''} onChange={(e) => setDraft({ ...d, match: { ...d.match, method: e.target.value.toUpperCase() || undefined } })} />
              <input className="input mono" style={{ width: 200 }} placeholder="host: *.example.com" value={d.match.host ?? ''} onChange={(e) => setDraft({ ...d, match: { ...d.match, host: e.target.value || undefined } })} />
              <input className="input mono" style={{ width: 220 }} placeholder="path: /api/*" value={d.match.path ?? ''} onChange={(e) => setDraft({ ...d, match: { ...d.match, path: e.target.value || undefined } })} />
              <input className="input mono" style={{ width: 160 }} placeholder="src: com.app" value={d.match.source ?? ''} onChange={(e) => setDraft({ ...d, match: { ...d.match, source: e.target.value || undefined } })} />
            </div>

            <div className="sub-title">Что делать</div>
            <select className="input" style={{ maxWidth: 300, marginBottom: 10 }} value={action} onChange={(e) => setAction(e.target.value as Action)}>
              {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            {action === 'mock' && d.mock && (
              <>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="muted">Статус</span>
                  <input className="input mono" style={{ width: 90 }} value={d.mock.status ?? 200} onChange={(e) => setDraft({ ...d, mock: { ...d.mock, status: Number(e.target.value) || 200 } })} />
                </div>
                <textarea className="input mono" style={{ minHeight: 100 }} value={d.mock.body ?? ''} onChange={(e) => setDraft({ ...d, mock: { ...d.mock, body: e.target.value } })} placeholder='{"mocked": true}' />
              </>
            )}

            {action === 'redirect' && (
              <input className="input mono" placeholder="https://staging.example.com" value={d.redirectTo ?? ''} onChange={(e) => setDraft({ ...d, redirectTo: e.target.value })} />
            )}

            {action === 'break' && (
              <div className="row" style={{ gap: 18 }}>
                <label className="row" style={{ gap: 8 }}><Toggle on={!!d.breakRequest} onChange={(v) => setDraft({ ...d, breakRequest: v, breakResponse: v ? false : d.breakResponse })} /> перед отправкой запроса</label>
                <label className="row" style={{ gap: 8 }}><Toggle on={!!d.breakResponse} onChange={(v) => setDraft({ ...d, breakResponse: v, breakRequest: v ? false : d.breakRequest })} /> перед отдачей ответа</label>
              </div>
            )}

            {action === 'delay' && (
              <div className="row">
                <span className="muted">Задержка, мс</span>
                <input className="input mono" style={{ width: 120 }} value={d.delayMs ?? 0} onChange={(e) => setDraft({ ...d, delayMs: Number(e.target.value) || 0 })} />
              </div>
            )}

            {action === 'modify' && (
              <ModifyEditor key={d.id ?? 'new'} rule={d} setDraft={setDraft} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ModifyEditor({ rule, setDraft }: { rule: Rule; setDraft: (r: Rule) => void }) {
  const [reqHdr, setReqHdr] = useState(headersToText(rule.request?.setHeaders));
  const [respHdr, setRespHdr] = useState(headersToText(rule.response?.setHeaders));
  const [reqBody, setReqBody] = useState(rule.request?.setBody ?? '');
  const [respBody, setRespBody] = useState(rule.response?.setBody ?? '');

  const upd = (side: 'request' | 'response', patch: object) => setDraft({ ...rule, [side]: { ...rule[side], ...patch } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div className="sub-title">Заголовки запроса — установить (по одному в строке «Имя: значение»)</div>
        <textarea className="input mono" style={{ minHeight: 70 }} spellCheck={false} value={reqHdr}
          onChange={(e) => { setReqHdr(e.target.value); const h = parseHeaderList(e.target.value); if (typeof h !== 'string') upd('request', { setHeaders: h }); }} />
        <div className="row" style={{ marginTop: 6 }}>
          <span className="muted">Удалить заголовки</span>
          <input className="input mono" placeholder="X-Old-1, X-Old-2" value={(rule.request?.removeHeaders ?? []).join(', ')}
            onChange={(e) => upd('request', { removeHeaders: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
        </div>
        <div className="sub-title" style={{ marginTop: 8 }}>Тело запроса — заменить на</div>
        <textarea className="input mono" style={{ minHeight: 60 }} value={reqBody} onChange={(e) => { setReqBody(e.target.value); upd('request', { setBody: e.target.value }); }} />
      </div>
      <div>
        <div className="sub-title">Заголовки ответа — установить</div>
        <textarea className="input mono" style={{ minHeight: 70 }} spellCheck={false} value={respHdr}
          onChange={(e) => { setRespHdr(e.target.value); const h = parseHeaderList(e.target.value); if (typeof h !== 'string') upd('response', { setHeaders: h }); }} />
        <div className="sub-title" style={{ marginTop: 8 }}>Тело ответа — заменить на</div>
        <textarea className="input mono" style={{ minHeight: 60 }} value={respBody} onChange={(e) => { setRespBody(e.target.value); upd('response', { setBody: e.target.value }); }} />
      </div>
      <div className="row" style={{ gap: 18 }}>
        <span className="muted">Замены в распакованном теле:</span>
        <input className="input mono" placeholder="найти" value={rule.response?.replace?.[0]?.find ?? ''}
          onChange={(e) => upd('response', { replace: [{ find: e.target.value, with: rule.response?.replace?.[0]?.with ?? '' }] })} />
        <span className="muted">→</span>
        <input className="input mono" placeholder="заменить" value={rule.response?.replace?.[0]?.with ?? ''}
          onChange={(e) => upd('response', { replace: [{ find: rule.response?.replace?.[0]?.find ?? '', with: e.target.value }] })} />
      </div>
    </div>
  );
}
