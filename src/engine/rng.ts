/** 引擎里所有随机都经由这个接口，便于注入种子或在测试里固定结果 */
export interface Rng {
  /** 返回 [0, 1) 的随机数 */
  next(): number;
}

/** mulberry32：给定种子可完全复现 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function chance(rng: Rng, probability: number): boolean {
  return rng.next() < probability;
}

export function pickOne<T>(rng: Rng, items: T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rng.next() * items.length))];
}

export function pickWeighted<T>(rng: Rng, items: T[], weightOf: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}
