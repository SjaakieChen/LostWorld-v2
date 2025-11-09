import type { Location } from '../types'

// Game locations - places that can be visited in the game world
// Each location exists at specific coordinates within a region
export const GAME_LOCATIONS: Location[] = [
  {
    id: 'loc_castle_entrance_bui_001',
    name: 'Castle Entrance',
    rarity: 'rare',
    image_url: '',
    visualDescription: 'Massive timber gates flanked by stone towers and armored sentries.',
    functionalDescription: 'Primary entrance to the castle, controlling access to inner courts.',
    x: 0,
    y: 0,
    region: 'region_medieval_kingdom_001',
    category: 'building',
    own_attributes: {
      emoji: {
        value: '🏰',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_village_tow_001',
    name: 'Village Square',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Cobblestone plaza dotted with market stalls and chatting villagers.',
    functionalDescription: 'Central hub for trading, gossip, and local events.',
    x: 0,
    y: 1,
    region: 'region_medieval_kingdom_001',
    category: 'town',
    own_attributes: {
      emoji: {
        value: '🏘️',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_forest_wil_001',
    name: 'Dark Forest',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Shadowy forest of towering pines and moss-draped undergrowth.',
    functionalDescription: 'Exploration area rumored to hide creatures and hidden paths.',
    x: 1,
    y: 0,
    region: 'region_medieval_kingdom_001',
    category: 'wilderness',
    own_attributes: {
      emoji: {
        value: '🌲',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_road_west_wil_001',
    name: 'Western Road',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Well-worn dirt road stretching toward the western horizon.',
    functionalDescription: 'Safe travel route connecting the castle to frontier settlements.',
    x: -1,
    y: 0,
    region: 'region_medieval_kingdom_001',
    category: 'wilderness',
    own_attributes: {
      emoji: {
        value: '🛤️',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_courtyard_bui_001',
    name: 'Castle Courtyard',
    rarity: 'rare',
    image_url: '',
    visualDescription: 'Open yard with training dummies, weapon racks, and banners.',
    functionalDescription: 'Training grounds where guards practice and brief before missions.',
    x: 0,
    y: -1,
    region: 'region_medieval_kingdom_001',
    category: 'building',
    own_attributes: {
      emoji: {
        value: '⚔️',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_tavern_bui_001',
    name: 'The Rusty Tankard',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Warm tavern interior lit by hearthfire and laden with wooden mugs.',
    functionalDescription: 'Social gathering spot for rumors, quests, and restoring energy.',
    x: -1,
    y: 1,
    region: 'region_medieval_kingdom_001',
    category: 'building',
    own_attributes: {
      emoji: {
        value: '🍺',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_smithy_bui_001',
    name: 'Blacksmith',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Forge lit in orange glow, anvils lined with half-finished blades.',
    functionalDescription: 'Forge where weapons and armor are crafted or repaired.',
    x: 1,
    y: 1,
    region: 'region_medieval_kingdom_001',
    category: 'building',
    own_attributes: {
      emoji: {
        value: '🔨',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_cemetery_wil_001',
    name: 'Ancient Cemetery',
    rarity: 'epic',
    image_url: '',
    visualDescription: 'Fog-shrouded graveyard with crooked tombstones and dying trees.',
    functionalDescription: 'Haunting location tied to spectral encounters and lore.',
    x: -1,
    y: -1,
    region: 'region_medieval_kingdom_001',
    category: 'wilderness',
    own_attributes: {
      emoji: {
        value: '⚰️',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_market_tow_001',
    name: 'Market District',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Crowded district of stalls, awnings, and shouting vendors.',
    functionalDescription: 'Bustling trade quarter offering rare goods and supplies.',
    x: 1,
    y: -1,
    region: 'region_medieval_kingdom_001',
    category: 'town',
    own_attributes: {
      emoji: {
        value: '🏪',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  // Entry locations for adjacent regions (at 0,0 in each region)
  {
    id: 'loc_mountain_pass_wil_001',
    name: 'Mountain Pass',
    rarity: 'rare',
    image_url: '',
    visualDescription: 'Snow-choked pass carved between jagged mountain cliffs.',
    functionalDescription: 'Gateway into the northern mountains and higher-tier challenges.',
    x: 0,
    y: 0,
    region: 'region_northern_mountains_001',
    category: 'wilderness',
    own_attributes: {
      emoji: {
        value: '⛰️',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_plains_edge_wil_001',
    name: 'Plains Edge',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Wind-swept plains of tall grass rolling toward a distant sun.',
    functionalDescription: 'Transition point leading into the fertile eastern territories.',
    x: 0,
    y: 0,
    region: 'region_eastern_plains_001',
    category: 'wilderness',
    own_attributes: {
      emoji: {
        value: '🌾',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_swamp_entry_wil_001',
    name: 'Swamp Entrance',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Murky marsh dotted with twisted roots and slow-moving water.',
    functionalDescription: 'Entry point into the southern swamp and its hidden dangers.',
    x: 0,
    y: 0,
    region: 'region_southern_swamp_001',
    category: 'wilderness',
    own_attributes: {
      emoji: {
        value: '🌿',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  },
  {
    id: 'loc_forest_clearing_wil_001',
    name: 'Forest Clearing',
    rarity: 'common',
    image_url: '',
    visualDescription: 'Sunlit glade surrounded by towering evergreens and soft moss.',
    functionalDescription: 'Safe rest spot within the western forest, ideal for regrouping.',
    x: 0,
    y: 0,
    region: 'region_western_forest_001',
    category: 'wilderness',
    own_attributes: {
      emoji: {
        value: '🌳',
        type: 'string',
        description: 'Visual representation',
        reference: '🏰=castle, 🏘️=village, 🌲=forest'
      }
    }
  }
]

// Starting location - where the player begins the game
export const STARTING_LOCATION_ID = 'loc_castle_entrance_bui_001'

