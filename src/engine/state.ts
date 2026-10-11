import { INITIAL_SPAWN_PROGRESS } from '../config/balance';
import { DISHES } from '../config/dishes';
import { RESTAURANT_LEVELS } from '../config/restaurant';
import type { GameState } from './types';

export function createInitialState(): GameState {
  const activeDishes = DISHES.filter((d) => d.initiallyActive).map((d) => d.id);
  return {
    cash: 0,
    red: 0,
    green: 0,
    blue: 0,
    plate: 0,
    restaurantLevel: 1,
    chefLevel: 1,
    activeDishes,
    menu: activeDishes.slice(0, RESTAURANT_LEVELS[0].menuSlots),
    pillPity: 0,
    day: 1,
    dayTick: 0,
    todayGuests: 0,
    todayRevenue: 0,
    gifts: { mirrorStacks: 0, mirrorLeft: 0, donutLeft: 0, bombCooldown: 0 },

    tick: 0,
    spawnProgress: INITIAL_SPAWN_PROGRESS,
    guests: [],
    nextGuestId: 1,
    nextSeq: 1,
    served: 0,
    lost: { capacity: 0, queue: 0, ready: 0, noDish: 0 },
    log: [],
    nextLogId: 1,
  };
}
