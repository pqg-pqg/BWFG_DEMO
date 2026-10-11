import { DAY_TICKS, TICK_SECONDS } from '../config/balance';
import {
  addLog,
  arriveGuest,
  assignStoves,
  checkout,
  finishCooking,
  leaveQueue,
  leaveUnserved,
  seatGuests,
} from './flow';
import { pickWeighted, type Rng } from './rng';
import { arrivalPool, flowPerMinute, readyGuests } from './selectors';
import type { GameState } from './types';

const EPSILON = 1e-9;

/**
 * 推进一个 Tick（1 游戏秒）。这是唯一让时间流逝的入口：
 * 所有剩余时间、冷却和持续效果都在这里按固定顺序结算，UI 不自己计时。
 */
export function tick(state: GameState, rng: Rng): void {
  state.tick++;

  // 1. 待出餐等待：先结算旧的，本 Tick 才做好的菜不会立刻被扣一秒
  for (const guest of readyGuests(state)) {
    guest.readyLeft -= TICK_SECONDS;
    if (guest.readyLeft <= EPSILON) leaveUnserved(state, guest);
  }

  // 2. 烹饪推进，做好的释放灶眼进入待出餐
  for (const guest of state.guests) {
    if (guest.phase !== 'cooking') continue;
    guest.cookLeft -= TICK_SECONDS;
    if (guest.cookLeft <= EPSILON) finishCooking(state, guest);
  }

  // 3. 甜甜圈生效期间自动出餐
  if (state.gifts.donutLeft > 0) autoServe(state, rng);

  // 4. 排队耐心：前面腾出的空桌先让队首落座，再给还在排队的人扣耐心
  seatGuests(state, rng);
  for (const guest of state.guests.filter((g) => g.phase === 'queuing')) {
    guest.queueLeft -= TICK_SECONDS;
    if (guest.queueLeft <= EPSILON) leaveQueue(state, guest);
  }

  // 5. 新客人到访
  state.spawnProgress += (flowPerMinute(state) / 60) * TICK_SECONDS;
  while (state.spawnProgress >= 1 - EPSILON) {
    state.spawnProgress -= 1;
    const entry = pickWeighted(rng, arrivalPool(state), (e) => e.weight);
    arriveGuest(state, entry.type);
  }

  // 6. 落座点单，7. 分配灶眼
  seatGuests(state, rng);
  assignStoves(state);

  // 8. 礼物计时：放在最后，保证本 Tick 内效果完整生效
  tickGifts(state);

  // 9. 一天结束，清零今日统计
  state.dayTick++;
  if (state.dayTick >= DAY_TICKS) {
    addLog(state, 'system', `第 ${state.day} 天打烊：客流 ${state.todayGuests} 人，营业额 ${state.todayRevenue}`);
    state.day++;
    state.dayTick = 0;
    state.todayGuests = 0;
    state.todayRevenue = 0;
  }
}

/** 把所有待出餐的菜端给客人 */
export function autoServe(state: GameState, rng: Rng): void {
  for (const guest of readyGuests(state)) checkout(state, guest, rng, '🍩自动出餐');
}

function tickGifts(state: GameState): void {
  const gifts = state.gifts;
  if (gifts.mirrorLeft > 0) {
    gifts.mirrorLeft -= TICK_SECONDS;
    if (gifts.mirrorLeft <= 0) {
      gifts.mirrorLeft = 0;
      gifts.mirrorStacks = 0;
      addLog(state, 'gift', '🪞魔法镜效果结束，客流恢复正常');
    }
  }
  if (gifts.donutLeft > 0) {
    gifts.donutLeft = Math.max(0, gifts.donutLeft - TICK_SECONDS);
    if (gifts.donutLeft === 0) addLog(state, 'gift', '🍩甜甜圈效果结束，恢复手动出餐');
  }
  if (gifts.bombCooldown > 0) gifts.bombCooldown = Math.max(0, gifts.bombCooldown - TICK_SECONDS);
}
