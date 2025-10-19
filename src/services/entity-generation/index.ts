// Entity Generation Services
export { createItem } from './item-generation'
export { createNpc } from './npc-generation'
export { createLocation } from './location-generation'
export type { GameRules, GameContext, GenerationResult } from './types'
export {
  getNextEntityId,
  resetCounters,
  getCounterStats,
  ITEM_CATEGORIES,
  NPC_CATEGORIES,
  LOCATION_CATEGORIES,
} from './categories'

