import { DAY_TICKS } from '../config/balance';
import { RESOURCE_ICON, RESOURCE_KEYS, RESOURCE_LABEL } from '../config/resources';
import { flowPerMinute, getChef, getRestaurant } from '../engine/selectors';
import type { GameState } from '../engine/types';

export function ResourceBar({ state }: { state: GameState }) {
  const restaurant = getRestaurant(state);
  const chef = getChef(state);
  return (
    <header className="resource-bar">
      <div className="stat">
        <span className="stat-label">饭馆</span>
        <b>
          {restaurant.emoji} Lv.{restaurant.level} {restaurant.name}
        </b>
      </div>
      <div className="stat">
        <span className="stat-label">厨师</span>
        <b>
          👨‍🍳 Lv.{chef.level} {chef.name}
        </b>
      </div>
      {RESOURCE_KEYS.map((key) => (
        <div className="stat" key={key}>
          <span className="stat-label">{RESOURCE_LABEL[key]}</span>
          <b>
            {RESOURCE_ICON[key]} {state[key]}
          </b>
        </div>
      ))}
      <div className="stat">
        <span className="stat-label">今日客流</span>
        <b>🚶 {state.todayGuests}</b>
      </div>
      <div className="stat">
        <span className="stat-label">今日营业额</span>
        <b>🧾 {state.todayRevenue}</b>
      </div>
      <div className="stat">
        <span className="stat-label">
          第 {state.day} 天 · 剩 {DAY_TICKS - state.dayTick} 秒
        </span>
        <b>客流 {flowPerMinute(state).toFixed(1)} 人/分</b>
      </div>
    </header>
  );
}
