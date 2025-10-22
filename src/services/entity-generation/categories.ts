// Google Gemini Structured Output - Category Constants and ID Generation
// Category definitions and auto-incrementing ID system

// ============================================================================
// CATEGORY ENUMS
// ============================================================================

export const ITEM_CATEGORIES = ['weapon', 'armor', 'consumable', 'tool', 'food', 'key']
export const NPC_CATEGORIES = ['merchant', 'guard', 'quest_giver', 'bandit', 'villager']
export const LOCATION_CATEGORIES = ['town', 'dungeon', 'building', 'wilderness']

// ============================================================================
// AUTO-INCREMENTING COUNTER SYSTEM
// ============================================================================

/**
 * Counters track how many entities of each category have been generated
 * Structure: { item: { weapon: 2, armor: 1 }, npc: { merchant: 3 }, ... }
 */
const entityCounters: {
  item: Record<string, number>,
  npc: Record<string, number>,
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
 * @returns Formatted ID like "ite_sword_wea_001"
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

  // Entity type prefix
  const typePrefix = entityType === 'item' ? 'ite' : entityType === 'npc' ? 'npc' : 'loc'
  
  // Category prefix (first 3 letters)
  const categoryPrefix = category.substring(0, 3)

  // Sanitize name for use in ID (lowercase, replace spaces with underscores, remove special chars)
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores

  // Format: <type>_<name>_<category>_<number>
  const paddedCount = String(count).padStart(3, '0')
  return `${typePrefix}_${sanitizedName}_${categoryPrefix}_${paddedCount}`
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

