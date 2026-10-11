export type ResourceKey = 'cash' | 'red' | 'green' | 'blue' | 'plate';

/** 消耗或奖励：只写用到的资源 */
export type Cost = Partial<Record<ResourceKey, number>>;

export const RESOURCE_KEYS: ResourceKey[] = ['cash', 'red', 'green', 'blue', 'plate'];

/** 客人结账时各自独立判定掉落的三色材料 */
export const MATERIAL_KEYS: ResourceKey[] = ['red', 'green', 'blue'];

export const RESOURCE_LABEL: Record<ResourceKey, string> = {
  cash: '现金',
  red: '红食材',
  green: '绿食材',
  blue: '蓝食材',
  plate: '铭牌碎片',
};

export const RESOURCE_SHORT: Record<ResourceKey, string> = {
  cash: '现金',
  red: '红',
  green: '绿',
  blue: '蓝',
  plate: '铭牌碎片',
};

export const RESOURCE_ICON: Record<ResourceKey, string> = {
  cash: '💰',
  red: '🔴',
  green: '🟢',
  blue: '🔵',
  plate: '🏷️',
};
