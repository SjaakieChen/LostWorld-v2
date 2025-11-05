import type { Rarity } from '../../types/base.types'
import type { Attribute } from '../../types/base.types'

// Re-export Attribute type
export type { Attribute }

// Game rules for entity generation
export interface GameRules {
  artStyle: string
  genre: string
  historicalPeriod: string
  itemCategories: CategoryDefinition[]
  npcCategories: CategoryDefinition[]
  locationCategories: CategoryDefinition[]
}

export interface CategoryDefinition {
  name: string
  attributes: AttributeDefinition[]
}

export interface AttributeDefinition {
  name: string
  type: 'integer' | 'number' | 'string' | 'boolean' | 'array'
  description: string
  reference: string
  range?: {
    min: number
    max: number
  }
}

// Attribute metadata (stored in library)
export interface AttributeMetadata {
  type: 'integer' | 'number' | 'string' | 'boolean' | 'array'
  description: string
  reference: string
  range?: {
    min: number
    max: number
  }
}


// Player stat structure with tier system
export interface PlayerStat {
  value: number        // 0-100
  tier: number         // 1-5
  tierNames: string[]  // 5 tier names from orchestrator
}

// Player stats structure - dynamic stats per game with tier info
export interface PlayerStats {
  [statName: string]: PlayerStat  // Dynamic stats like renown, wealth, athleticism
}

// Player status/resources - health and energy only
export interface PlayerStatus {
  health: number
  maxHealth: number
  energy: number
  maxEnergy: number
}


// Base entity info bundle
export interface BaseEntityInfo {
  name: string
  rarity: Rarity
  category: string
  visualDescription: string
  functionalDescription: string
  historicalPeriod: string
}

// Generation result
export interface GenerationResult<T> {
  entity: T
  newAttributes: Record<string, Attribute & { category: string }>
  timing: {
    baseEntity: string
    attributes: string
    image: string
    total: string
  }
  debugData: {
    step1: any
    step2: any
    step3: any
  }
}

// API response types
export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

