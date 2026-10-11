import { describe, expect, it } from 'vitest';
import { DAY_TICKS } from '../src/config/balance';
import { BOMB, DONUT, MIRROR, PILL, WAND } from '../src/config/gifts';
import { GUEST_TYPE_BY_ID, GUEST_TYPES } from '../src/config/guests';
import {
  research,
  sendDanmaku,
  serve,
  toggleMenu,
  upgradeChef,
  upgradeRestaurant,
  useBomb,
  useDonut,
  useMirror,
  usePill,
  useTestGift,
  useWand,
} from '../src/engine/actions';
import { arriveGuest, assignStoves, seatGuests } from '../src/engine/flow';
import { loadGame, saveGame, SAVE_KEY, toSave } from '../src/engine/persistence';
import { createRng } from '../src/engine/rng';
import { arrivalPool, flowPerMinute, freeStoves, getChef, getRestaurant, orderableDishes } from '../src/engine/selectors';
import { createInitialState } from '../src/engine/state';
import { tick } from '../src/engine/tick';
import type { GameState } from '../src/engine/types';
import { fixedRng, memoryStorage, putGuest, quietState, runTicks } from './helpers';

const student = GUEST_TYPE_BY_ID.student;

/** 1 级饭馆坐满：1 道菜占着唯一的灶眼且做不完，另外两桌一直等灶 */
function fullTables(state: GameState): void {
  putGuest(state, 'student', 'cooking', { cookTotal: 1e6, cookLeft: 1e6 });
  putGuest(state, 'student', 'waitingStove');
  putGuest(state, 'student', 'waitingStove');
}

describe('到访与排队（T01、T05）', () => {
  it('按客流间隔到达：1 级 2 人/分钟即每 30 秒一位', () => {
    const state = createInitialState();
    const rng = createRng(1);
    runTicks(state, rng, 2);
    expect(state.todayGuests).toBe(0);
    runTicks(state, rng, 1);
    expect(state.todayGuests).toBe(1);
    runTicks(state, rng, 29);
    expect(state.todayGuests).toBe(1);
    runTicks(state, rng, 1);
    expect(state.todayGuests).toBe(2);
  });

  it('排队位满时新客人离开并记容量流失', () => {
    const state = quietState();
    fullTables(state);
    for (let i = 0; i < getRestaurant(state).queueSlots; i++) putGuest(state, 'student', 'queuing');

    expect(arriveGuest(state, student)).toBe(false);
    expect(state.lost.capacity).toBe(1);
    expect(state.guests).toHaveLength(8);

    state.spawnProgress = 1;
    tick(state, fixedRng(0));
    expect(state.lost.capacity).toBe(2);
    expect(state.guests).toHaveLength(8);
  });

  it('排队超过自己的耐心后离开，不占桌位；已落座等灶的客人不会流失', () => {
    const state = quietState();
    fullTables(state);
    const queued = putGuest(state, 'student', 'queuing');

    runTicks(state, fixedRng(0), student.queuePatience - 1);
    expect(state.guests).toContain(queued);
    tick(state, fixedRng(0));
    expect(state.guests.some((g) => g.id === queued.id)).toBe(false);
    expect(state.lost.queue).toBe(1);
    expect(queued.tableIndex).toBeNull();
    expect(state.guests).toHaveLength(3);
  });
});

