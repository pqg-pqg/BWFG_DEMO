import { DISH_BY_ID } from '../config/dishes';
import { WAND } from '../config/gifts';
import { GUEST_TYPE_BY_ID } from '../config/guests';
import { getRestaurant, queuingGuests, readyGuests } from '../engine/selectors';
import type { GameState, Guest } from '../engine/types';

const seconds = (value: number) => `${Math.max(0, Math.ceil(value - 1e-9))}秒`;

function Bar({ ratio, tone }: { ratio: number; tone: 'patience' | 'cook' | 'ready' }) {
  return (
    <div className="bar">
      <div className={`bar-fill bar-${tone}`} style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }} />
    </div>
  );
}

function tableStatus(guest: Guest): string {
  const dish = DISH_BY_ID[guest.dishId!];
  if (guest.phase === 'waitingStove') return `点了${dish.name} · 等灶眼`;
  if (guest.phase === 'cooking') return `${dish.name} 烹饪中 ${seconds(guest.cookLeft)}`;
  return `${dish.name} 待出餐 ${seconds(guest.readyLeft)}`;
}

export function Scene({ state, onServe }: { state: GameState; onServe: () => void }) {
  const restaurant = getRestaurant(state);
  const queue = queuingGuests(state);
  const ready = readyGuests(state);
  const slots = (size: number) => Array.from({ length: size }, (_, i) => i);

  return (
    <section className="panel">
      <h2>主场景</h2>

      <h3>
        排队区 {queue.length}/{restaurant.queueSlots}
      </h3>
      <div className="slots">
        {slots(Math.max(restaurant.queueSlots, queue.length)).map((i) => {
          const guest = queue[i];
          if (!guest) return <div className="slot slot-empty" key={i}>空位</div>;
          const type = GUEST_TYPE_BY_ID[guest.typeId];
          return (
            <div className="slot" key={guest.id}>
              <div className="slot-title">
                {type.emoji} {type.name}
              </div>
              <div className="slot-text">耐心 {seconds(guest.queueLeft)}</div>
              <Bar ratio={guest.queueLeft / type.queuePatience} tone="patience" />
            </div>
          );
        })}
      </div>

      <h3>
        桌位 {state.guests.length - queue.length}/{restaurant.tables}
      </h3>
      <div className="slots">
        {slots(restaurant.tables).map((i) => {
          const guest = state.guests.find((g) => g.tableIndex === i);
          if (!guest) return <div className="slot slot-empty" key={i}>{i + 1} 号桌 · 空</div>;
          const type = GUEST_TYPE_BY_ID[guest.typeId];
          return (
            <div className={`slot slot-${guest.phase}`} key={i}>
              <div className="slot-title">
                {i + 1} 号桌 {type.emoji} {type.name}
              </div>
              <div className="slot-text">{tableStatus(guest)}</div>
            </div>
          );
        })}
      </div>

      <h3>灶眼</h3>
      <div className="slots">
        {slots(restaurant.stoves).map((i) => {
          const guest = state.guests.find((g) => g.stoveIndex === i);
          if (!guest) return <div className="slot slot-empty" key={i}>🔥 {i + 1} 号灶 · 空闲</div>;
          const dish = DISH_BY_ID[guest.dishId!];
          return (
            <div className="slot slot-cooking" key={i}>
              <div className="slot-title">
                🔥 {i + 1} 号灶 {dish.emoji} {dish.name}
              </div>
              <div className="slot-text">
                剩 {seconds(guest.cookLeft)} / {guest.cookTotal.toFixed(1)}秒
                {guest.wandCount > 0 && ` · ${WAND.emoji}×${guest.wandCount}`}
              </div>
              <Bar ratio={1 - guest.cookLeft / guest.cookTotal} tone="cook" />
            </div>
          );
        })}
      </div>

      <h3>
        待出餐区 {ready.length}
        <button className="btn btn-primary btn-inline" onClick={onServe}>
          🍽️ 出餐
        </button>
      </h3>
      <div className="slots">
        {ready.length === 0 && <div className="slot slot-empty">暂无待出餐的菜</div>}
        {ready.map((guest, index) => {
          const type = GUEST_TYPE_BY_ID[guest.typeId];
          const dish = DISH_BY_ID[guest.dishId!];
          return (
            <div className="slot slot-ready" key={guest.id}>
              <div className="slot-title">
                {dish.emoji} {dish.name} → {guest.tableIndex! + 1} 号桌
                {index === 0 && <span className="tag">下一道</span>}
              </div>
              <div className="slot-text">
                {type.emoji} {type.name} 还能等 {seconds(guest.readyLeft)}
              </div>
              <Bar ratio={guest.readyLeft / type.readyPatience} tone="ready" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
