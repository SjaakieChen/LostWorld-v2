import type { GeneratableEntity } from './base.types'

// Location interface - represents places in the game world
// Extends GeneratableEntity to include spatial and visual data
export interface Location extends GeneratableEntity {
  type?: string  // Optional: 'town', 'dungeon', 'building', 'wilderness', 'landmark', etc.
}

