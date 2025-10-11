import type { Item } from '../types'

// Starting inventory items - items the player has at game start
// These exist in the special 'inventory' region
export const STARTING_INVENTORY_ITEMS: Item[] = [
  { 
    id: 'sword_001', 
    name: 'Sword', 
    rarity: 'common',
    image_url: '',
    description: 'A basic iron sword, standard issue for guards',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'weapon',
    properties: {
      damage: 10,
      equipSlot: 'leftHand'
    }
  },
  { 
    id: 'shield_001', 
    name: 'Shield', 
    rarity: 'common',
    image_url: '',
    description: 'A wooden shield reinforced with iron bands',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'armor',
    properties: {
      defense: 8,
      equipSlot: 'leftHand'
    }
  },
  { 
    id: 'bread_001', 
    name: 'Bread', 
    rarity: 'common',
    image_url: '',
    description: 'A loaf of freshly baked bread',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'food',
    properties: {
      healthRestore: 15,
      hungerRestore: 30
    }
  },
  { 
    id: 'rope_001', 
    name: 'Rope', 
    rarity: 'common',
    image_url: '',
    description: 'A coil of sturdy hemp rope',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'tool',
    properties: {
      length: 50
    }
  },
  { 
    id: 'torch_001', 
    name: 'Torch', 
    rarity: 'rare',
    image_url: '',
    description: 'A wooden torch that burns with an unusually bright flame',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'tool',
    properties: {
      lightRadius: 10,
      duration: 300
    }
  },
  { 
    id: 'map_001', 
    name: 'Map', 
    rarity: 'rare',
    image_url: '',
    description: 'An old parchment map of the medieval kingdom',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'tool',
    properties: {
      reveals: 'medieval_kingdom_001'
    }
  },
]

// World items - items that can be picked up from the environment
// These exist at specific coordinates in the medieval kingdom
export const WORLD_ITEMS: Item[] = [
  { 
    id: 'key_001', 
    name: 'Old Key', 
    rarity: 'rare',
    image_url: '',
    description: 'An old rusty key covered in moss',
    x: 0,
    y: 0,
    region: 'medieval_kingdom_001',
    category: 'key',
    properties: {
      unlocks: 'castle_gate'
    }
  },
  { 
    id: 'potion_001', 
    name: 'Health Potion', 
    rarity: 'epic',
    image_url: '',
    description: 'A glowing red potion that pulses with magical energy',
    x: 0,
    y: 0,
    region: 'medieval_kingdom_001',
    category: 'consumable',
    properties: {
      healthRestore: 50,
      magical: true
    }
  },
  { 
    id: 'scroll_001', 
    name: 'Scroll', 
    rarity: 'legendary',
    image_url: '',
    description: 'An ancient scroll inscribed with glowing runes',
    x: 0,
    y: 0,
    region: 'medieval_kingdom_001',
    category: 'consumable',
    properties: {
      spell: 'fireball',
      uses: 1
    }
  },
]


