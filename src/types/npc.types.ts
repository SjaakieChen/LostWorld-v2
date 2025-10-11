import type { Rarity } from './item.types'

// NPC interface - represents non-player characters
export interface NPC {
  id: string        // Unique identifier (e.g., 'npc_guard_001')
  name: string      // Display name (e.g., 'Castle Guard')
  rarity: Rarity    // NPC rarity level
}

