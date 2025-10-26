// Entity Generation Services
export { createItem } from './item-generation'
export { createNpc } from './npc-generation'
export { createLocation } from './location-generation'
export { createRegion } from './region-generation'
export type { GameRules, GameContext, GenerationResult } from './types'
export {
  getNextEntityId,
  resetCounters,
  getCounterStats,
  ITEM_CATEGORIES,
  NPC_CATEGORIES,
  LOCATION_CATEGORIES,
} from './categories'

// EntityStorage Integration Functions
import { createItem } from './item-generation'
import { createNpc } from './npc-generation'
import { createLocation } from './location-generation'
import { createRegion } from './region-generation'
import type { GameRules, GenerationResult } from './types'
import type { EntityStorageContextType } from '../../context/EntityMemoryStorage'
import type { Item, NPC, Location, Region } from '../../types'

export const generateAndAddItem = async (
  prompt: string, 
  rules: GameRules,
  region: string,
  x: number,
  y: number,
  entityStorage: EntityStorageContextType
): Promise<GenerationResult<Item>> => {
  const result = await createItem(prompt, rules, region, x, y)
  entityStorage.addEntity(result.entity, 'item')
  return result
}

export const generateAndAddNPC = async (
  prompt: string, 
  rules: GameRules,
  region: string,
  x: number,
  y: number,
  entityStorage: EntityStorageContextType
): Promise<GenerationResult<NPC>> => {
  const result = await createNpc(prompt, rules, region, x, y)
  entityStorage.addEntity(result.entity, 'npc')
  return result
}

export const generateAndAddLocation = async (
  prompt: string, 
  rules: GameRules,
  region: string,
  x: number,
  y: number,
  entityStorage: EntityStorageContextType
): Promise<GenerationResult<Location>> => {
  const result = await createLocation(prompt, rules, region, x, y)
  entityStorage.addEntity(result.entity, 'location')
  return result
}

export const generateAndAddRegion = async (
  prompt: string,
  rules: GameRules,
  regionX: number,
  regionY: number,
  entityStorage: EntityStorageContextType
): Promise<GenerationResult<Region>> => {
  const result = await createRegion(prompt, rules, regionX, regionY)
  entityStorage.addRegion(result.entity)
  return result
}

