import type { GameRules, PlayerStats, PlayerStatus } from '../entity-generation/types'

// Game configuration structure
export interface GameConfiguration {
  scratchpad: string  // FREE-FORM TEXT - game design notes, mechanics, key narrative points
  gameRules: GameRules
  entitiesToGenerate: {
    regions: RegionSpec[]
    locations: LocationSpec[]
    npcs: NpcSpec[]
    items: ItemSpec[]
  }
}

// Entity generation specifications
export interface RegionSpec {
  name: string
  theme: string
  biome: string
  description: string
  regionX: number
  regionY: number
}

export interface LocationSpec {
  prompt: string  // Prompt for createLocation()
  region: string
  x: number       // X coordinate in km (must be integer)
  y: number       // Y coordinate in km (must be integer)
  significance: string  // Why this location matters
}

export interface NpcSpec {
  prompt: string  // Prompt for createNpc()
  region: string  // Region where NPC is located
  x: number       // X coordinate in km (must be integer)
  y: number       // Y coordinate in km (must be integer)
  significance: string  // Their role in the narrative
}

export interface ItemSpec {
  prompt: string  // Prompt for createItem()
  region: string  // Region where item is located
  x: number       // X coordinate in km (must be integer)
  y: number       // Y coordinate in km (must be integer)
  significance: string  // Why this item matters
}

// Player character interface (placeholder for future implementation)
export interface PlayerCharacter {
  name: string
  stats: PlayerStats
  status: PlayerStatus
  startingLocation: string
  background: string
}

// Generated entities result
export interface GeneratedEntities {
  regions: any[]  // Will be Region[] from types
  locations: any[]  // Will be Location[] from types
  npcs: any[]  // Will be NPC[] from types
  items: any[]  // Will be Item[] from types
}

// Seed file output
export interface SeedFiles {
  'items.seed.ts': string
  'npcs.seed.ts': string
  'locations.seed.ts': string
  'regions.data.ts': string
  'game-config.json': string
  'scratchpad.txt': string
}

// JSON Schema for Gemini 2.5 Pro structured output
export const GAME_CONFIGURATION_SCHEMA = {
  type: 'object',
  properties: {
    scratchpad: {
      type: 'string',
      description: 'Plain text game design notes, narrative, mechanics, and key entities'
    },
    gameRules: {
      type: 'object',
      properties: {
        historicalPeriod: { type: 'string' },
        genre: { type: 'string' },
        artStyle: { type: 'string' },
        categories: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              attributes: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    description: { type: 'string' },
                    reference: { type: 'string' }
                  },
                  required: ['type', 'description', 'reference']
                }
              }
            }
          }
        }
      },
      required: ['historicalPeriod', 'genre', 'artStyle', 'categories']
    },
    entitiesToGenerate: {
      type: 'object',
      properties: {
        regions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              theme: { type: 'string' },
              biome: { type: 'string' },
              description: { type: 'string' },
              regionX: { type: 'number' },
              regionY: { type: 'number' }
            },
            required: ['name', 'theme', 'biome', 'description', 'regionX', 'regionY']
          }
        },
        locations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              prompt: { type: 'string' },
              region: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              significance: { type: 'string' }
            },
            required: ['prompt', 'region', 'x', 'y', 'significance']
          }
        },
        npcs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              prompt: { type: 'string' },
              region: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              significance: { type: 'string' }
            },
            required: ['prompt', 'region', 'x', 'y', 'significance']
          }
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              prompt: { type: 'string' },
              region: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              significance: { type: 'string' }
            },
            required: ['prompt', 'region', 'x', 'y', 'significance']
          }
        }
      },
      required: ['regions', 'locations', 'npcs', 'items']
    }
  },
  required: ['scratchpad', 'gameRules', 'entitiesToGenerate']
}
