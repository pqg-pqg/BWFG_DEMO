import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TICK_SECONDS } from '../config/balance';
import type { CommandId } from '../config/gifts';
import * as actions from '../engine/actions';
import { clearSave, loadGame, saveGame } from '../engine/persistence';
import { createRng, type Rng } from '../engine/rng';
import { createInitialState } from '../engine/state';
import { tick } from '../engine/tick';
import type { ActionResult, GameState } from '../engine/types';

export interface Notice {
  id: number;
  ok: boolean;
  message: string;
}

/** 地址栏带 ?seed=123 时用固定种子，便于复现 */
function readSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  const parsed = param === null ? NaN : Number(param);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

/**
 * 界面和引擎之间唯一的桥。全局只有这里的一个 setInterval 在推进时间，
 * 每次变更都是“复制状态 → 交给引擎修改 → 替换并存档”。
 */
export function useGame() {
  const seed = useMemo(readSeed, []);
  const rngRef = useRef<Rng>(createRng(seed));
  const stateRef = useRef<GameState | null>(null);
  if (stateRef.current === null) stateRef.current = loadGame(window.localStorage);

  const [state, setState] = useState<GameState>(stateRef.current);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeId = useRef(0);

  const mutate = useCallback(<T,>(change: (draft: GameState, rng: Rng) => T): T => {
    const draft = structuredClone(stateRef.current!);
    const result = change(draft, rngRef.current);
    stateRef.current = draft;
    setState(draft);
    saveGame(draft, window.localStorage);
    return result;
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => mutate((draft, rng) => tick(draft, rng)), (TICK_SECONDS * 1000) / speed);
    return () => window.clearInterval(timer);
  }, [paused, speed, mutate]);

  const act = useCallback(
    (change: (draft: GameState, rng: Rng) => ActionResult) => {
      const result = mutate(change);
      setNotice({ id: ++noticeId.current, ok: result.ok, message: result.message });
    },
    [mutate],
  );

  const api = useMemo(
    () => ({
      command: (id: CommandId) => act((draft, rng) => actions.runCommand(draft, rng, id)),
      danmaku: (text: string) => act((draft, rng) => actions.sendDanmaku(draft, rng, text)),
      research: (dishId: string) => act((draft) => actions.research(draft, dishId)),
      toggleMenu: (dishId: string) => act((draft) => actions.toggleMenu(draft, dishId)),
      upgradeRestaurant: () => act((draft) => actions.upgradeRestaurant(draft)),
      upgradeChef: () => act((draft) => actions.upgradeChef(draft)),
      reset: () => {
        clearSave(window.localStorage);
        const fresh = createInitialState();
        stateRef.current = fresh;
        setState(fresh);
        setNotice({ id: ++noticeId.current, ok: true, message: '存档已重置' });
      },
    }),
    [act],
  );

  return { state, seed, paused, setPaused, speed, setSpeed, notice, ...api };
}

export type Game = ReturnType<typeof useGame>;
