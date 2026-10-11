/** 一个 Tick 代表的游戏秒数 */
export const TICK_SECONDS = 1;

/** 游戏时间 12 分钟为一天，到点清零今日客流和营业额 */
export const DAY_TICKS = 720;

/** 开局的到访进度（0-1），让第一位客人几秒内到达 */
export const INITIAL_SPAWN_PROGRESS = 0.9;

/** 结账时每种命中的材料掉落数量 */
export const MATERIAL_DROP_AMOUNT = 1;
export const PLATE_DROP_AMOUNT = 1;

export const LOG_LIMIT = 200;

/** 调试区可选倍速 */
export const SPEEDS = [1, 2, 5];
