import type { Location } from '../types'

// Game locations - places that can be visited in the game world
// Each location exists at specific coordinates within a region
export const GAME_LOCATIONS: Location[] = [
  {
    id: 'loc_castle_entrance_001',
    name: 'Castle Entrance',
    rarity: 'rare',
    image_url: '',
    description: 'The main gates of an ancient medieval castle. Massive wooden doors stand partially open, guarded by armored sentries.',
    x: 0,
    y: 0,
    region: 'medieval_kingdom_001',
    type: 'building',
    properties: {
      emoji: '🏰'
    }
  },
  {
    id: 'loc_village_001',
    name: 'Village Square',
    rarity: 'common',
    image_url: '',
    description: 'A bustling village square with market stalls and friendly townsfolk.',
    x: 0,
    y: 1,
    region: 'medieval_kingdom_001',
    type: 'town',
    properties: {
      emoji: '🏘️'
    }
  },
  {
    id: 'loc_forest_001',
    name: 'Dark Forest',
    rarity: 'common',
    image_url: '',
    description: 'Dense woods with towering ancient trees that block out most sunlight.',
    x: 1,
    y: 0,
    region: 'medieval_kingdom_001',
    type: 'wilderness',
    properties: {
      emoji: '🌲'
    }
  },
  {
    id: 'loc_road_west_001',
    name: 'Western Road',
    rarity: 'common',
    image_url: '',
    description: 'A dirt road leading west from the castle, worn by countless travelers.',
    x: -1,
    y: 0,
    region: 'medieval_kingdom_001',
    type: 'wilderness',
    properties: {
      emoji: '🛤️'
    }
  },
  {
    id: 'loc_courtyard_001',
    name: 'Castle Courtyard',
    rarity: 'rare',
    image_url: '',
    description: 'An open courtyard within the castle walls, with training dummies and weapon racks.',
    x: 0,
    y: -1,
    region: 'medieval_kingdom_001',
    type: 'building',
    properties: {
      emoji: '⚔️'
    }
  },
  {
    id: 'loc_tavern_001',
    name: 'The Rusty Tankard',
    rarity: 'common',
    image_url: '',
    description: 'A cozy tavern filled with the smell of ale and roasting meat.',
    x: -1,
    y: 1,
    region: 'medieval_kingdom_001',
    type: 'building',
    properties: {
      emoji: '🍺'
    }
  },
  {
    id: 'loc_smithy_001',
    name: 'Blacksmith',
    rarity: 'common',
    image_url: '',
    description: 'A hot smithy where the clang of hammer on anvil rings out.',
    x: 1,
    y: 1,
    region: 'medieval_kingdom_001',
    type: 'building',
    properties: {
      emoji: '🔨'
    }
  },
  {
    id: 'loc_cemetery_001',
    name: 'Ancient Cemetery',
    rarity: 'epic',
    image_url: '',
    description: 'A foggy graveyard with weathered tombstones and an eerie atmosphere.',
    x: -1,
    y: -1,
    region: 'medieval_kingdom_001',
    type: 'wilderness',
    properties: {
      emoji: '⚰️'
    }
  },
  {
    id: 'loc_market_001',
    name: 'Market District',
    rarity: 'common',
    image_url: '',
    description: 'A lively marketplace with merchants hawking their wares.',
    x: 1,
    y: -1,
    region: 'medieval_kingdom_001',
    type: 'town',
    properties: {
      emoji: '🏪'
    }
  },
  // Entry locations for adjacent regions (at 0,0 in each region)
  {
    id: 'loc_mountain_pass_001',
    name: 'Mountain Pass',
    rarity: 'rare',
    image_url: '',
    description: 'A narrow pass through towering snow-covered peaks.',
    x: 0,
    y: 0,
    region: 'northern_mountains_001',
    type: 'wilderness',
    properties: {
      emoji: '⛰️'
    }
  },
  {
    id: 'loc_plains_edge_001',
    name: 'Plains Edge',
    rarity: 'common',
    image_url: '',
    description: 'The beginning of vast grasslands stretching to the horizon.',
    x: 0,
    y: 0,
    region: 'eastern_plains_001',
    type: 'wilderness',
    properties: {
      emoji: '🌾'
    }
  },
  {
    id: 'loc_swamp_entry_001',
    name: 'Swamp Entrance',
    rarity: 'common',
    image_url: '',
    description: 'Murky water and twisted trees mark the entrance to the swamp.',
    x: 0,
    y: 0,
    region: 'southern_swamp_001',
    type: 'wilderness',
    properties: {
      emoji: '🌿'
    }
  },
  {
    id: 'loc_forest_clearing_001',
    name: 'Forest Clearing',
    rarity: 'common',
    image_url: '',
    description: 'A small clearing in the dense western forest.',
    x: 0,
    y: 0,
    region: 'western_forest_001',
    type: 'wilderness',
    properties: {
      emoji: '🌳'
    }
  }
]

// Starting location - where the player begins the game
export const STARTING_LOCATION_ID = 'loc_castle_entrance_001'