describe('点单与烹饪（T02、T08）', () => {
  it('只点上架、已激活且厨师能做的菜', () => {
    for (const roll of [0, 0.5, 0.99]) {
      const state = quietState({ restaurantLevel: 2, chefLevel: 1 });
      state.activeDishes.push('D0201');
      state.menu = ['D0201', 'D0101'];
      const guest = putGuest(state, 'office', 'queuing');
      seatGuests(state, fixedRng(roll));
      expect(guest.dishId).toBe('D0101');
    }
  });

  it('菜单上没有可接受的菜时落座后立即离店', () => {
    const state = quietState({ restaurantLevel: 3 });
    putGuest(state, 'boss', 'queuing');
    seatGuests(state, fixedRng(0));
    expect(state.guests).toHaveLength(0);
    expect(state.lost.noDish).toBe(1);
  });

  it('优先品级：有则必点，无则降级', () => {
    const state = quietState({ restaurantLevel: 2, chefLevel: 2 });
    state.activeDishes.push('D0201');
    state.menu = ['D0101', 'D0201'];
    const first = putGuest(state, 'blogger', 'queuing');
    seatGuests(state, fixedRng(0));
    expect(first.dishId).toBe('D0201');

    state.menu = ['D0101'];
    const second = putGuest(state, 'blogger', 'queuing');
    seatGuests(state, fixedRng(0));
    expect(second.dishId).toBe('D0101');
  });

  it('一个订单占一个灶眼，做好后释放给下一单', () => {
    const state = quietState();
    const first = putGuest(state, 'student', 'queuing');
    const second = putGuest(state, 'student', 'queuing');
    seatGuests(state, fixedRng(0));
    assignStoves(state);
    expect([first.phase, second.phase]).toEqual(['cooking', 'waitingStove']);
    expect(freeStoves(state)).toBe(0);
    expect(first.cookTotal).toBe(8);

    runTicks(state, fixedRng(0), 7);
    expect(first.phase).toBe('cooking');
    tick(state, fixedRng(0));
    expect([first.phase, second.phase]).toEqual(['ready', 'cooking']);
  });

  it('实际烹饪秒数 = 基础 ÷ 厨师倍率', () => {
    const state = quietState({ restaurantLevel: 2, chefLevel: 2 });
    const guest = putGuest(state, 'student', 'queuing');
    seatGuests(state, fixedRng(0));
    assignStoves(state);
    expect(guest.cookTotal).toBeCloseTo(8 / 1.25);
  });

  it('厨师等级不够时高级菜不进入自动菜单，升级后才能做', () => {
    const state = quietState({ restaurantLevel: 2, chefLevel: 1, cash: 200 });
    state.activeDishes.push('D0201');
    state.menu.push('D0201');
    expect(orderableDishes(state).map((d) => d.id)).not.toContain('D0201');
    expect(upgradeChef(state).ok).toBe(true);
    expect(orderableDishes(state).map((d) => d.id)).toContain('D0201');
  });
});

describe('出餐与结账（T03、T04）', () => {
  it('手动出餐后客人付款并掉落材料', () => {
    const state = quietState();
    putGuest(state, 'student', 'ready');
    expect(serve(state, fixedRng(0)).ok).toBe(true);
    expect(state.guests).toHaveLength(0);
    expect(state).toMatchObject({ cash: 8, red: 1, green: 1, blue: 1, plate: 1, todayRevenue: 8, served: 1 });
  });

  it('掉落未命中时只有现金；多付型客人按比例加价', () => {
    const state = quietState();
    putGuest(state, 'blogger', 'ready', { dishId: 'D0201' });
    serve(state, fixedRng(0.99));
    expect(state).toMatchObject({ cash: 22, red: 0, green: 0, blue: 0, plate: 0 });
  });

  it('出餐端的是最早做好的一道；输入弹幕“出餐”等同于点按钮', () => {
    const state = quietState();
    const late = putGuest(state, 'student', 'ready', { dishId: 'D0103' });
    const early = putGuest(state, 'student', 'ready', { dishId: 'D0101', seq: 0 });
    sendDanmaku(state, fixedRng(0.99), '出餐');
    expect(state.guests).toEqual([late]);
    expect(state.guests).not.toContain(early);
    expect(state.cash).toBe(8);
  });

  it('没有待出餐的菜时出餐无效', () => {
    const state = quietState();
    expect(serve(state, fixedRng(0)).ok).toBe(false);
    expect(state.cash).toBe(0);
  });

  it('菜好后不出餐：超过等待时间客人离开，无收入无掉落', () => {
    const state = quietState();
    putGuest(state, 'student', 'ready');
    runTicks(state, fixedRng(0), student.readyPatience - 1);
    expect(state.guests).toHaveLength(1);
    tick(state, fixedRng(0));
    expect(state.guests).toHaveLength(0);
    expect(state.lost.ready).toBe(1);
    expect(state).toMatchObject({ cash: 0, red: 0, green: 0, blue: 0, plate: 0 });
  });
});

