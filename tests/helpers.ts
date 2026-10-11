import { DISH_BY_ID } from '../src/config/dishes';
import { GUEST_TYPE_BY_ID } from '../src/config/guests';
import type { Rng } from '../src/engine/rng';
import { getChef } from '../src/engine/selectors';
import { createInitialState } from '../src/engine/state';
import { tick } from '../src/engine/tick';
import type { GameState, Guest, GuestPhase } from '../src/engine/types';

/** 永远返回同一个值的随机数：0 表示所有概率判定都命中、加权抽取总是第一项 */
export const fixedRng = (value: number): Rng => ({ next: () => value });

/** 关掉自然到访的初始状态，测试里只出现自己放进去的客人 */
export function quietState(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), spawnProgress: -1e6, ...patch };
}

/** 直接往场上放一位处于指定阶段的客人 */
export function putGuest(
  state: GameState,
  typeId: string,
  phase: GuestPhase,
  patch: Partial<Guest> = {},
): Guest {
  const type = GUEST_TYPE_BY_ID[typeId];
  const dishId = patch.dishId ?? 'D0101';
  const cookTotal = DISH_BY_ID[dishId].cookSeconds / getChef(state).speed;
  const seated = phase !== 'queuing';
  const guest: Guest = {
    id: state.nextGuestId++,
    typeId,
    phase,
    queueLeft: type.queuePatience,
    tableIndex: seated ? state.guests.filter((g) => g.tableIndex !== null).length : null,
    dishId: seated ? dishId : null,
    stoveIndex: phase === 'cooking' ? state.guests.filter((g) => g.stoveIndex !== null).length : null,
    cookTotal: phase === 'cooking' ? cookTotal : 0,
    cookLeft: phase === 'cooking' ? cookTotal : 0,
    wandCount: 0,
    readyLeft: phase === 'ready' ? type.readyPatience : 0,
    seq: state.nextSeq++,
    ...patch,
  };
  state.guests.push(guest);
  return guest;
}

export function runTicks(state: GameState, rng: Rng, count: number): void {
  for (let i = 0; i < count; i++) tick(state, rng);
}

export function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}
