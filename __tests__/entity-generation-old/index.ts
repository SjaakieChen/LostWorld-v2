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

// GameMemory Integration Functions
import { createItem } from './item-generation'
import { createNpc } from './npc-generation'
import { createLocation } from './location-generation'
import type { GameRules, GameContext, GenerationResult } from './types'
import type { GameMemoryContextType } from '../../context/GameMemoryContext'
import type { Item, NPC, Location } from '../../types'

export const generateAndAddItem = async (
  prompt: string, 
  context: GameContext, 
  rules: GameRules, 
  gameMemory: GameMemoryContextType
): Promise<GenerationResult<Item>> => {
  const result = await createItem(prompt, context, rules)
  gameMemory.addEntity(result.entity, 'item')
  return result
}

export const generateAndAddNPC = async (
  prompt: string, 
  context: GameContext, 
  rules: GameRules, 
  gameMemory: GameMemoryContextType
): Promise<GenerationResult<NPC>> => {
  const result = await createNpc(prompt, context, rules)
  gameMemory.addEntity(result.entity, 'npc')
  return result
}

export const generateAndAddLocation = async (
  prompt: string, 
  context: GameContext, 
  rules: GameRules, 
  gameMemory: GameMemoryContextType
): Promise<GenerationResult<Location>> => {
  const result = await createLocation(prompt, context, rules)
  gameMemory.addEntity(result.entity, 'location')
  return result
}

