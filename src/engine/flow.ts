import { LOG_LIMIT, MATERIAL_DROP_AMOUNT, PLATE_DROP_AMOUNT } from '../config/balance';
import { DISH_BY_ID } from '../config/dishes';
import { GUEST_TYPE_BY_ID, type GuestTypeConfig } from '../config/guests';
import { MATERIAL_KEYS, RESOURCE_KEYS, type Cost } from '../config/resources';
import { chance, pickOne, type Rng } from './rng';
import {
  dishChoicesFor,
  formatCost,
  freeQueueSlots,
  freeStoves,
  freeTables,
  getChef,
  getRestaurant,
  lowestFreeIndex,
  queuingGuests,
} from './selectors';
import type { GameState, Guest, LogKind } from './types';

/** tick 和玩家动作共用的状态变更。这里的函数都直接修改传入的 state。 */

export function addLog(state: GameState, kind: LogKind, text: string): void {
  state.log.push({ id: state.nextLogId++, tick: state.tick, kind, text });
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

export function gain(state: GameState, reward: Cost): void {
  for (const key of RESOURCE_KEYS) state[key] += reward[key] ?? 0;
}

export function spend(state: GameState, cost: Cost): void {
  for (const key of RESOURCE_KEYS) state[key] -= cost[key] ?? 0;
}

export function guestLabel(guest: Guest): string {
  const type = GUEST_TYPE_BY_ID[guest.typeId];
  return `${type.emoji}${type.name}#${guest.id}`;
}

function removeGuest(state: GameState, guest: Guest): void {
  state.guests = state.guests.filter((g) => g.id !== guest.id);
}

/**
 * 一位客人到店。排队位已满时离开并记容量流失。
 * 炸弹已经按空桌 + 空排队位算好人数，所以用 ignoreQueueCap 先全部进队，再立刻落座。
 */
export function arriveGuest(state: GameState, type: GuestTypeConfig, ignoreQueueCap = false): boolean {
  if (!ignoreQueueCap && freeQueueSlots(state) <= 0) {
    state.lost.capacity++;
    addLog(state, 'leave', `${type.emoji}${type.name} 到店，但排队位已满，离开了（容量流失）`);
    return false;
  }
  const guest: Guest = {
    id: state.nextGuestId++,
    typeId: type.id,
    phase: 'queuing',
    queueLeft: type.queuePatience,
    tableIndex: null,
    dishId: null,
    stoveIndex: null,
    cookTotal: 0,
    cookLeft: 0,
    wandCount: 0,
    readyLeft: 0,
    seq: 0,
  };
  state.guests.push(guest);
  state.todayGuests++;
  addLog(state, 'arrive', `${guestLabel(guest)} 到店排队`);
  return true;
}

/** 按到店顺序把排队客人安排到空桌并点单；无菜可点的客人立即离店 */
export function seatGuests(state: GameState, rng: Rng): void {
  const tables = getRestaurant(state).tables;
  for (const guest of queuingGuests(state)) {
    if (freeTables(state) <= 0) break;
    const type = GUEST_TYPE_BY_ID[guest.typeId];
    const choices = dishChoicesFor(state, type);
    if (choices.length === 0) {
      removeGuest(state, guest);
      state.lost.noDish++;
      addLog(state, 'leave', `${guestLabel(guest)} 落座后发现没有想吃的菜，离店了`);
      continue;
    }
    const dish = pickOne(rng, choices);
    const tableIndex = lowestFreeIndex(
      state.guests.map((g) => g.tableIndex),
      tables,
    );
    guest.phase = 'waitingStove';
    guest.tableIndex = tableIndex;
    guest.dishId = dish.id;
    guest.seq = state.nextSeq++;
    addLog(state, 'order', `${guestLabel(guest)} 落座 ${tableIndex + 1} 号桌，点了 ${dish.name}`);
  }
}

/** 等灶的订单按点单先后占用空灶眼 */
export function assignStoves(state: GameState): void {
  const stoves = getRestaurant(state).stoves;
  const waiting = state.guests.filter((g) => g.phase === 'waitingStove').sort((a, b) => a.seq - b.seq);
  for (const guest of waiting) {
    if (freeStoves(state) <= 0) break;
    const dish = DISH_BY_ID[guest.dishId!];
    guest.phase = 'cooking';
    guest.stoveIndex = lowestFreeIndex(
      state.guests.map((g) => g.stoveIndex),
      stoves,
    );
    guest.cookTotal = dish.cookSeconds / getChef(state).speed;
    guest.cookLeft = guest.cookTotal;
    guest.wandCount = 0;
  }
}

/** 烹饪完成：释放灶眼，进入待出餐并开始计等待时间 */
export function finishCooking(state: GameState, guest: Guest): void {
  const type = GUEST_TYPE_BY_ID[guest.typeId];
  guest.phase = 'ready';
  guest.stoveIndex = null;
  guest.cookLeft = 0;
  guest.readyLeft = type.readyPatience;
  guest.seq = state.nextSeq++;
  addLog(state, 'ready', `${DISH_BY_ID[guest.dishId!].name} 做好了，等待端给 ${guestLabel(guest)}`);
}

/** 出餐即结账：收款、掉落、释放桌位 */
export function checkout(state: GameState, guest: Guest, rng: Rng, how: string): void {
  const type = GUEST_TYPE_BY_ID[guest.typeId];
  const dish = DISH_BY_ID[guest.dishId!];
  const paid = Math.round(dish.price * (1 + type.payBonus));
  const drops: Cost = {};
  for (const key of MATERIAL_KEYS) {
    if (chance(rng, type.materialDropRate)) drops[key] = MATERIAL_DROP_AMOUNT;
  }
  if (chance(rng, type.plateDropRate)) drops.plate = PLATE_DROP_AMOUNT;

  gain(state, { ...drops, cash: paid });
  state.todayRevenue += paid;
  state.served++;
  removeGuest(state, guest);

  const dropText = formatCost(drops, '、');
  addLog(
    state,
    'pay',
    `${how}：${dish.name} 端给 ${guestLabel(guest)}，结账 +${paid} 现金${dropText ? `，掉落 ${dropText}` : ''}`,
  );
}

export function leaveQueue(state: GameState, guest: Guest): void {
  removeGuest(state, guest);
  state.lost.queue++;
  addLog(state, 'leave', `${guestLabel(guest)} 排队太久，离开了`);
}

export function leaveUnserved(state: GameState, guest: Guest): void {
  removeGuest(state, guest);
  state.lost.ready++;
  addLog(state, 'leave', `${guestLabel(guest)} 等不到上菜，离开了，${DISH_BY_ID[guest.dishId!].name} 作废`);
}

/** 激活一道菜；菜单位有空时自动上架 */
export function activateDish(state: GameState, dishId: string): boolean {
  state.activeDishes.push(dishId);
  if (state.menu.length < getRestaurant(state).menuSlots) {
    state.menu.push(dishId);
    return true;
  }
  return false;
}
