import { chefUpgradeView, restaurantUpgradeView, type UpgradeView } from '../engine/selectors';
import type { GameState } from '../engine/types';

function UpgradeCard({ title, view, onUpgrade }: { title: string; view: UpgradeView; onUpgrade: () => void }) {
  return (
    <div className="upgrade">
      <div className="upgrade-title">
        {title}：{view.currentName}
        {view.nextName && <span> → {view.nextName}</span>}
      </div>
      {view.nextName ? (
        <>
          <ul className="upgrade-changes">
            {view.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
          <button className="btn btn-primary" disabled={view.blockers.length > 0} onClick={onUpgrade}>
            升级 · 消耗 {view.costText}
          </button>
          {view.blockers.length > 0 && <div className="blockers">未满足：{view.blockers.join('，')}</div>}
        </>
      ) : (
        <div className="slot-text">已满级</div>
      )}
    </div>
  );
}

interface Props {
  state: GameState;
  onUpgradeRestaurant: () => void;
  onUpgradeChef: () => void;
}

export function UpgradePanel({ state, onUpgradeRestaurant, onUpgradeChef }: Props) {
  return (
    <section className="panel">
      <h2>升级面板</h2>
      <UpgradeCard title="饭馆" view={restaurantUpgradeView(state)} onUpgrade={onUpgradeRestaurant} />
      <UpgradeCard title="厨师" view={chefUpgradeView(state)} onUpgrade={onUpgradeChef} />
    </section>
  );
}
