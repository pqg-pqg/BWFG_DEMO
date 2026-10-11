export interface GuestTypeConfig {
  id: string;
  name: string;
  emoji: string;
  grade: number;
  /** 可接受的菜品品级 */
  acceptGrades: number[];
  /** 优先品级：菜单上有该品级可做菜时只点该品级，否则降级点可接受范围内品级最高的 */
  preferGrade?: number;
  /** 排队耐心（秒） */
  queuePatience: number;
  /** 菜好后等待出餐的耐心（秒） */
  readyPatience: number;
  /** 多付比例，0.2 表示多付 20% */
  payBonus: number;
  /** 饭馆 1/2/3 级时的到访权重（百分比），0 表示不进入到访池 */
  arrivalWeight: [number, number, number];
  /** 结账时红、绿、蓝各自独立判定的掉落率 */
  materialDropRate: number;
  /** 结账时铭牌碎片掉落率 */
  plateDropRate: number;
}

/**
 * 顺序即文档表格顺序。魔法镜的“最高两档客人”取当前到访池中最靠后的两类，
 * 所以这里的顺序有意义，新增客人时按品级从低到高追加。
 */
export const GUEST_TYPES: GuestTypeConfig[] = [
  { id: 'student', name: '放学学生', emoji: '🧒', grade: 1, acceptGrades: [1], queuePatience: 45, readyPatience: 10, payBonus: 0, arrivalWeight: [55, 35, 25], materialDropRate: 0.6, plateDropRate: 0.08 },
  { id: 'worker', name: '工地工人', emoji: '👷', grade: 1, acceptGrades: [1], queuePatience: 50, readyPatience: 12, payBonus: 0, arrivalWeight: [45, 30, 20], materialDropRate: 0.65, plateDropRate: 0.1 },
  { id: 'office', name: '赶时间上班族', emoji: '🧑‍💼', grade: 2, acceptGrades: [1, 2], queuePatience: 40, readyPatience: 10, payBonus: 0, arrivalWeight: [0, 25, 22], materialDropRate: 0.7, plateDropRate: 0.12 },
  { id: 'blogger', name: '探店博主', emoji: '🤳', grade: 2, acceptGrades: [1, 2], preferGrade: 2, queuePatience: 35, readyPatience: 8, payBonus: 0.2, arrivalWeight: [0, 10, 13], materialDropRate: 0.75, plateDropRate: 0.14 },
  { id: 'boss', name: '小企业主', emoji: '🤵', grade: 3, acceptGrades: [2, 3], queuePatience: 30, readyPatience: 10, payBonus: 0.25, arrivalWeight: [0, 0, 13], materialDropRate: 0.8, plateDropRate: 0.18 },
  { id: 'critic', name: '美食评论家', emoji: '🧐', grade: 3, acceptGrades: [1, 2, 3], preferGrade: 3, queuePatience: 25, readyPatience: 8, payBonus: 0.4, arrivalWeight: [0, 0, 7], materialDropRate: 0.85, plateDropRate: 0.22 },
];

export const GUEST_TYPE_BY_ID: Record<string, GuestTypeConfig> = Object.fromEntries(GUEST_TYPES.map((g) => [g.id, g]));
