import { DISH_BY_ID } from '../config/dishes';
import { BOMB, DANMAKU_COMMANDS, DONUT, MIRROR, PILL, TEST_GIFT, WAND, type CommandId } from '../config/gifts';
import { activateDish, addLog, arriveGuest, assignStoves, checkout, gain, seatGuests, spend } from './flow';
import { pickOne, pickWeighted, type Rng } from './rng';
import {
  arrivalPool,
  chefUpgradeBlockers,
  cookingGuests,
  formatCost,
  freeQueueSlots,
  freeTables,
  getChef,
  getRestaurant,
  isActive,
  isListed,
  nextChef,
  nextRestaurant,
  orderableDishes,
  readyGuests,
  researchBlockers,
  restaurantUpgradeBlockers,
  topServableGuestTypes,
  unlockableDishes,
} from './selectors';
import { autoServe } from './tick';
import type { ActionResult, GameState } from './types';

/**
 * 玩家动作。每个动作先校验门槛，不满足时不改任何状态并返回原因；
 * 礼物只能在既有规则内加速或加量，不绕过厨师、菜品、座位和容量限制。
 */

function ok(state: GameState, kind: 'gift' | 'lottery' | 'system', message: string): ActionResult {
  addLog(state, kind, message);
  return { ok: true, message };
}

function fail(state: GameState, message: string): ActionResult {
  addLog(state, 'system', `⚠️ ${message}`);
  return { ok: false, message };
}

// ---------- 出餐 ----------

/** 手动出餐：把最早做好的一道菜端给对应客人，并立刻让下一位落座 */
export function serve(state: GameState, rng: Rng): ActionResult {
  const guest = readyGuests(state)[0];
  if (!guest) return fail(state, '出餐无效：现在没有待出餐的菜');
  const dishName = DISH_BY_ID[guest.dishId!].name;
  checkout(state, guest, rng, '手动出餐');
  seatGuests(state, rng);
  assignStoves(state);
  return { ok: true, message: `已出餐：${dishName}` };
}

// ---------- 礼物 ----------

export function useWand(state: GameState): ActionResult {
  const cooking = cookingGuests(state);
  if (cooking.length === 0) return fail(state, `${WAND.name}未生效：没有烹饪中的订单`);
  const targets = cooking.filter((g) => g.wandCount < WAND.maxSticksPerOrder);
  if (targets.length === 0) {
    return fail(state, `${WAND.name}未生效：烹饪中的订单都已吃满 ${WAND.maxSticksPerOrder} 根`);
  }
  for (const guest of targets) {
    guest.wandCount++;
    guest.cookLeft = Math.max(0, guest.cookLeft - guest.cookTotal * WAND.reducePerStick);
  }
  return ok(state, 'gift', `${WAND.emoji}${WAND.name}：${targets.length} 道烹饪中的菜各加速 ${WAND.reducePerStick * 100}%`);
}

export function usePill(state: GameState, rng: Rng): ActionResult {
  state.pillPity++;
  const pity = state.pillPity >= PILL.pityDraws;
  const entry = pity ? PILL.table.find((e) => e.newDish)! : pickWeighted(rng, PILL.table, (e) => e.weight);

  if (!entry.newDish) {
    gain(state, entry.reward!);
    return ok(state, 'lottery', `${PILL.emoji}${PILL.name}：抽到${entry.name}，获得 ${formatCost(entry.reward!, '、')}`);
  }

  state.pillPity = 0;
  const prefix = `${PILL.emoji}${PILL.name}${pity ? '（保底）' : ''}`;
  const candidates = unlockableDishes(state);
  if (candidates.length === 0) {
    gain(state, PILL.fallbackPack);
    return ok(state, 'lottery', `${prefix}：抽到新菜品，但没有可激活的新菜，转为 ${formatCost(PILL.fallbackPack, '、')}`);
  }
  const dish = pickOne(rng, candidates);
  const listed = activateDish(state, dish.id);
  return ok(state, 'lottery', `${prefix}：激活新菜 ${dish.name}${listed ? '，已自动上架' : '，菜单位已满，请手动上架'}`);
}

export function useMirror(state: GameState): ActionResult {
  const gifts = state.gifts;
  const capped = gifts.mirrorStacks >= MIRROR.maxStacks;
  gifts.mirrorStacks = Math.min(MIRROR.maxStacks, gifts.mirrorStacks + 1);
  gifts.mirrorLeft = MIRROR.durationSeconds;
  const multiplier = MIRROR.flowMultiplier[gifts.mirrorStacks - 1];
  return ok(
    state,
    'gift',
    `${MIRROR.emoji}${MIRROR.name}：${capped ? '已达上限，刷新持续时间，' : ''}${gifts.mirrorStacks} 层，客流 ×${multiplier}，持续 ${MIRROR.durationSeconds} 秒`,
  );
}

export function useDonut(state: GameState, rng: Rng): ActionResult {
  const gifts = state.gifts;
  if (gifts.donutLeft >= DONUT.maxSeconds) {
    return fail(state, `${DONUT.name}未生效：自动出餐时间已达 ${DONUT.maxSeconds} 秒上限`);
  }
  gifts.donutLeft = Math.min(DONUT.maxSeconds, gifts.donutLeft + DONUT.secondsPerDonut);
  const result = ok(state, 'gift', `${DONUT.emoji}${DONUT.name}：自动出餐剩余 ${Math.ceil(gifts.donutLeft)} 秒`);
  autoServe(state, rng);
  seatGuests(state, rng);
  assignStoves(state);
  return result;
}

