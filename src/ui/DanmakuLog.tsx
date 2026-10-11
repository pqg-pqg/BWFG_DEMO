import { useState, type FormEvent } from 'react';
import { DANMAKU_COMMANDS } from '../config/gifts';
import type { GameState } from '../engine/types';

const clock = (tick: number) => `${String(Math.floor(tick / 60)).padStart(2, '0')}:${String(tick % 60).padStart(2, '0')}`;

export function DanmakuLog({ state, onSend }: { state: GameState; onSend: (text: string) => void }) {
  const [text, setText] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <section className="panel panel-log">
      <h2>模拟弹幕区</h2>
      <form className="danmaku-form" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`输入弹幕，如：${DANMAKU_COMMANDS.map((c) => c.keywords[0]).join(' / ')}`}
        />
        <button className="btn btn-primary" type="submit">
          发送
        </button>
      </form>
      <ol className="log">
        {[...state.log].reverse().map((entry) => (
          <li key={entry.id} className={`log-${entry.kind}`}>
            <span className="log-time">{clock(entry.tick)}</span>
            {entry.text}
          </li>
        ))}
        {state.log.length === 0 && <li className="log-system">开门营业，等待第一位客人…</li>}
      </ol>
    </section>
  );
}
