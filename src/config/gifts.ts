import type { Cost } from './resources';

/** 红色仙女棒：一根作用于所有烹饪中的订单，每个订单各自计数 */
export const WAND = {
  name: '红色仙女棒',
  emoji: '🪄',
  /** 每根减少该订单总烹饪时长的比例 */
  reducePerStick: 0.2,
  /** 每个订单最多吃 4 根，即最低保留 20% 时间 */
  maxSticksPerOrder: 4,
};

export const MIRROR = {
  name: '魔法镜',
  emoji: '🪞',
  durationSeconds: 30,
  maxStacks: 3,
  /** 1/2/3 层的客流倍率 */
  flowMultiplier: [1.5, 2.0, 2.5],
  /** 到访池中最靠后的 N 类客人视为“最高两档” */
  topGuestCount: 2,
  /** 每层对最高档客人权重的乘数 */
  topGuestWeightPerStack: 1.5,
};

export const DONUT = {
  name: '甜甜圈',
  emoji: '🍩',
  secondsPerDonut: 60,
  maxSeconds: 180,
};

export const BOMB = {
  name: '炸弹',
  emoji: '💣',
  /** 招揽人数 = min(baseGuests + 饭馆等级, 空桌 + 空排队位) */
  baseGuests: 3,
  cooldownSeconds: 20,
  minEmptySlots: 3,
  /** 招揽人数中向下取整的这一比例为当前可服务最高品级客人 */
  topGuestRatio: 0.3,
};

export interface PillEntry {
  id: string;
  name: string;
  /** 概率（百分比），全表合计 100 */
  weight: number;
  reward?: Cost;
  /** 随机激活一道可研发且未激活的菜 */
  newDish?: boolean;
}

export const PILL = {
  name: '能量药丸',
  emoji: '💊',
  /** 连续 pityDraws 抽没出新菜时，本抽必出新菜 */
  pityDraws: 10,
  /** 抽中新菜但没有可激活的菜时的替代奖励 */
  fallbackPack: { red: 2, green: 2, blue: 2 } as Cost,
  table: [
    { id: 'red', name: '红火食材', weight: 23, reward: { red: 2 } },
    { id: 'green', name: '清鲜食材', weight: 23, reward: { green: 2 } },
    { id: 'blue', name: '山海食材', weight: 23, reward: { blue: 2 } },
    { id: 'plate', name: '铭牌碎片', weight: 12, reward: { plate: 1 } },
    { id: 'dish', name: '新菜品', weight: 8, newDish: true },
    { id: 'cash', name: '现金', weight: 11, reward: { cash: 50 } },
  ] as PillEntry[],
};

/** 测试礼物：只为评审和调试快速拿到资源，不属于正式礼物 */
export const TEST_GIFT = {
  name: '测试礼物',
  emoji: '🎁',
  reward: { cash: 1000, red: 50, green: 50, blue: 50, plate: 20 } as Cost,
};

export type CommandId = 'serve' | 'wand' | 'pill' | 'mirror' | 'donut' | 'bomb' | 'test';

/** 模拟弹幕指令：整句匹配任一关键词即触发 */
export const DANMAKU_COMMANDS: { id: CommandId; keywords: string[] }[] = [
  { id: 'serve', keywords: ['出餐'] },
  { id: 'wand', keywords: ['仙女棒', '红色仙女棒'] },
  { id: 'pill', keywords: ['药丸', '能量药丸'] },
  { id: 'mirror', keywords: ['魔法镜'] },
  { id: 'donut', keywords: ['甜甜圈'] },
  { id: 'bomb', keywords: ['炸弹'] },
  { id: 'test', keywords: ['测试礼物'] },
];