export function useBomb(state: GameState, rng: Rng): ActionResult {
  const gifts = state.gifts;
  if (gifts.bombCooldown > 0) {
    return fail(state, `${BOMB.name}未生效：冷却中，还需 ${Math.ceil(gifts.bombCooldown)} 秒`);
  }
  const emptySlots = freeTables(state) + freeQueueSlots(state);
  if (emptySlots < BOMB.minEmptySlots) {
    return fail(state, `${BOMB.name}未生效：空桌和空排队位合计不足 ${BOMB.minEmptySlots} 个`);
  }
  if (orderableDishes(state).length === 0) return fail(state, `${BOMB.name}未生效：菜单上没有可做的菜`);

  const count = Math.min(BOMB.baseGuests + state.restaurantLevel, emptySlots);
  const topTypes = topServableGuestTypes(state);
  const topCount = topTypes.length > 0 ? Math.floor(count * BOMB.topGuestRatio) : 0;
  for (let i = 0; i < count; i++) {
    const type = i < topCount ? pickOne(rng, topTypes) : pickWeighted(rng, arrivalPool(state), (e) => e.weight).type;
    arriveGuest(state, type, true);
  }
  gifts.bombCooldown = BOMB.cooldownSeconds;
  const result = ok(state, 'gift', `${BOMB.emoji}${BOMB.name}：招揽 ${count} 位客人，其中 ${topCount} 位为最高品级客人`);
  seatGuests(state, rng);
  assignStoves(state);
  return result;
}

export function useTestGift(state: GameState): ActionResult {
  gain(state, TEST_GIFT.reward);
  return ok(state, 'gift', `${TEST_GIFT.emoji}${TEST_GIFT.name}：获得 ${formatCost(TEST_GIFT.reward, '、')}`);
}

// ---------- 菜单与研发 ----------

export function research(state: GameState, dishId: string): ActionResult {
  const dish = DISH_BY_ID[dishId];
  if (!dish) return fail(state, '研发失败：菜品不存在');
  const blockers = researchBlockers(state, dish);
  if (blockers.length > 0) return fail(state, `研发 ${dish.name} 失败：${blockers.join('，')}`);
  spend(state, dish.researchCost ?? {});
  const listed = activateDish(state, dish.id);
  return ok(state, 'system', `🔬研发成功：${dish.name}${listed ? '，已自动上架' : '，菜单位已满，请调整上架'}`);
}

export function toggleMenu(state: GameState, dishId: string): ActionResult {
  const dish = DISH_BY_ID[dishId];
  if (!dish || !isActive(state, dishId)) return fail(state, '上架失败：菜品尚未激活');
  if (isListed(state, dishId)) {
    state.menu = state.menu.filter((id) => id !== dishId);
    return ok(state, 'system', `📋下架：${dish.name}`);
  }
  const slots = getRestaurant(state).menuSlots;
  if (state.menu.length >= slots) return fail(state, `上架 ${dish.name} 失败：菜单位已满（${slots}），请先下架一道菜`);
  state.menu.push(dishId);
  return ok(state, 'system', `📋上架：${dish.name}`);
}

// ---------- 升级 ----------

export function upgradeRestaurant(state: GameState): ActionResult {
  const blockers = restaurantUpgradeBlockers(state);
  if (blockers.length > 0) return fail(state, `饭馆升级失败：${blockers.join('，')}`);
  const next = nextRestaurant(state)!;
  spend(state, next.upgradeCost ?? {});
  state.restaurantLevel = next.level;
  return ok(state, 'system', `🎉饭馆升级为 ${next.level} 级 ${next.name}`);
}

export function upgradeChef(state: GameState): ActionResult {
  const blockers = chefUpgradeBlockers(state);
  if (blockers.length > 0) return fail(state, `厨师升级失败：${blockers.join('，')}`);
  const next = nextChef(state)!;
  spend(state, next.upgradeCost ?? {});
  state.chefLevel = next.level;
  return ok(state, 'system', `🎉厨师升级为 ${getChef(state).level} 级 ${next.name}，烹饪速度 ×${next.speed}`);
}

// ---------- 模拟弹幕 ----------

export function runCommand(state: GameState, rng: Rng, command: CommandId): ActionResult {
  switch (command) {
    case 'serve':
      return serve(state, rng);
    case 'wand':
      return useWand(state);
    case 'pill':
      return usePill(state, rng);
    case 'mirror':
      return useMirror(state);
    case 'donut':
      return useDonut(state, rng);
    case 'bomb':
      return useBomb(state, rng);
    case 'test':
      return useTestGift(state);
  }
}

/** 弹幕整句匹配到指令关键词则执行，否则只当普通聊天记入日志 */
export function sendDanmaku(state: GameState, rng: Rng, text: string): ActionResult {
  const content = text.trim();
  if (!content) return { ok: false, message: '弹幕内容为空' };
  addLog(state, 'chat', `💬观众：${content}`);
  const command = DANMAKU_COMMANDS.find((c) => c.keywords.includes(content));
  if (!command) return { ok: true, message: '已发送弹幕' };
  return runCommand(state, rng, command.id);
}
