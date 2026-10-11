import { CHEF_LEVELS, MAX_CHEF_LEVEL, type ChefLevelConfig } from '../config/chef';
import { DISHES, DISH_BY_ID, type DishConfig } from '../config/dishes';
import { MIRROR } from '../config/gifts';
import { GUEST_TYPES, type GuestTypeConfig } from '../config/guests';
import { RESOURCE_KEYS, RESOURCE_SHORT, type Cost } from '../config/resources';
import { MAX_RESTAURANT_LEVEL, RESTAURANT_LEVELS, type RestaurantLevelConfig } from '../config/restaurant';
import type { GameState, Guest } from './types';

export const getRestaurant = (state: GameState): RestaurantLevelConfig => RESTAURANT_LEVELS[state.restaurantLevel - 1];
export const getChef = (state: GameState): ChefLevelConfig => CHEF_LEVELS[state.chefLevel - 1];

// ---------- 容量 ----------

export const queuingGuests = (state: GameState): Guest[] => state.guests.filter((g) => g.phase === 'queuing');
export const seatedGuests = (state: GameState): Guest[] => state.guests.filter((g) => g.phase !== 'queuing');
export const cookingGuests = (state: GameState): Guest[] => state.guests.filter((g) => g.phase === 'cooking');

/** 待出餐的客人，最早做好的排在最前 */
export const readyGuests = (state: GameState): Guest[] =>
  state.guests.filter((g) => g.phase === 'ready').sort((a, b) => a.seq - b.seq);

export const freeTables = (state: GameState): number => getRestaurant(state).tables - seatedGuests(state).length;
export const freeQueueSlots = (state: GameState): number => getRestaurant(state).queueSlots - queuingGuests(state).length;
export const freeStoves = (state: GameState): number => getRestaurant(state).stoves - cookingGuests(state).length;

export function lowestFreeIndex(used: (number | null)[], size: number): number {
  for (let i = 0; i < size; i++) if (!used.includes(i)) return i;
  return -1;
}

// ---------- 菜品 ----------

export const isActive = (state: GameState, dishId: string): boolean => state.activeDishes.includes(dishId);
export const isListed = (state: GameState, dishId: string): boolean => state.menu.includes(dishId);
export const canChefCook = (state: GameState, dish: DishConfig): boolean => dish.grade <= getChef(state).maxDishGrade;

/** 自动菜单：上架、已激活且当前厨师能做的菜 */
export function orderableDishes(state: GameState): DishConfig[] {
  return state.menu
    .map((id) => DISH_BY_ID[id])
    .filter((dish) => dish && isActive(state, dish.id) && canChefCook(state, dish));
}

/** 某类客人此刻会从哪些菜里随机点单；空数组表示无菜可点 */
export function dishChoicesFor(state: GameState, guestType: GuestTypeConfig): DishConfig[] {
  const acceptable = orderableDishes(state).filter((dish) => guestType.acceptGrades.includes(dish.grade));
  if (acceptable.length === 0 || guestType.preferGrade === undefined) return acceptable;
  const preferred = acceptable.filter((dish) => dish.grade === guestType.preferGrade);
  if (preferred.length > 0) return preferred;
  const topGrade = Math.max(...acceptable.map((dish) => dish.grade));
  return acceptable.filter((dish) => dish.grade === topGrade);
}

/** 药丸可抽到的新菜：未激活，且饭馆和厨师条件都满足 */
export function unlockableDishes(state: GameState): DishConfig[] {
  return DISHES.filter(
    (dish) => !isActive(state, dish.id) && dish.grade <= state.restaurantLevel && canChefCook(state, dish),
  );
}

// ---------- 客流 ----------

export function flowPerMinute(state: GameState): number {
  const base = getRestaurant(state).guestsPerMinute;
  const stacks = state.gifts.mirrorStacks;
  return stacks > 0 ? base * MIRROR.flowMultiplier[stacks - 1] : base;
}

/** 当前到访池及权重；魔法镜生效时池中最靠后的两类客人权重按层数放大 */
export function arrivalPool(state: GameState): { type: GuestTypeConfig; weight: number }[] {
  const pool = GUEST_TYPES.map((type) => ({ type, weight: type.arrivalWeight[state.restaurantLevel - 1] })).filter(
    (entry) => entry.weight > 0,
  );
  const stacks = state.gifts.mirrorStacks;
  if (stacks > 0) {
    const boost = Math.pow(MIRROR.topGuestWeightPerStack, stacks);
    for (const entry of pool.slice(-MIRROR.topGuestCount)) entry.weight *= boost;
  }
  return pool;
}

/** 炸弹保底用：到访池中有菜可点的最高品级客人类型 */
export function topServableGuestTypes(state: GameState): GuestTypeConfig[] {
  const servable = arrivalPool(state)
    .map((entry) => entry.type)
    .filter((type) => dishChoicesFor(state, type).length > 0);
  if (servable.length === 0) return [];
  const topGrade = Math.max(...servable.map((type) => type.grade));
  return servable.filter((type) => type.grade === topGrade);
}

// ---------- 资源 ----------

