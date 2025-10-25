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

// ============================================================
// GAME CONTEXT HELPER TYPES
// ============================================================

// Location summary for context
export interface LocationSummary {
  id: string
  name: string
  description: string
  category: string
  x: number
  y: number
  region: string
  rarity: Rarity
}

// Region summary for context
export interface RegionSummary {
  id: string
  name: string
  theme: string
  biome: string
  description: string
  regionX: number
  regionY: number
}

// Nearby entity summary
export interface NearbyEntity {
  id: string
  name: string
  category: string
  rarity: Rarity
  distance?: number
  direction?: string
}

// Player stats structure
export interface PlayerStats {
  strength: number
  dexterity: number
  intelligence: number
  wisdom: number
  stealth: number
  charisma: number
}

// Player status/resources
export interface PlayerStatus {
  health: number
  maxHealth: number
  stamina: number
  maxStamina: number
  hunger: number
  maxHunger: number
  mana: number
  maxMana: number
}

// Quest information
export interface QuestInfo {
  id: string
  name: string
  description: string
  objectives: string[]
  questGiver?: string
}

// NPC relationship tracking
export interface NPCRelationship {
  npcId: string
  npcName: string
  trustLevel: number
  conversationHistory: number
  tradedWith: boolean
  questsCompleted: number
}

// ============================================================
// GAME CONTEXT - Comprehensive context for entity generation
// ============================================================

export interface GameContext {
  // ============================================================
  // SPATIAL - Where things are happening
  // ============================================================
  spatial?: {
    currentLocation: LocationSummary
    currentRegion: RegionSummary
    adjacentRegions?: {
      north?: string
      south?: string
      east?: string
      west?: string
    }
    nearbyLocations?: Array<{
      id: string
      name: string
      category: string
      distance: number
      direction: string
    }>
  }

  // ============================================================
  // ENTITIES - What's around the player
  // ============================================================
  entities?: {
    nearbyNPCs?: Array<NearbyEntity & { relationshipStatus?: string }>
    nearbyItems?: NearbyEntity[]
    activeNPC?: {
      id: string
      name: string
      category: string
      conversationTurns: number
    }
  }

  // ============================================================
  // PLAYER - Character state and capabilities
  // ============================================================
  player?: {
    level?: number
    stats: PlayerStats
    status: PlayerStatus
    conditions?: string[]  // ["poisoned", "blessed", "cursed"]
  }

  // ============================================================
  // INVENTORY - What the player has
  // ============================================================
  inventory?: {
    totalItems: number
    emptySlots: number
    rarityDistribution: {
      common: number
      rare: number
      epic: number
      legendary: number
    }
    categories: string[]
    notableItems?: string[]  // Names of legendary/epic items
  }

  equipment?: {
    equippedSlots: string[]  // ["head", "chest", "leftHand"]
    totalDefense?: number
    totalAttack?: number
    notableEquipment?: string[]  // Names of equipped legendary items
  }

  // ============================================================
  // WORLD STATE - Time and environmental conditions
  // ============================================================
  world?: {
    timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night' | 'midnight'
    season: 'spring' | 'summer' | 'fall' | 'winter'
    weather: 'clear' | 'rain' | 'storm' | 'snow' | 'fog'
  }

  // ============================================================
  // NARRATIVE - Story, quests, and events
  // ============================================================
  narrative?: {
    activeQuests?: QuestInfo[]
    completedQuests?: string[]
    recentEvents?: string[]  // ["defeated_dragon", "saved_village"]
    playerActions?: string[]  // ["just_entered_location", "just_spoke_to_npc"]
  }

  // ============================================================
  // EXPLORATION - Discovery and knowledge
  // ============================================================
  exploration?: {
    totalLocationsExplored: number
    regionsVisited: string[]
    unexploredNearby: number
    isFirstVisit: boolean
  }

  // ============================================================
  // RELATIONSHIPS - Social dynamics
  // ============================================================
  relationships?: {
    npcRelationships: Record<string, NPCRelationship>
    reputation?: {
      faction?: string
      level: number  // -100 to 100
    }
  }

  // ============================================================
  // COMBAT - Danger and threat level
  // ============================================================
  combat?: {
    dangerLevel: 'safe' | 'low' | 'moderate' | 'high' | 'extreme'
    recentCombat: boolean
    enemiesNearby: number
    playerCombatStyle?: 'aggressive' | 'defensive' | 'stealthy' | 'magical'
  }

  // ============================================================
  // ECONOMY - Wealth and trade
  // ============================================================
  economy?: {
    playerWealth: number
    localProsperity: 'poor' | 'modest' | 'prosperous' | 'wealthy'
    commonGoods?: string[]
    rareGoods?: string[]
    recentTrades?: Array<{
      item: string
      value: number
      tradedWith?: string
    }>
  }

  // ============================================================
  // GENERATION META - Control and preferences
  // ============================================================
  meta?: {
    generationPurpose?: 'quest_reward' | 'random_encounter' | 'shop_inventory' | 'dungeon_loot' | 'world_building'
    expectedRarityRange?: Rarity[]
    preferredThemes?: string[]  // ["mysterious", "heroic", "dark"]
    avoidThemes?: string[]  // ["horror", "comedic"]
    targetEntityCategory?: string  // Suggest specific category
  }
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

