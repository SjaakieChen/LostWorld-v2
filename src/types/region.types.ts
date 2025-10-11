// Region represents a large area in the world map
// Regions do NOT extend GeneratableEntity - they are structural/configuration
export interface Region {
  id: string         // Region identifier (e.g., 'medieval_kingdom_001', 'new_york_001')
  name: string       // Display name (e.g., 'Medieval Kingdom', 'New York')
  regionX: number    // X position in world map grid
  regionY: number    // Y position in world map grid
  properties?: Record<string, any>  // Optional: biome, climate, theme, etc.
}