export function shortageOf(state: GameState, cost: Cost): Cost {
  const shortage: Cost = {};
  for (const key of RESOURCE_KEYS) {
    const lack = (cost[key] ?? 0) - state[key];
    if (lack > 0) shortage[key] = lack;
  }
  return shortage;
}

export function formatCost(cost: Cost, separator = ' '): string {
  return RESOURCE_KEYS.filter((key) => cost[key])
    .map((key) => `${cost[key]}${RESOURCE_SHORT[key]}`)
    .join(separator);
}

function shortageText(state: GameState, cost: Cost): string | null {
  const shortage = shortageOf(state, cost);
  return Object.keys(shortage).length > 0 ? `缺 ${formatCost(shortage, '、')}` : null;
}

// ---------- 研发与升级：动作和界面共用同一套判定 ----------

/** 返回不能研发的原因；空数组表示可以研发 */
export function researchBlockers(state: GameState, dish: DishConfig): string[] {
  if (isActive(state, dish.id)) return ['已激活'];
  const blockers: string[] = [];
  if (dish.grade > state.restaurantLevel) blockers.push(`需饭馆 ${dish.grade} 级`);
  const lack = shortageText(state, dish.researchCost ?? {});
  if (lack) blockers.push(lack);
  return blockers;
}

export function nextRestaurant(state: GameState): RestaurantLevelConfig | null {
  return state.restaurantLevel < MAX_RESTAURANT_LEVEL ? RESTAURANT_LEVELS[state.restaurantLevel] : null;
}

export function restaurantUpgradeBlockers(state: GameState): string[] {
  const next = nextRestaurant(state);
  if (!next) return ['已满级'];
  const lack = shortageText(state, next.upgradeCost ?? {});
  return lack ? [lack] : [];
}

export function nextChef(state: GameState): ChefLevelConfig | null {
  return state.chefLevel < MAX_CHEF_LEVEL ? CHEF_LEVELS[state.chefLevel] : null;
}

export function chefUpgradeBlockers(state: GameState): string[] {
  const next = nextChef(state);
  if (!next) return ['已满级'];
  const blockers: string[] = [];
  if (state.restaurantLevel < next.requireRestaurantLevel) blockers.push(`需饭馆 ${next.requireRestaurantLevel} 级`);
  const lack = shortageText(state, next.upgradeCost ?? {});
  if (lack) blockers.push(lack);
  return blockers;
}

export type DishStatus = 'listed' | 'unlisted' | 'researchable' | 'restaurantLocked';

export interface DishView {
  dish: DishConfig;
  status: DishStatus;
  /** 厨师等级不够：已激活也不会进入自动菜单 */
  chefLocked: boolean;
  costText: string;
  /** 未激活时不能研发的原因 */
  blockers: string[];
}

export function dishViews(state: GameState): DishView[] {
  return DISHES.map((dish) => {
    let status: DishStatus;
    if (isActive(state, dish.id)) status = isListed(state, dish.id) ? 'listed' : 'unlisted';
    else status = dish.grade > state.restaurantLevel ? 'restaurantLocked' : 'researchable';
    return {
      dish,
      status,
      chefLocked: !canChefCook(state, dish),
      costText: dish.researchCost ? formatCost(dish.researchCost) : '',
      blockers: isActive(state, dish.id) ? [] : researchBlockers(state, dish),
    };
  });
}

export interface UpgradeView {
  currentName: string;
  nextName: string | null;
  changes: string[];
  costText: string;
  blockers: string[];
}

export function restaurantUpgradeView(state: GameState): UpgradeView {
  const current = getRestaurant(state);
  const next = nextRestaurant(state);
  const changes = next
    ? [
        `桌位 ${current.tables}→${next.tables}`,
        `排队位 ${current.queueSlots}→${next.queueSlots}`,
        `灶眼 ${current.stoves}→${next.stoves}`,
        `菜单位 ${current.menuSlots}→${next.menuSlots}`,
        `客流 ${current.guestsPerMinute.toFixed(1)}→${next.guestsPerMinute.toFixed(1)} 人/分钟`,
        `解锁 ${next.level} 级菜品和厨师`,
      ]
    : [];
  return {
    currentName: `${current.level} 级 ${current.name}`,
    nextName: next ? `${next.level} 级 ${next.name}` : null,
    changes,
    costText: next?.upgradeCost ? formatCost(next.upgradeCost) : '',
    blockers: restaurantUpgradeBlockers(state),
  };
}

export function chefUpgradeView(state: GameState): UpgradeView {
  const current = getChef(state);
  const next = nextChef(state);
  const changes = next
    ? [`可做菜品 1-${next.maxDishGrade} 级`, `烹饪速度 ×${current.speed.toFixed(2)}→×${next.speed.toFixed(2)}`]
    : [];
  return {
    currentName: `${current.level} 级 ${current.name}`,
    nextName: next ? `${next.level} 级 ${next.name}` : null,
    changes,
    costText: next?.upgradeCost ? formatCost(next.upgradeCost) : '',
    blockers: chefUpgradeBlockers(state),
  };
}
