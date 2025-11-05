import type { GameRules, PlayerStats, PlayerStatus } from '../entity-generation/types'
import type { Timeline } from '../../context/timeline'

// Game configuration structure
export interface GameConfiguration {
  theGuideScratchpad: string  // FREE-FORM TEXT - game design notes, mechanics, key narrative points
  theTimeline: Timeline  // Chronological log of game events with tags
  gameRules: GameRules
  playerStats: OrchestratorPlayerStats  // from orchestrator LLM
  startingLocation: {                    // Starting location coordinates
    region: string
    x: number
    y: number
  }
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

// Orchestrator's player stats format (6 explicit stat name/value/tier pairs)
export interface OrchestratorPlayerStats {
  stat1_name: string
  stat1_value: number
  stat1_tier: number          // Starting tier (1-5)
  stat1_tier_names: string[]  // 5 tier names
  stat2_name: string
  stat2_value: number
  stat2_tier: number
  stat2_tier_names: string[]
  stat3_name: string
  stat3_value: number
  stat3_tier: number
  stat3_tier_names: string[]
  stat4_name: string
  stat4_value: number
  stat4_tier: number
  stat4_tier_names: string[]
  stat5_name: string
  stat5_value: number
  stat5_tier: number
  stat5_tier_names: string[]
  stat6_name: string
  stat6_value: number
  stat6_tier: number
  stat6_tier_names: string[]
}

// Player character interface
export interface PlayerCharacter {
  name: string
  description: string
  stats: PlayerStats  // Converted from OrchestratorPlayerStats
  status: PlayerStatus
  startingLocation: string  // Empty for now
  background: string
  image_url: string  // Full body portrait
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
  'theGuideScratchpad.txt': string
}

// JSON Schema for Gemini 2.5 Pro structured output
export const GAME_CONFIGURATION_SCHEMA = {
  type: 'object',
  properties: {
    theGuideScratchpad: {
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
    playerStats: {
      type: 'object',
      description: 'Player stats/currencies (exactly 6 stats based on game progression system)',
      properties: {
        stat1_name: { type: 'string', description: 'Name of first stat' },
        stat1_value: { type: 'number', description: 'Value 0-100' },
        stat2_name: { type: 'string', description: 'Name of second stat' },
        stat2_value: { type: 'number', description: 'Value 0-100' },
        stat3_name: { type: 'string', description: 'Name of third stat' },
        stat3_value: { type: 'number', description: 'Value 0-100' },
        stat4_name: { type: 'string', description: 'Name of fourth stat' },
        stat4_value: { type: 'number', description: 'Value 0-100' },
        stat5_name: { type: 'string', description: 'Name of fifth stat' },
        stat5_value: { type: 'number', description: 'Value 0-100' },
        stat6_name: { type: 'string', description: 'Name of sixth stat' },
        stat6_value: { type: 'number', description: 'Value 0-100' }
      },
      required: ['stat1_name', 'stat1_value', 'stat2_name', 'stat2_value', 'stat3_name', 'stat3_value', 'stat4_name', 'stat4_value', 'stat5_name', 'stat5_value', 'stat6_name', 'stat6_value']
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
  required: ['theGuideScratchpad', 'gameRules', 'playerStats', 'entitiesToGenerate']
}
