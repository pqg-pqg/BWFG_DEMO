import { SPEEDS } from '../config/balance';
import type { Game } from './useGame';

export function DebugBar({ game }: { game: Game }) {
  const { state, paused, speed } = game;
  const lost = state.lost;
  return (
    <div className="debug-bar">
      <span className="debug-label">调试</span>
      <button className={`btn ${paused ? 'btn-on' : ''}`} onClick={() => game.setPaused(!paused)}>
        {paused ? '▶ 继续' : '⏸ 暂停'}
      </button>
      {SPEEDS.map((value) => (
        <button
          key={value}
          className={`btn ${!paused && speed === value ? 'btn-on' : ''}`}
          onClick={() => {
            game.setSpeed(value);
            game.setPaused(false);
          }}
        >
          {value}倍速
        </button>
      ))}
      <span className="debug-text">
        已运行 {state.tick} 秒 · 已服务 {state.served} · 流失：容量 {lost.capacity} / 排队 {lost.queue} / 未出餐{' '}
        {lost.ready} / 无菜 {lost.noDish} · 种子 {game.seed}
      </span>
      <button
        className="btn btn-danger"
        onClick={() => {
          if (window.confirm('确定清空存档并从 1 级小摊重新开始吗？')) game.reset();
        }}
      >
        重置存档
      </button>
    </div>
  );
}