describe('红色仙女棒（T09）', () => {
  it('每根减 20% 总时长，4 根封顶保留 20%', () => {
    const state = quietState();
    const guest = putGuest(state, 'student', 'cooking');
    for (let i = 0; i < WAND.maxSticksPerOrder; i++) expect(useWand(state).ok).toBe(true);
    expect(guest.cookLeft).toBeCloseTo(guest.cookTotal * 0.2);
    expect(useWand(state).ok).toBe(false);
    expect(guest.cookLeft).toBeCloseTo(guest.cookTotal * 0.2);
  });

  it('一根作用于所有烹饪中的菜；没有烹饪中订单时不生效', () => {
    const state = quietState({ restaurantLevel: 2 });
    expect(useWand(state).ok).toBe(false);
    const a = putGuest(state, 'student', 'cooking');
    const b = putGuest(state, 'student', 'cooking', { dishId: 'D0103' });
    useWand(state);
    expect(a.cookLeft).toBeCloseTo(8 * 0.8);
    expect(b.cookLeft).toBeCloseTo(10 * 0.8);
  });
});

describe('能量药丸（T10）', () => {
  it('奖励概率合计 100%', () => {
    expect(PILL.table.reduce((sum, entry) => sum + entry.weight, 0)).toBe(100);
  });

  it('连续 9 抽没出新菜，第 10 抽保底激活一道可研发的新菜', () => {
    const state = quietState();
    const rng = fixedRng(0); // 普通抽取永远落在第一项：红食材
    for (let i = 0; i < PILL.pityDraws - 1; i++) usePill(state, rng);
    expect(state.red).toBe(18);
    expect(state.activeDishes).not.toContain('D0104');
    usePill(state, rng);
    expect(state.activeDishes).toContain('D0104');
    expect(state.pillPity).toBe(0);
    expect(state.red).toBe(18);
  });

  it('没有可激活新菜时转为红绿蓝各 2；厨师不够的高级菜不算可激活', () => {
    const state = quietState({ restaurantLevel: 2, chefLevel: 1, pillPity: PILL.pityDraws - 1 });
    state.activeDishes.push('D0104');
    usePill(state, fixedRng(0));
    expect(state).toMatchObject({ red: 2, green: 2, blue: 2, pillPity: 0 });
    expect(state.activeDishes).toHaveLength(4);
  });
});

describe('魔法镜（T11）', () => {
  it('3 层封顶，客流倍率 1.5/2.0/2.5，持续结束后恢复', () => {
    const state = quietState();
    const base = getRestaurant(state).guestsPerMinute;
    MIRROR.flowMultiplier.forEach((multiplier) => {
      useMirror(state);
      expect(flowPerMinute(state)).toBeCloseTo(base * multiplier);
    });
    useMirror(state);
    expect(state.gifts).toMatchObject({ mirrorStacks: 3, mirrorLeft: MIRROR.durationSeconds });

    runTicks(state, fixedRng(0), MIRROR.durationSeconds - 1);
    expect(state.gifts.mirrorStacks).toBe(3);
    tick(state, fixedRng(0));
    expect(state.gifts.mirrorStacks).toBe(0);
    expect(flowPerMinute(state)).toBe(base);
  });

  it('到访池中最靠后的两类客人权重每层乘 1.5', () => {
    const state = quietState({ restaurantLevel: 2 });
    useMirror(state);
    useMirror(state);
    expect(arrivalPool(state).map((entry) => entry.weight)).toEqual([35, 30, 25 * 2.25, 10 * 2.25]);
  });

  it('各等级到访概率合计 100%', () => {
    for (const level of [0, 1, 2]) {
      expect(GUEST_TYPES.reduce((sum, type) => sum + type.arrivalWeight[level], 0)).toBe(100);
    }
  });
});

