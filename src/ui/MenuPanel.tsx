import { dishViews, getChef, getRestaurant, type DishView } from '../engine/selectors';
import type { GameState } from '../engine/types';

const STATUS_TEXT: Record<DishView['status'], string> = {
  listed: '已上架',
  unlisted: '已激活',
  researchable: '可研发',
  restaurantLocked: '未解锁',
};

interface Props {
  state: GameState;
  onResearch: (dishId: string) => void;
  onToggle: (dishId: string) => void;
}

export function MenuPanel({ state, onResearch, onToggle }: Props) {
  const restaurant = getRestaurant(state);
  const chef = getChef(state);
  return (
    <section className="panel">
      <h2>
        菜单与研发
        <span className="panel-note">
          上架 {state.menu.length}/{restaurant.menuSlots} · 厨师可做 1-{chef.maxDishGrade} 级
        </span>
      </h2>
      <table className="dishes">
        <thead>
          <tr>
            <th>菜品</th>
            <th>品级</th>
            <th>价格</th>
            <th>烹饪</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {dishViews(state).map(({ dish, status, chefLocked, costText, blockers }) => {
            const active = status === 'listed' || status === 'unlisted';
            return (
              <tr key={dish.id} className={`dish-${status}`}>
                <td>
                  {dish.emoji} {dish.name}
                </td>
                <td>{dish.grade} 级</td>
                <td>{dish.price}</td>
                <td>{(dish.cookSeconds / chef.speed).toFixed(1)}秒</td>
                <td>
                  <span className={`tag tag-${status}`}>{STATUS_TEXT[status]}</span>
                  {status === 'restaurantLocked' && <span className="tag tag-lock">🔒饭馆 {dish.grade} 级</span>}
                  {chefLocked && <span className="tag tag-lock">🔒厨师 {dish.grade} 级</span>}
                </td>
                <td>
                  {active ? (
                    <button className="btn" onClick={() => onToggle(dish.id)}>
                      {status === 'listed' ? '下架' : '上架'}
                    </button>
                  ) : (
                    <button className="btn btn-primary" disabled={blockers.length > 0} onClick={() => onResearch(dish.id)}>
                      研发 {costText}
                    </button>
                  )}
                  {!active && blockers.length > 0 && <div className="blockers">{blockers.join('，')}</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
