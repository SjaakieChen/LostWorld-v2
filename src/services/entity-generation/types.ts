import type { Rarity } from '../../types/base.types'
import type { Attribute } from '../../types/base.types'

// Re-export Attribute type
export type { Attribute }

// Game rules for entity generation
export interface GameRules {
  artStyle: string
  genre: string
  historicalPeriod: string
  categories: {
    [categoryName: string]: {
      attributes: Record<string, AttributeMetadata>
    }
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

// Game context for entity generation
export interface GameContext {
  currentLocation?: string
  nearbyNPCs?: string[]
  nearbyItems?: string[]
  region?: string
  questContext?: string
  playerActions?: string[]
  [key: string]: any
}

// Base entity info bundle
export interface BaseEntityInfo {
  name: string
  rarity: Rarity
  category: string
  description: string
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
    step0: any
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

