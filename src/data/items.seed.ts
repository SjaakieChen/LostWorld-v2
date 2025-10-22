import type { Item } from '../types'

// Starting inventory items - items the player has at game start
// These exist in the special 'inventory' region
export const STARTING_INVENTORY_ITEMS: Item[] = [
  { 
    id: 'ite_sword_wea_001', 
    name: 'Sword', 
    rarity: 'common',
    image_url: '',
    description: 'A basic iron sword, standard issue for guards',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'weapon',
    own_attributes: {
      damage: {
        value: 10,
        type: 'integer',
        description: 'Damage dealt in combat',
        reference: '5=dagger, 10=sword, 20=greatsword'
      },
      equipSlot: {
        value: 'leftHand',
        type: 'string',
        description: 'Equipment slot for this item',
        reference: 'leftHand, rightHand, head, chest, legs, feet'
      }
    }
  },
  { 
    id: 'ite_shield_arm_001', 
    name: 'Shield', 
    rarity: 'common',
    image_url: '',
    description: 'A wooden shield reinforced with iron bands',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'armor',
    own_attributes: {
      defense: {
        value: 8,
        type: 'integer',
        description: 'Defense value against attacks',
        reference: '5=light shield, 8=medium shield, 12=heavy shield'
      },
      equipSlot: {
        value: 'leftHand',
        type: 'string',
        description: 'Equipment slot for this item',
        reference: 'leftHand, rightHand, head, chest, legs, feet'
      }
    }
  },
  { 
    id: 'ite_bread_foo_001', 
    name: 'Bread', 
    rarity: 'common',
    image_url: '',
    description: 'A loaf of freshly baked bread',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'food',
    own_attributes: {
      healthRestore: {
        value: 15,
        type: 'integer',
        description: 'Health points restored when consumed',
        reference: '10=small meal, 15=normal meal, 25=hearty meal'
      },
      hungerRestore: {
        value: 30,
        type: 'integer',
        description: 'Hunger satisfaction when consumed',
        reference: '20=snack, 30=meal, 50=feast'
      }
    }
  },
  { 
    id: 'ite_rope_too_001', 
    name: 'Rope', 
    rarity: 'common',
    image_url: '',
    description: 'A coil of sturdy hemp rope',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'tool',
    own_attributes: {
      length: {
        value: 50,
        type: 'integer',
        description: 'Length of rope in feet',
        reference: '25=short rope, 50=standard rope, 100=long rope'
      }
    }
  },
  { 
    id: 'ite_torch_too_001', 
    name: 'Torch', 
    rarity: 'rare',
    image_url: '',
    description: 'A wooden torch that burns with an unusually bright flame',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'tool',
    own_attributes: {
      lightRadius: {
        value: 10,
        type: 'integer',
        description: 'Radius of light in feet',
        reference: '5=candle, 10=torch, 20=lantern'
      },
      duration: {
        value: 300,
        type: 'integer',
        description: 'Burn time in minutes',
        reference: '60=short burn, 300=standard, 600=long burn'
      }
    }
  },
  { 
    id: 'ite_map_too_001', 
    name: 'Map', 
    rarity: 'rare',
    image_url: '',
    description: 'An old parchment map of the medieval kingdom',
    x: 0,
    y: 0,
    region: 'inventory',
    category: 'tool',
    own_attributes: {
      reveals: {
        value: 'region_medieval_kingdom_001',
        type: 'string',
        description: 'Region revealed by this map',
        reference: 'region_medieval_kingdom_001=main kingdom, region_northern_mountains_001=mountains'
      }
    }
  },
]

// World items - items that can be picked up from the environment
// These exist at specific coordinates in the medieval kingdom
export const WORLD_ITEMS: Item[] = [
  { 
    id: 'ite_key_key_001', 
    name: 'Old Key', 
    rarity: 'rare',
    image_url: '',
    description: 'An old rusty key covered in moss',
    x: 0,
    y: 0,
    region: 'region_medieval_kingdom_001',
    category: 'key',
    own_attributes: {
      unlocks: {
        value: 'castle_gate',
        type: 'string',
        description: 'What this key unlocks',
        reference: 'castle_gate=main entrance, treasure_chest=valuables, dungeon_door=prison'
      }
    }
  },
  { 
    id: 'ite_potion_con_001', 
    name: 'Health Potion', 
    rarity: 'epic',
    image_url: '',
    description: 'A glowing red potion that pulses with magical energy',
    x: 0,
    y: 0,
    region: 'region_medieval_kingdom_001',
    category: 'consumable',
    own_attributes: {
      healthRestore: {
        value: 50,
        type: 'integer',
        description: 'Health points restored when consumed',
        reference: '25=minor potion, 50=major potion, 100=greater potion'
      },
      magical: {
        value: true,
        type: 'boolean',
        description: 'Whether this item has magical properties',
        reference: 'true=enchanted, false=mundane'
      }
    }
  },
  { 
    id: 'ite_scroll_con_001', 
    name: 'Scroll', 
    rarity: 'legendary',
    image_url: '',
    description: 'An ancient scroll inscribed with glowing runes',
    x: 0,
    y: 0,
    region: 'region_medieval_kingdom_001',
    category: 'consumable',
    own_attributes: {
      spell: {
        value: 'fireball',
        type: 'string',
        description: 'Spell contained in this scroll',
        reference: 'fireball=damage spell, heal=restoration, teleport=movement'
      },
      uses: {
        value: 1,
        type: 'integer',
        description: 'Number of times this scroll can be used',
        reference: '1=single use, 3=multiple uses, 0=unlimited'
      }
    }
  },
]


