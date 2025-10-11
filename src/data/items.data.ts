import type { Item } from '../types'

// Starting inventory items - items the player has at game start
export const STARTING_INVENTORY_ITEMS: Item[] = [
  { id: 'sword_001', name: 'Sword', rarity: 'common' },
  { id: 'shield_001', name: 'Shield', rarity: 'common' },
  { id: 'bread_001', name: 'Bread', rarity: 'common' },
  { id: 'rope_001', name: 'Rope', rarity: 'common' },
  { id: 'torch_001', name: 'Torch', rarity: 'rare' },
  { id: 'map_001', name: 'Map', rarity: 'rare' },
]

// World items - items that can be picked up from the environment
export const WORLD_ITEMS: Item[] = [
  { id: 'key_001', name: 'Old Key', rarity: 'rare' },
  { id: 'potion_001', name: 'Health Potion', rarity: 'epic' },
  { id: 'scroll_001', name: 'Scroll', rarity: 'legendary' },
]

