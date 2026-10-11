/**
 * 客人状态机：
 * queuing(排队) → waitingStove(已落座点单，等灶眼) → cooking(烹饪中) → ready(待出餐)
 * ready 之后要么出餐结账离开，要么等待超时离开。离开即从 guests 中移除。
 */
export type GuestPhase = 'queuing' | 'waitingStove' | 'cooking' | 'ready';

/** 客人和他的订单是同一个实体：一位客人只点一道菜 */
export interface Guest {
  id: number;
  typeId: string;
  phase: GuestPhase;
  /** 排队剩余耐心（秒） */
  queueLeft: number;
  tableIndex: number | null;
  dishId: string | null;
  stoveIndex: number | null;
  /** 本单实际烹饪总时长 = 基础 ÷ 厨师倍率 */
  cookTotal: number;
  cookLeft: number;
  /** 本单已吃到的仙女棒根数 */
  wandCount: number;
  /** 待出餐剩余等待（秒） */
  readyLeft: number;
  /** 进入当前阶段的先后序号：等灶按它分配灶眼，待出餐按它决定最早的一道 */
  seq: number;
}

export type LogKind = 'arrive' | 'order' | 'ready' | 'pay' | 'leave' | 'gift' | 'lottery' | 'system' | 'chat';

export interface LogEntry {
  id: number;
  tick: number;
  kind: LogKind;
  text: string;
}

export interface GiftState {
  mirrorStacks: number;
  mirrorLeft: number;
  donutLeft: number;
  bombCooldown: number;
}

export interface LossStats {
  /** 排队位已满，到店即走 */
  capacity: number;
  /** 排队超过耐心 */
  queue: number;
  /** 菜好后没人出餐 */
  ready: number;
  /** 落座后菜单上没有可点的菜 */
  noDish: number;
}

export interface GameState {
  // ---- 成长数据：写入存档 ----
  cash: number;
  red: number;
  green: number;
  blue: number;
  plate: number;
  restaurantLevel: number;
  chefLevel: number;
  /** 已激活（已研发）的菜 */
  activeDishes: string[];
  /** 已上架的菜，长度不超过当前菜单位 */
  menu: string[];
  /** 距上次抽到新菜以来的药丸抽数 */
  pillPity: number;
  day: number;
  dayTick: number;
  todayGuests: number;
  todayRevenue: number;
  gifts: GiftState;

  // ---- 会话数据：刷新后清空重建 ----
  tick: number;
  /** 到访进度累加器，>= 1 时来一位客人 */
  spawnProgress: number;
  guests: Guest[];
  nextGuestId: number;
  nextSeq: number;
  served: number;
  lost: LossStats;
  log: LogEntry[];
  nextLogId: number;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}
