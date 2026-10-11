import { useState, type CSSProperties } from 'react';
import { readyGuests } from '../engine/selectors';
import { DanmakuLog } from './DanmakuLog';
import { DebugBar } from './DebugBar';
import { GiftPanel } from './GiftPanel';
import { MenuPanel } from './MenuPanel';
import { ResourceBar } from './ResourceBar';
import { Scene } from './Scene';
import { UpgradePanel } from './UpgradePanel';
import { useGame } from './useGame';

type View = 'operate' | 'manage';

export function App() {
  const game = useGame();
  // 切换页签只换显示内容，游戏照常运行
  const [view, setView] = useState<View>('operate');
  const readyCount = readyGuests(game.state).length;

  return (
    <div className="app" style={{ '--tick-ms': `${1000 / game.speed}ms` } as CSSProperties}>
      <ResourceBar state={game.state} />
      <DebugBar game={game} />
      <nav className="tabs">
        <button className={`tab ${view === 'operate' ? 'tab-on' : ''}`} onClick={() => setView('operate')}>
          🍜 经营
          {readyCount > 0 && <span className="tab-badge">待出餐 {readyCount}</span>}
        </button>
        <button className={`tab ${view === 'manage' ? 'tab-on' : ''}`} onClick={() => setView('manage')}>
          🔬 研发与升级
        </button>
        {game.notice && (
          <div key={game.notice.id} className={`notice ${game.notice.ok ? 'notice-ok' : 'notice-fail'}`}>
            {game.notice.message}
          </div>
        )}
      </nav>
      {view === 'operate' ? (
        <main className="layout">
          <div className="column">
            <Scene state={game.state} onServe={() => game.command('serve')} />
            <GiftPanel state={game.state} onCommand={game.command} />
          </div>
          <div className="column">
            <DanmakuLog state={game.state} onSend={game.danmaku} />
          </div>
        </main>
      ) : (
        <main className="layout">
          <div className="column">
            <MenuPanel state={game.state} onResearch={game.research} onToggle={game.toggleMenu} />
          </div>
          <div className="column">
            <UpgradePanel
              state={game.state}
              onUpgradeRestaurant={game.upgradeRestaurant}
              onUpgradeChef={game.upgradeChef}
            />
          </div>
        </main>
      )}
    </div>
  );
}
