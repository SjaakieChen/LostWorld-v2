// Rarity levels for items and NPCs
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

// Item interface - represents any item in the game
export interface Item {
  id: string        // Unique identifier (e.g., 'sword_001')
  name: string      // Display name (e.g., 'Sword')
  rarity: Rarity    // Item rarity level
}