describe('甜甜圈（T12）', () => {
  it('每个 60 秒，最多预存 180 秒', () => {
    const state = quietState();
    for (const expected of [60, 120, 180]) {
      expect(useDonut(state, fixedRng(0)).ok).toBe(true);
      expect(state.gifts.donutLeft).toBe(expected);
    }
    expect(useDonut(state, fixedRng(0)).ok).toBe(false);
    expect(state.gifts.donutLeft).toBe(DONUT.maxSeconds);
  });

  it('生效期间待出餐的菜自动端给客人', () => {
    const state = quietState();
    putGuest(state, 'student', 'ready');
    const cooking = putGuest(state, 'student', 'cooking', { cookLeft: 1 });
    useDonut(state, fixedRng(0.99));
    expect(state.cash).toBe(8);

    tick(state, fixedRng(0.99));
    expect(state.guests).not.toContain(cooking);
    expect(state.cash).toBe(16);
    expect(state.gifts.donutLeft).toBe(59);
  });
});

describe('炸弹（T13）', () => {
  const level3 = (): GameState => {
    const state = quietState({ restaurantLevel: 3, chefLevel: 3 });
    state.activeDishes.push('D0301');
    state.menu = ['D0101', 'D0301'];
    return state;
  };

  it('招揽 min(3+等级, 空位) 人，其中 30% 向下取整为最高品级客人', () => {
    const state = level3();
    expect(useBomb(state, fixedRng(0)).ok).toBe(true);
    expect(state.guests).toHaveLength(6);
    expect(state.guests.filter((g) => g.typeId === 'boss')).toHaveLength(1);
    expect(state.guests.filter((g) => g.typeId === 'student')).toHaveLength(5);
    // 不突破座位和排队上限
    expect(state.guests.filter((g) => g.phase !== 'queuing')).toHaveLength(5);
    expect(state.gifts.bombCooldown).toBe(BOMB.cooldownSeconds);
  });

  it('人数受空位限制', () => {
    const state = quietState();
    fullTables(state);
    putGuest(state, 'student', 'queuing');
    putGuest(state, 'student', 'queuing');
    useBomb(state, fixedRng(0));
    expect(state.guests).toHaveLength(8);
  });

  it('冷却中、空位不足或没有可做菜时不生效也不进入冷却', () => {
    const cooling = level3();
    useBomb(cooling, fixedRng(0));
    expect(useBomb(cooling, fixedRng(0)).ok).toBe(false);
    expect(cooling.guests).toHaveLength(6);
    runTicks(cooling, fixedRng(0), BOMB.cooldownSeconds);
    expect(cooling.gifts.bombCooldown).toBe(0);

    const crowded = quietState();
    fullTables(crowded);
    for (let i = 0; i < 3; i++) putGuest(crowded, 'student', 'queuing');
    expect(useBomb(crowded, fixedRng(0)).ok).toBe(false);
    expect(crowded.gifts.bombCooldown).toBe(0);

    const noMenu = quietState();
    noMenu.menu = [];
    expect(useBomb(noMenu, fixedRng(0)).ok).toBe(false);
    expect(noMenu.guests).toHaveLength(0);
  });
});

describe('测试礼物', () => {
  it('点击或弹幕触发后获得 1000 现金、三色食材各 50、铭牌碎片 20', () => {
    const state = quietState({ cash: 5 });
    expect(useTestGift(state).ok).toBe(true);
    expect(state).toMatchObject({ cash: 1005, red: 50, green: 50, blue: 50, plate: 20 });
    sendDanmaku(state, fixedRng(0), '测试礼物');
    expect(state).toMatchObject({ cash: 2005, plate: 40 });
  });
});

