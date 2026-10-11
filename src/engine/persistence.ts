import { DAY_TICKS } from '../config/balance';
import { MAX_CHEF_LEVEL } from '../config/chef';
import { DISH_BY_ID } from '../config/dishes';
import { DONUT, MIRROR, BOMB, PILL } from '../config/gifts';
import { MAX_RESTAURANT_LEVEL, RESTAURANT_LEVELS } from '../config/restaurant';
import { createInitialState } from './state';
import type { GameState, GiftState } from './types';

export const SAVE_KEY = 'bwcg.save';
export const SAVE_VERSION = 1;

/** 只存成长数据；在场客人、订单和日志刷新后重建 */
export interface SaveData {
  version: number;
  cash: number;
  red: number;
  green: number;
  blue: number;
  plate: number;
  restaurantLevel: number;
  chefLevel: number;
  activeDishes: string[];
  menu: string[];
  pillPity: number;
  day: number;
  dayTick: number;
  todayGuests: number;
  todayRevenue: number;
  gifts: GiftState;
}

export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function toSave(state: GameState): SaveData {
  return {
    version: SAVE_VERSION,
    cash: state.cash,
    red: state.red,
    green: state.green,
    blue: state.blue,
    plate: state.plate,
    restaurantLevel: state.restaurantLevel,
    chefLevel: state.chefLevel,
    activeDishes: [...state.activeDishes],
    menu: [...state.menu],
    pillPity: state.pillPity,
    day: state.day,
    dayTick: state.dayTick,
    todayGuests: state.todayGuests,
    todayRevenue: state.todayRevenue,
    gifts: { ...state.gifts },
  };
}

function num(value: unknown, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function dishIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id in DISH_BY_ID))];
}

/** 把存档合并进一份全新的状态；字段缺失或非法时回退到初始值，保证不会读出负数或越界等级 */
export function fromSave(raw: unknown): GameState {
  const state = createInitialState();
  if (typeof raw !== 'object' || raw === null) return state;
  const data = raw as Partial<SaveData>;
  if (data.version !== SAVE_VERSION) return state;

  state.cash = num(data.cash, 0, 0);
  state.red = num(data.red, 0, 0);
  state.green = num(data.green, 0, 0);
  state.blue = num(data.blue, 0, 0);
  state.plate = num(data.plate, 0, 0);
  state.restaurantLevel = Math.floor(num(data.restaurantLevel, 1, 1, MAX_RESTAURANT_LEVEL));
  state.chefLevel = Math.floor(num(data.chefLevel, 1, 1, MAX_CHEF_LEVEL));

  const active = dishIds(data.activeDishes);
  // 初始菜永远是已激活的
  state.activeDishes = [...new Set([...state.activeDishes, ...active])];
  const slots = RESTAURANT_LEVELS[state.restaurantLevel - 1].menuSlots;
  state.menu = Array.isArray(data.menu)
    ? dishIds(data.menu)
        .filter((id) => state.activeDishes.includes(id))
        .slice(0, slots)
    : state.menu;

  state.pillPity = Math.floor(num(data.pillPity, 0, 0, PILL.pityDraws - 1));
  state.day = Math.floor(num(data.day, 1, 1));
  state.dayTick = Math.floor(num(data.dayTick, 0, 0, DAY_TICKS - 1));
  state.todayGuests = num(data.todayGuests, 0, 0);
  state.todayRevenue = num(data.todayRevenue, 0, 0);

  const gifts: Partial<GiftState> = typeof data.gifts === 'object' && data.gifts !== null ? data.gifts : {};
  state.gifts.mirrorLeft = num(gifts.mirrorLeft, 0, 0, MIRROR.durationSeconds);
  state.gifts.mirrorStacks = state.gifts.mirrorLeft > 0 ? Math.floor(num(gifts.mirrorStacks, 0, 0, MIRROR.maxStacks)) : 0;
  if (state.gifts.mirrorStacks === 0) state.gifts.mirrorLeft = 0;
  state.gifts.donutLeft = num(gifts.donutLeft, 0, 0, DONUT.maxSeconds);
  state.gifts.bombCooldown = num(gifts.bombCooldown, 0, 0, BOMB.cooldownSeconds);
  return state;
}

export function saveGame(state: GameState, storage: SaveStorage): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(toSave(state)));
  } catch {
    // 存储不可用（隐私模式、配额满）时游戏照常运行，只是不存档
  }
}

export function loadGame(storage: SaveStorage): GameState {
  try {
    const text = storage.getItem(SAVE_KEY);
    return text ? fromSave(JSON.parse(text)) : createInitialState();
  } catch {
    return createInitialState();
  }
}

export function clearSave(storage: SaveStorage): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // 同上
  }
}
