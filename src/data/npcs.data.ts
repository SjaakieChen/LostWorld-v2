import type { NPC } from '../types'

// Game NPCs - non-player characters in the game world
// Each NPC exists at specific coordinates in the medieval kingdom
export const GAME_NPCS: NPC[] = [
  { 
    id: 'npc_guard_001', 
    name: 'Castle Guard', 
    rarity: 'common',
    image_url: '',
    description: 'A stern-looking guard in chainmail armor, watching the castle entrance',
    x: 0,
    y: 0,
    region: 'medieval_kingdom_001',
    chatHistory: [],  // Will store all conversations with this NPC
    role: 'guard',
    properties: {
      hostile: false,
      faction: 'castle',
      greeting: 'Halt! State your business at the castle.'
    }
  },
  { 
    id: 'npc_merchant_001', 
    name: 'Merchant', 
    rarity: 'rare',
    image_url: '',
    description: 'A jovial merchant with a colorful cart full of exotic goods',
    x: 0,
    y: 0,
    region: 'medieval_kingdom_001',
    chatHistory: [],
    role: 'merchant',
    properties: {
      hostile: false,
      faction: 'merchants_guild',
      greeting: 'Welcome, traveler! Care to browse my wares?',
      inventory: ['potion_002', 'map_002']
    }
  },
]