describe('研发与升级（T06、T07、T08）', () => {
  it('研发：资源足够时解锁并扣除，菜单位满时需手动调整上架', () => {
    const state = quietState({ cash: 60, red: 1, green: 3 });
    expect(research(state, 'D0104').ok).toBe(true);
    expect(state).toMatchObject({ cash: 0, red: 0, green: 0 });
    expect(state.activeDishes).toContain('D0104');
    expect(state.menu).not.toContain('D0104');

    expect(toggleMenu(state, 'D0104').ok).toBe(false);
    expect(toggleMenu(state, 'D0101').ok).toBe(true);
    expect(toggleMenu(state, 'D0104').ok).toBe(true);
    expect(state.menu).toEqual(['D0102', 'D0103', 'D0104']);
  });

  it('研发：资源不足时说明缺口，饭馆等级不够时不能研发', () => {
    const state = quietState({ cash: 50, red: 1 });
    const result = research(state, 'D0104');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('缺 10现金、3绿');
    expect(state.cash).toBe(50);

    const rich = quietState({ cash: 9999, red: 99, green: 99, blue: 99 });
    expect(research(rich, 'D0201').ok).toBe(false);
    expect(rich.cash).toBe(9999);
  });

  it('饭馆升级后桌位、排队位、灶眼、菜单位和客流同步变化', () => {
    const state = quietState({ cash: 299, plate: 2 });
    expect(upgradeRestaurant(state).ok).toBe(false);
    state.cash = 300;
    expect(upgradeRestaurant(state).ok).toBe(true);
    expect(state).toMatchObject({ restaurantLevel: 2, cash: 0, plate: 0 });
    expect(getRestaurant(state)).toMatchObject({ tables: 4, queueSlots: 6, stoves: 2, menuSlots: 5, guestsPerMinute: 2.4 });
  });

  it('厨师升级受饭馆等级限制，升级后速度变化', () => {
    const state = quietState({ cash: 1000 });
    expect(upgradeChef(state).ok).toBe(false);
    state.restaurantLevel = 2;
    expect(upgradeChef(state).ok).toBe(true);
    expect(state.cash).toBe(800);
    expect(getChef(state).speed).toBe(1.25);
  });
});

describe('存档与日结（T14）', () => {
  it('成长数据存读一致，在场客人不入档', () => {
    const storage = memoryStorage();
    const state = quietState({ cash: 123, red: 4, green: 5, blue: 6, plate: 7, restaurantLevel: 2, chefLevel: 2, pillPity: 3 });
    state.activeDishes.push('D0201');
    state.menu.push('D0201');
    state.gifts.donutLeft = 90;
    putGuest(state, 'student', 'ready');
    saveGame(state, storage);

    const loaded = loadGame(storage);
    expect(toSave(loaded)).toEqual(toSave(state));
    expect(loaded.guests).toHaveLength(0);
  });

  it('存档损坏或数值非法时不会读出负数', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, '{oops');
    expect(toSave(loadGame(storage))).toEqual(toSave(createInitialState()));

    storage.setItem(SAVE_KEY, JSON.stringify({ ...toSave(createInitialState()), cash: -50, restaurantLevel: 99 }));
    expect(loadGame(storage)).toMatchObject({ cash: 0, restaurantLevel: 3 });
  });

  it('游戏时间满 720 秒为一天，清零今日客流和营业额', () => {
    const state = quietState({ dayTick: DAY_TICKS - 1, todayGuests: 5, todayRevenue: 40, cash: 40 });
    tick(state, fixedRng(0));
    expect(state).toMatchObject({ day: 2, dayTick: 0, todayGuests: 0, todayRevenue: 0, cash: 40 });
  });
});
