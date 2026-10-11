import { BOMB, DONUT, MIRROR, PILL, TEST_GIFT, WAND, type CommandId } from '../config/gifts';
import { formatCost } from '../engine/selectors';
import type { GameState } from '../engine/types';

interface GiftButton {
  id: CommandId;
  emoji: string;
  name: string;
  rule: string;
  status: string;
  active: boolean;
}

export function GiftPanel({ state, onCommand }: { state: GameState; onCommand: (id: CommandId) => void }) {
  const gifts = state.gifts;
  const buttons: GiftButton[] = [
    {
      id: 'wand',
      emoji: WAND.emoji,
      name: WAND.name,
      rule: `烹饪中的菜各减 ${WAND.reducePerStick * 100}% 时长，每道最多 ${WAND.maxSticksPerOrder} 根`,
      status: '可连续点击',
      active: false,
    },
    {
      id: 'pill',
      emoji: PILL.emoji,
      name: PILL.name,
      rule: `抽奖一次，${PILL.pityDraws} 抽保底新菜`,
      status: `保底进度 ${state.pillPity}/${PILL.pityDraws}`,
      active: false,
    },
    {
      id: 'mirror',
      emoji: MIRROR.emoji,
      name: MIRROR.name,
      rule: `${MIRROR.durationSeconds} 秒内客流提升，最多 ${MIRROR.maxStacks} 层`,
      status: gifts.mirrorStacks > 0 ? `${gifts.mirrorStacks} 层 · 剩 ${Math.ceil(gifts.mirrorLeft)} 秒` : '未生效',
      active: gifts.mirrorStacks > 0,
    },
    {
      id: 'donut',
      emoji: DONUT.emoji,
      name: DONUT.name,
      rule: `每个 ${DONUT.secondsPerDonut} 秒自动出餐，最多 ${DONUT.maxSeconds} 秒`,
      status: gifts.donutLeft > 0 ? `自动出餐剩 ${Math.ceil(gifts.donutLeft)} 秒` : '未生效',
      active: gifts.donutLeft > 0,
    },
    {
      id: 'bomb',
      emoji: BOMB.emoji,
      name: BOMB.name,
      rule: `立即招揽一批客人，冷却 ${BOMB.cooldownSeconds} 秒`,
      status: gifts.bombCooldown > 0 ? `冷却中 ${Math.ceil(gifts.bombCooldown)} 秒` : '可用',
      active: gifts.bombCooldown > 0,
    },
    {
      id: 'test',
      emoji: TEST_GIFT.emoji,
      name: TEST_GIFT.name,
      rule: `获得 ${formatCost(TEST_GIFT.reward, '、')}`,
      status: '仅供测试',
      active: false,
    },
  ];

  return (
    <section className="panel">
      <h2>礼物面板</h2>
      <div className="gifts">
        {buttons.map((gift) => (
          <button key={gift.id} className={`gift ${gift.active ? 'gift-active' : ''} ${gift.id === 'test' ? 'gift-test' : ''}`} onClick={() => onCommand(gift.id)}>
            <span className="gift-emoji">{gift.emoji}</span>
            <span className="gift-name">{gift.name}</span>
            <span className="gift-status">{gift.status}</span>
            <span className="gift-rule">{gift.rule}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
