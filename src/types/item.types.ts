import type { GeneratableEntity } from './base.types'

// Item interface - represents any item in the game
// Extends GeneratableEntity to include spatial and visual data
export interface Item extends GeneratableEntity {
  category?: string  // Optional: 'weapon', 'armor', 'food', 'consumable', 'tool', etc.
}

