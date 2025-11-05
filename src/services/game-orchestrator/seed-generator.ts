import type { GameConfiguration, GeneratedEntities, SeedFiles } from './types'

/**
 * Generate TypeScript seed files from generated entities
 * 
 * @param entities - Generated entities
 * @param config - Game configuration
 * @returns SeedFiles object with file contents
 */
export function generateSeedFiles(
  entities: GeneratedEntities,
  config: GameConfiguration
): SeedFiles {
  return {
    'items.seed.ts': formatItemsSeed(entities.items),
    'npcs.seed.ts': formatNpcsSeed(entities.npcs),
    'locations.seed.ts': formatLocationsSeed(entities.locations),
    'regions.data.ts': formatRegionsSeed(entities.regions),
    'game-config.json': JSON.stringify(config, null, 2),
    'theGuideScratchpad.txt': config.theGuideScratchpad
  }
}

/**
 * Format items as TypeScript seed file
 */
function formatItemsSeed(items: any[]): string {
  const imports = `import type { Item } from '../../types'

// Generated items for the game
export const WORLD_ITEMS: Item[] = [`

  const itemExports = items.map(item => {
    return `  {
    id: '${item.id}',
    name: '${item.name}',
    rarity: '${item.rarity}',
    category: '${item.category}',
    description: '${item.description.replace(/'/g, "\\'")}',
    image_url: '${item.image_url}',
    x: ${item.x},
    y: ${item.y},
    region: '${item.region}',
    own_attributes: ${JSON.stringify(item.own_attributes, null, 6).replace(/^/gm, '    ')}
  }`
  }).join(',\n')

  return `${imports}
${itemExports}
]

// Starting inventory items (empty for now - will be populated by player creation)
export const STARTING_INVENTORY_ITEMS: Item[] = []
`
}

/**
 * Format NPCs as TypeScript seed file
 */
function formatNpcsSeed(npcs: any[]): string {
  const imports = `import type { NPC } from '../../types'

// Generated NPCs for the game
export const GAME_NPCS: NPC[] = [`

  const npcExports = npcs.map(npc => {
    return `  {
    id: '${npc.id}',
    name: '${npc.name}',
    rarity: '${npc.rarity}',
    category: '${npc.category}',
    description: '${npc.description.replace(/'/g, "\\'")}',
    image_url: '${npc.image_url}',
    x: ${npc.x},
    y: ${npc.y},
    region: '${npc.region}',
    chatHistory: [],
    own_attributes: ${JSON.stringify(npc.own_attributes, null, 6).replace(/^/gm, '    ')}
  }`
  }).join(',\n')

  return `${imports}
${npcExports}
]
`
}

/**
 * Format locations as TypeScript seed file
 */
function formatLocationsSeed(locations: any[]): string {
  const imports = `import type { Location } from '../../types'

// Generated locations for the game
export const GAME_LOCATIONS: Location[] = [`

  const locationExports = locations.map(location => {
    return `  {
    id: '${location.id}',
    name: '${location.name}',
    rarity: '${location.rarity}',
    category: '${location.category}',
    description: '${location.description.replace(/'/g, "\\'")}',
    image_url: '${location.image_url}',
    x: ${location.x},
    y: ${location.y},
    region: '${location.region}',
    own_attributes: ${JSON.stringify(location.own_attributes, null, 6).replace(/^/gm, '    ')}
  }`
  }).join(',\n')

  // Find the starting location (first location or one marked as starting)
  const startingLocation = locations[0] || locations.find(loc => 
    loc.name.toLowerCase().includes('starting') || 
    loc.name.toLowerCase().includes('home')
  )

  const startingLocationId = startingLocation ? startingLocation.id : locations[0]?.id || 'unknown'

  return `${imports}
${locationExports}
]

// Starting location - where the player begins the game
export const STARTING_LOCATION_ID = '${startingLocationId}'
`
}

/**
 * Format regions as TypeScript seed file
 */
function formatRegionsSeed(regions: any[]): string {
  const imports = `import type { Region } from '../../types'

// Generated regions for the game
export const GAME_REGIONS: Region[] = [`

  const regionExports = regions.map(region => {
    return `  {
    id: '${region.id}',
    name: '${region.name}',
    regionX: ${region.regionX},
    regionY: ${region.regionY},
    properties: {
      theme: '${region.properties.theme}',
      biome: '${region.properties.biome}',
      description: '${region.properties.description.replace(/'/g, "\\'")}'
    }
  }`
  }).join(',\n')

  return `${imports}
${regionExports}
]
`
}

/**
 * Generate a summary of the generated game
 * 
 * @param entities - Generated entities
 * @param config - Game configuration
 * @returns Summary string
 */
export function generateGameSummary(entities: GeneratedEntities, config: GameConfiguration): string {
  const summary = `
GAME CONFIGURATION SUMMARY
==========================

Character: ${config.theGuideScratchpad.split('\n')[0]?.replace('GAME:', '').trim() || 'Unknown'}

Generated Entities:
- Regions: ${entities.regions.length}
- Locations: ${entities.locations.length}
- NPCs: ${entities.npcs.length}
- Items: ${entities.items.length}

Game Rules:
- Historical Period: ${config.gameRules.historicalPeriod}
- Genre: ${config.gameRules.genre}
- Art Style: ${config.gameRules.artStyle}

Categories:
- Items: ${config.gameRules.itemCategories.map(c => c.name).join(', ')}
- NPCs: ${config.gameRules.npcCategories.map(c => c.name).join(', ')}
- Locations: ${config.gameRules.locationCategories.map(c => c.name).join(', ')}

Guide Scratchpad Preview:
${config.theGuideScratchpad.substring(0, 200)}${config.theGuideScratchpad.length > 200 ? '...' : ''}
`

  return summary
}
