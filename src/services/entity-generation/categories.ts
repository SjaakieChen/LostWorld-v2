// Google Gemini Structured Output - Category Constants and ID Generation
// Category definitions and auto-incrementing ID system

// ============================================================================
// CATEGORY ENUMS
// ============================================================================

export const ITEM_CATEGORIES = ['weapon', 'armor', 'consumable']
export const NPC_CATEGORIES = ['merchant', 'guard', 'quest_giver']
export const LOCATION_CATEGORIES = ['town', 'dungeon', 'building', 'wilderness']

// ============================================================================
// CATEGORY PREFIX MAPPINGS
// ============================================================================

export const ITEM_CATEGORY_PREFIXES: Record<string, string> = {
  weapon: 'wea',
  armor: 'arm',
  consumable: 'con',
}

export const NPC_CATEGORY_PREFIXES: Record<string, string> = {
  merchant: 'mer',
  guard: 'gua',
  quest_giver: 'que',
}

export const LOCATION_CATEGORY_PREFIXES: Record<string, string> = {
  town: 'tow',
  dungeon: 'dun',
  building: 'bui',
  wilderness: 'wil',
}

// ============================================================================
// AUTO-INCREMENTING COUNTER SYSTEM
// ============================================================================

/**
 * Counters track how many entities of each category have been generated
 * Structure: { item: { weapon: 2, armor: 1 }, npc: { merchant: 3 }, ... }
 */
const entityCounters: {
  item: Record<string, number>
  npc: Record<string, number>
  location: Record<string, number>
} = {
  item: {},
  npc: {},
  location: {},
}

/**
 * Generate next sequential ID for an entity
 * @param entityType - Type of entity: 'item', 'npc', or 'location'
 * @param category - Category within the entity type (e.g., 'weapon', 'merchant')
 * @param name - Display name of the entity (will be sanitized for ID)
 * @returns Formatted ID like "wea_sword_fire_001"
 */
export function getNextEntityId(
  entityType: 'item' | 'npc' | 'location',
  category: string,
  name: string
): string {
  // Initialize counter for this category if needed
  if (!entityCounters[entityType][category]) {
    entityCounters[entityType][category] = 0
  }

  // Increment counter
  entityCounters[entityType][category]++
  const count = entityCounters[entityType][category]

  // Get prefix mapping based on entity type and category
  let prefix: string
  if (entityType === 'item') {
    prefix = ITEM_CATEGORY_PREFIXES[category]
  } else if (entityType === 'npc') {
    prefix = NPC_CATEGORY_PREFIXES[category]
  } else if (entityType === 'location') {
    prefix = LOCATION_CATEGORY_PREFIXES[category]
  } else {
    prefix = 'unk'
  }

  // Sanitize name for use in ID (lowercase, replace spaces with underscores, remove special chars)
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores

  // Format: XXX_name_###
  const paddedCount = String(count).padStart(3, '0')
  return `${prefix}_${sanitizedName}_${paddedCount}`
}

/**
 * Reset all entity counters (useful for testing or starting fresh)
 */
export function resetCounters(): void {
  entityCounters.item = {}
  entityCounters.npc = {}
  entityCounters.location = {}
  console.log('✅ Entity counters reset')
}

/**
 * Get current counter values (for debugging)
 * @returns Current state of all counters
 */
export function getCounterStats(): {
  item: Record<string, number>
  npc: Record<string, number>
  location: Record<string, number>
} {
  return {
    item: { ...entityCounters.item },
    npc: { ...entityCounters.npc },
    location: { ...entityCounters.location },
  }
}

/**
 * Log current counter stats to console
 */
export function logCounterStats(): void {
  console.log('📊 Entity Counter Stats:', getCounterStats())
}

