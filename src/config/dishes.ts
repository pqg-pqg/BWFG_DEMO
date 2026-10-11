import type { Cost } from './resources';

export interface DishConfig {
  id: string;
  name: string;
  emoji: string;
  /** 品级：需要饭馆等级 >= grade 才能研发，厨师可做品级 >= grade 才能制作 */
  grade: number;
  price: number;
  /** 基础烹饪秒数 */
  cookSeconds: number;
  /** 研发消耗；初始已激活的菜为 null */
  researchCost: Cost | null;
  initiallyActive: boolean;
}

export const DISHES: DishConfig[] = [
  { id: 'D0101', name: '阳春面', emoji: '🍜', grade: 1, price: 8, cookSeconds: 8, researchCost: null, initiallyActive: true },
  { id: 'D0102', name: '青菜汤面', emoji: '🥬', grade: 1, price: 8, cookSeconds: 9, researchCost: null, initiallyActive: true },
  { id: 'D0103', name: '葱油拌面', emoji: '🍝', grade: 1, price: 9, cookSeconds: 10, researchCost: null, initiallyActive: true },
  { id: 'D0104', name: '香煎葱油饼', emoji: '🫓', grade: 1, price: 10, cookSeconds: 12, researchCost: { cash: 60, red: 1, green: 3 }, initiallyActive: false },
  { id: 'D0201', name: '红烧牛肉面', emoji: '🥩', grade: 2, price: 18, cookSeconds: 18, researchCost: { cash: 180, red: 3, green: 1 }, initiallyActive: false },
  { id: 'D0202', name: '番茄鸡蛋饭', emoji: '🍅', grade: 2, price: 16, cookSeconds: 16, researchCost: { cash: 160, red: 2, green: 2 }, initiallyActive: false },
  { id: 'D0203', name: '香菇滑鸡饭', emoji: '🍄', grade: 2, price: 20, cookSeconds: 22, researchCost: { cash: 220, red: 2, green: 2, blue: 1 }, initiallyActive: false },
  { id: 'D0204', name: '鲜肉小馄饨', emoji: '🥟', grade: 2, price: 18, cookSeconds: 20, researchCost: { cash: 180, red: 2, green: 3 }, initiallyActive: false },
  { id: 'D0301', name: '猪肉白菜水饺', emoji: '🥠', grade: 3, price: 32, cookSeconds: 30, researchCost: { cash: 420, red: 3, green: 3, blue: 1 }, initiallyActive: false },
  { id: 'D0302', name: '宫保鸡丁套餐', emoji: '🍗', grade: 3, price: 38, cookSeconds: 36, researchCost: { cash: 520, red: 4, green: 2, blue: 1 }, initiallyActive: false },
  { id: 'D0303', name: '鱼香肉丝饭', emoji: '🍛', grade: 3, price: 36, cookSeconds: 34, researchCost: { cash: 500, red: 4, green: 3, blue: 1 }, initiallyActive: false },
  { id: 'D0304', name: '酱爆猪肝饭', emoji: '🍲', grade: 3, price: 34, cookSeconds: 32, researchCost: { cash: 460, red: 5, green: 2, blue: 1 }, initiallyActive: false },
];

export const DISH_BY_ID: Record<string, DishConfig> = Object.fromEntries(DISHES.map((d) => [d.id, d]));
