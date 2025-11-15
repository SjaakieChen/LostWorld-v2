import type { Timeline, TimelineEntry } from '../../context/timeline'
import type { GameConfiguration } from '../game-orchestrator/types'
import type { GameRules, GenerationResult } from './types'
import { createItem } from './item-generation'
import { createNpc } from './npc-generation'
import { createLocation } from './location-generation'
import { createRegion } from './region-generation'
import type { EntityStorageContextType } from '../../context/EntityMemoryStorage'
import type { Item, NPC, Location, Region } from '../../types'
import {
  logTimelineEvent,
  getActiveTimeline,
  pushTimelineContext,
  hasTimelineContext
} from '../timeline/timeline-service'

type EntityType = 'item' | 'npc' | 'location' | 'region'

interface BaseGenerateOptions {
  prompt: string
  gameRules: GameRules
  gameConfig?: GameConfiguration | null
  onTimelineEntry?: (entry: TimelineEntry) => void
  onEntityCreated?: (entity: Item | NPC | Location | Region, type: EntityType) => void | Promise<void>
  entityStorage?: EntityStorageContextType
  changeReason?: string
}

interface ItemOptions extends BaseGenerateOptions {
  type: 'item'
  region: string
  x: number
  y: number
}

interface NpcOptions extends BaseGenerateOptions {
  type: 'npc'
  region: string
  x: number
  y: number
}

interface LocationOptions extends BaseGenerateOptions {
  type: 'location'
  region: string
  x: number
  y: number
}

interface RegionOptions extends BaseGenerateOptions {
  type: 'region'
  regionX: number
  regionY: number
}

export type GenerateEntityWithContextOptions =
  | ItemOptions
  | NpcOptions
  | LocationOptions
  | RegionOptions

export type GeneratedEntityResult<T> = GenerationResult<T> & {
  timeline: Timeline | null
  timelineEntry: TimelineEntry | null
}

async function handleEntityStorage(
  entity: Item | NPC | Location | Region,
  type: EntityType,
  options: BaseGenerateOptions & { entityStorage?: EntityStorageContextType }
) {
  if (options.entityStorage) {
    if (type === 'region') {
      options.entityStorage.addRegion(entity as Region)
    } else {
      options.entityStorage.addEntity(entity as Item | NPC | Location, type as 'item' | 'npc' | 'location')
    }
  }
  if (options.onEntityCreated) {
    await options.onEntityCreated(entity, type)
  }
}

export async function generateEntityWithContext(
  options: GenerateEntityWithContextOptions
): Promise<GeneratedEntityResult<Item | NPC | Location | Region>> {
  const releaseTimelineContext =
    !hasTimelineContext() && options.gameConfig
      ? pushTimelineContext({
          getTimeline: () => options.gameConfig!.theTimeline,
          setTimeline: (updatedTimeline) => {
            options.gameConfig!.theTimeline = updatedTimeline
          },
          source: 'generateEntityWithContext'
        })
      : null

  let timelineEntry: TimelineEntry | null = null

  try {
    let result: GenerationResult<any>

    switch (options.type) {
      case 'item': {
        const { prompt, gameRules, region, x, y } = options
        result = await createItem(prompt, gameRules, region, x, y)
        await handleEntityStorage(result.entity, 'item', options)
        break
      }
      case 'npc': {
        const { prompt, gameRules, region, x, y } = options
        result = await createNpc(prompt, gameRules, region, x, y)
        await handleEntityStorage(result.entity, 'npc', options)
        break
      }
      case 'location': {
        const { prompt, gameRules, region, x, y } = options
        result = await createLocation(prompt, gameRules, region, x, y)
        await handleEntityStorage(result.entity, 'location', options)
        break
      }
      case 'region': {
        const { prompt, gameRules, regionX, regionY } = options
        result = await createRegion(prompt, gameRules, regionX, regionY)
        await handleEntityStorage(result.entity, 'region', options)
        break
      }
    }

    const { entity } = result
    let timelineText = ''

    switch (options.type) {
      case 'item':
      case 'npc':
      case 'location': {
        const locEntity = entity as Item | NPC | Location
        timelineText = `name: ${locEntity.name} location x:${locEntity.x}, location y:${locEntity.y}, regionname: ${locEntity.region}`
        break
      }
      case 'region': {
        const regionEntity = entity as Region
        timelineText = `${regionEntity.name} regionX:${options.regionX}, regionY:${options.regionY}`
        break
      }
    }

    if (options.changeReason) {
      timelineText += ` reason: ${options.changeReason}`
    }

    const entry = logTimelineEvent(['generation', options.type], timelineText)
    if (entry) {
      timelineEntry = entry
      options.onTimelineEntry?.(entry)
    } else {
      console.warn('[EntityGeneration] Failed to log timeline entry for entity.', {
        entityId: entity.id,
        entityType: options.type,
        timelineText
      })
    }

    return {
      ...result,
      timeline: getActiveTimeline(),
      timelineEntry
    }
  } finally {
    releaseTimelineContext?.()
  }
}

