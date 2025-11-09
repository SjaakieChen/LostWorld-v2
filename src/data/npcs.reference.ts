import type { NPC } from '../types'

// Game NPCs - non-player characters in the game world
// Each NPC exists at specific coordinates in the medieval kingdom
export const GAME_NPCS: NPC[] = [
  { 
    id: 'npc_guard_gua_001', 
    name: 'Castle Guard', 
    rarity: 'common',
    image_url: '',
    visualDescription: 'Stern guard in chainmail with polished halberd and crested surcoat.',
    functionalDescription: 'Maintains security at the castle gate and challenges intruders.',
    x: 0,
    y: 0,
    region: 'region_medieval_kingdom_001',
    chatHistory: [],  // Will store all conversations with this NPC
    category: 'guard',
    own_attributes: {
      hostile: {
        value: false,
        type: 'boolean',
        description: 'Whether NPC is hostile to player',
        reference: 'true=enemy, false=friendly/neutral'
      },
      faction: {
        value: 'castle',
        type: 'string',
        description: 'NPC faction affiliation',
        reference: 'castle, merchants_guild, bandits, neutral'
      },
      greeting: {
        value: 'Halt! State your business at the castle.',
        type: 'string',
        description: 'Initial greeting message',
        reference: 'Standard greeting when player approaches'
      }
    }
  },
  { 
    id: 'npc_merchant_mer_001', 
    name: 'Merchant', 
    rarity: 'rare',
    image_url: '',
    visualDescription: 'Jovial trader in layered robes beside a cart of exotic goods.',
    functionalDescription: 'Buys and sells rare items while sharing rumors with travelers.',
    x: 0,
    y: 0,
    region: 'region_medieval_kingdom_001',
    chatHistory: [],
    category: 'merchant',
    own_attributes: {
      hostile: {
        value: false,
        type: 'boolean',
        description: 'Whether NPC is hostile to player',
        reference: 'true=enemy, false=friendly/neutral'
      },
      faction: {
        value: 'merchants_guild',
        type: 'string',
        description: 'NPC faction affiliation',
        reference: 'castle, merchants_guild, bandits, neutral'
      },
      greeting: {
        value: 'Welcome, traveler! Care to browse my wares?',
        type: 'string',
        description: 'Initial greeting message',
        reference: 'Standard greeting when player approaches'
      },
      inventory: {
        value: ['ite_potion_con_002', 'ite_map_too_002'],
        type: 'array',
        description: 'Items available for trade',
        reference: 'Array of item IDs this merchant sells'
      }
    }
  },
]


