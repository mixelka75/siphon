import { useState } from 'react';
import { api, type AgentAsk } from '../api';
import { useAgent, useUI } from '../store';
import { Icon } from './ui';

// Просьба ИИ-агента («войдите в аккаунт и нажмите Готово»). Агент ждёт ответа
// вызовом wait_for_user и продолжает работу, когда пользователь нажмёт «Готово».
export function AgentBanner() {
  const asks = useAgent((s) => s.asks);
  if (!asks.length) return null;
  return <AskCard key={asks[0].id} ask={asks[0]} more={asks.length - 1} />;
}

function AskCard({ ask, more }: { ask: AgentAsk; more: number }) {
  const showToast = useUI((s) => s.showToast);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const answer = async (cancel: boolean) => {
    setBusy(true);
    try {
      await api.answerAsk(ask.id, reply, cancel);
    } catch (e) {
      showToast((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="agent-ask" role="alertdialog" aria-label="Просьба ИИ-агента">
      <div className="agent-ask-head">
        <Icon name="bolt" size={13} /> ИИ-агент ждёт вас
        {more > 0 && <span className="faint">· ещё {more}</span>}
      </div>
      <div className="agent-ask-msg">{ask.message}</div>
      <div className="row">
        <input className="input grow" placeholder="Комментарий для агента (необязательно)" value={reply}
          onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && answer(false)} />
        <button className="btn primary" disabled={busy} onClick={() => answer(false)}>Готово</button>
        <button className="btn" disabled={busy} title="Агент получит отказ и спросит в чате, что делать"
          onClick={() => answer(true)}>Отмена</button>
      </div>
    </div>
  );
}
