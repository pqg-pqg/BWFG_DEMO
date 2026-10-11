import type { Cost } from './resources';

export interface RestaurantLevelConfig {
  level: number;
  name: string;
  emoji: string;
  tables: number;
  queueSlots: number;
  stoves: number;
  menuSlots: number;
  /** 基础客流：人/分钟 */
  guestsPerMinute: number;
  /** 升到本级的消耗；初始等级为 null */
  upgradeCost: Cost | null;
}

/** Demo 压缩规则：饭馆 N 级解锁 N 级菜品和 N 级厨师 */
export const RESTAURANT_LEVELS: RestaurantLevelConfig[] = [
  { level: 1, name: '折叠面摊', emoji: '⛺', tables: 3, queueSlots: 5, stoves: 1, menuSlots: 3, guestsPerMinute: 2.0, upgradeCost: null },
  { level: 2, name: '家常小饭馆', emoji: '🏠', tables: 4, queueSlots: 6, stoves: 2, menuSlots: 5, guestsPerMinute: 2.4, upgradeCost: { cash: 300, plate: 2 } },
  { level: 3, name: '热闹小酒楼', emoji: '🏮', tables: 5, queueSlots: 8, stoves: 3, menuSlots: 7, guestsPerMinute: 2.8, upgradeCost: { cash: 900, plate: 6 } },
];

export const MAX_RESTAURANT_LEVEL = RESTAURANT_LEVELS.length;
