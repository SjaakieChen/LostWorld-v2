import type { GeneratableEntity } from './base.types'

// Location interface - represents places in the game world
// Extends GeneratableEntity to include spatial and visual data
export interface Location extends GeneratableEntity {
  category?: string  // Optional: 'town', 'dungeon', 'building', 'wilderness', 'landmark', etc.
  purpose: string  // Intended use/role of this location in the game, or "generic" if no specific purpose
}

