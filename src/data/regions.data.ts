import type { Region } from '../types'

// Game regions - large areas in the world map
// Positioned relative to each other via regionX, regionY coordinates
export const GAME_REGIONS: Region[] = [
  {
    id: 'medieval_kingdom_001',
    name: 'Medieval Kingdom',
    regionX: 0,
    regionY: 0,
    properties: {
      theme: 'medieval',
      biome: 'temperate',
      description: 'A land of castles and knights'
    }
  },
  {
    id: 'northern_mountains_001',
    name: 'Northern Mountains',
    regionX: 0,
    regionY: -1,
    properties: {
      theme: 'mountainous',
      biome: 'cold',
      description: 'Harsh snow-capped peaks and frozen valleys'
    }
  },
  {
    id: 'eastern_plains_001',
    name: 'Eastern Plains',
    regionX: 1,
    regionY: 0,
    properties: {
      theme: 'grassland',
      biome: 'temperate',
      description: 'Vast rolling grasslands stretching to the horizon'
    }
  },
  {
    id: 'southern_swamp_001',
    name: 'Southern Swamp',
    regionX: 0,
    regionY: 1,
    properties: {
      theme: 'swamp',
      biome: 'humid',
      description: 'Murky wetlands filled with mist and mystery'
    }
  },
  {
    id: 'western_forest_001',
    name: 'Western Forest',
    regionX: -1,
    regionY: 0,
    properties: {
      theme: 'forest',
      biome: 'temperate',
      description: 'Dense ancient woods stretching endlessly to the west'
    }
  }
]

