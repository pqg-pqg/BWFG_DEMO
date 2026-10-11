import type { Cost } from './resources';

export interface ChefLevelConfig {
  level: number;
  name: string;
  /** 可做的最高菜品品级 */
  maxDishGrade: number;
  /** 实际烹饪秒数 = 菜品基础烹饪秒数 ÷ speed */
  speed: number;
  requireRestaurantLevel: number;
  upgradeCost: Cost | null;
}

export const CHEF_LEVELS: ChefLevelConfig[] = [
  { level: 1, name: '学徒帮厨', maxDishGrade: 1, speed: 1.0, requireRestaurantLevel: 1, upgradeCost: null },
  { level: 2, name: '家常厨师', maxDishGrade: 2, speed: 1.25, requireRestaurantLevel: 2, upgradeCost: { cash: 200 } },
  { level: 3, name: '掌勺厨师', maxDishGrade: 3, speed: 1.5, requireRestaurantLevel: 3, upgradeCost: { cash: 600 } },
];

export const MAX_CHEF_LEVEL = CHEF_LEVELS.length;
