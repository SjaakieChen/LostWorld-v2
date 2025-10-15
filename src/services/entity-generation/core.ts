// Google Gemini Structured Output - Core Constants and Schemas
// Shared definitions used across all entity generation modules

import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { Rarity } from '../../types/base.types'

// API Configuration
export const STRUCTURED_FLASH_LITE_MODEL = GEMINI_CONFIG.models.flashLite
export const STRUCTURED_IMAGE_MODEL = GEMINI_CONFIG.models.flashImage
export const STRUCTURED_API_BASE_URL = GEMINI_CONFIG.apiBase

// JSON Schema for Item entities
export const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description:
        "Auto-generated semantic ID in format: XXX_itemname_### (e.g., 'wea_sword_001', 'arm_shield_wooden_001', 'con_potion_health_001')",
    },
    name: { type: 'string', description: 'Display name of the item' },
    rarity: {
      type: 'string',
      enum: ['common', 'rare', 'epic', 'legendary'] as Rarity[],
      description:
        "Significance level: 'common' = everyday/ordinary, 'rare' = quality/notable, 'epic' = famous/major, 'legendary' = iconic/world-famous",
    },
    description: { type: 'string', description: 'Detailed historical description' },
    category: {
      type: 'string',
      enum: [] as string[], // Will be populated dynamically
      description: 'Item category',
    },
  },
  required: ['id', 'name', 'rarity', 'description'],
}

// JSON Schema for NPC entities
export const NPC_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description:
        "Auto-generated semantic ID in format: XXX_npcname_### (e.g., 'mer_hans_001', 'gua_castle_001', 'que_elder_001')",
    },
    name: { type: 'string', description: 'Display name of the NPC' },
    rarity: {
      type: 'string',
      enum: ['common', 'rare', 'epic', 'legendary'] as Rarity[],
      description:
        "Significance level: 'common' = everyday/ordinary, 'rare' = quality/notable, 'epic' = famous/major, 'legendary' = iconic/world-famous",
    },
    description: { type: 'string', description: 'Detailed historical description' },
    category: {
      type: 'string',
      enum: [] as string[], // Will be populated dynamically
      description: 'NPC category',
    },
  },
  required: ['id', 'name', 'rarity', 'description'],
}

// JSON Schema for Location entities
export const LOCATION_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description:
        "Auto-generated semantic ID in format: XXX_locationname_### (e.g., 'wil_forest_dark_001', 'tow_village_001', 'dun_crypt_001')",
    },
    name: { type: 'string', description: 'Display name of the location' },
    rarity: {
      type: 'string',
      enum: ['common', 'rare', 'epic', 'legendary'] as Rarity[],
      description:
        "Significance level: 'common' = everyday/ordinary, 'rare' = quality/notable, 'epic' = famous/major, 'legendary' = iconic/world-famous",
    },
    description: { type: 'string', description: 'Detailed historical description' },
    category: {
      type: 'string',
      enum: [] as string[], // Will be populated dynamically
      description: 'Location category',
    },
  },
  required: ['id', 'name', 'rarity', 'description'],
}

