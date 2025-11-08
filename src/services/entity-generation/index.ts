// Entity Generation Services
export { createItem } from './item-generation'
export { createNpc } from './npc-generation'
export { createLocation } from './location-generation'
export { createRegion } from './region-generation'
export type { GameRules, GenerationResult } from './types'
export { generateEntityWithContext } from './generation-manager'
export type { GenerateEntityWithContextOptions, GeneratedEntityResult } from './generation-manager'
export {
  getNextEntityId,
  resetCounters,
  getCounterStats,
  ITEM_CATEGORIES,
  NPC_CATEGORIES,
  LOCATION_CATEGORIES,
} from './categories'

// EntityStorage Integration Functions
import type { GameRules } from './types'
import type { EntityStorageContextType } from '../../context/EntityMemoryStorage'
import type { Item, NPC, Location, Region } from '../../types'
import type { GameConfiguration } from '../game-orchestrator/types'
import { generateEntityWithContext } from './generation-manager'
import type { GeneratedEntityResult } from './generation-manager'

export const generateAndAddItem = async (
  prompt: string,
  rules: GameRules,
  region: string,
  x: number,
  y: number,
  entityStorage: EntityStorageContextType,
  gameConfig: GameConfiguration
): Promise<GeneratedEntityResult<Item>> => {
  const result = await generateEntityWithContext({
    type: 'item',
    prompt,
    gameRules: rules,
    region,
    x,
    y,
    entityStorage,
    gameConfig
  })
  return result as GeneratedEntityResult<Item>
}

export const generateAndAddNPC = async (
  prompt: string,
  rules: GameRules,
  region: string,
  x: number,
  y: number,
  entityStorage: EntityStorageContextType,
  gameConfig: GameConfiguration
): Promise<GeneratedEntityResult<NPC>> => {
  const result = await generateEntityWithContext({
    type: 'npc',
    prompt,
    gameRules: rules,
    region,
    x,
    y,
    entityStorage,
    gameConfig
  })
  return result as GeneratedEntityResult<NPC>
}

export const generateAndAddLocation = async (
  prompt: string,
  rules: GameRules,
  region: string,
  x: number,
  y: number,
  entityStorage: EntityStorageContextType,
  gameConfig: GameConfiguration
): Promise<GeneratedEntityResult<Location>> => {
  const result = await generateEntityWithContext({
    type: 'location',
    prompt,
    gameRules: rules,
    region,
    x,
    y,
    entityStorage,
    gameConfig
  })
  return result as GeneratedEntityResult<Location>
}

export const generateAndAddRegion = async (
  prompt: string,
  rules: GameRules,
  regionX: number,
  regionY: number,
  entityStorage: EntityStorageContextType,
  gameConfig: GameConfiguration
): Promise<GeneratedEntityResult<Region>> => {
  const result = await generateEntityWithContext({
    type: 'region',
    prompt,
    gameRules: rules,
    regionX,
    regionY,
    entityStorage,
    gameConfig
  })
  return result as GeneratedEntityResult<Region>
}

