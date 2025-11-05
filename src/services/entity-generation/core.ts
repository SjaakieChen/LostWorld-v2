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
    name: { type: 'string', description: 'Display name of the item' },
    rarity: {
      type: 'string',
      enum: ['common', 'rare', 'epic', 'legendary'] as Rarity[],
      description:
        "Significance level: 'common' = everyday commodoties for the time, 'rare' = a valued item for ordinary people like an iron axe or carved figurehead, 'epic' = notable item that wasnt accessible to the average person, 'legendary' = iconic/world-famous historical artifacts that would be known to history lovers",
    },
    visualDescription: { type: 'string', description: 'give a description of the item that would allow a painter to create a image of this item' },
    functionalDescription: { type: 'string', description: 'what did the prompt ask for this item and its purpose. If not clear then output "generic"' },
    category: {
      type: 'string',
      enum: [] as string[], // Will be populated dynamically
      description: 'Item category',
    },
    purpose: {
      type: 'string',
      description: "Intended use/role of this item in the game. Output 'generic' if no clear purpose is found in the prompt",
    },
  },
  required: ['name', 'rarity', 'visualDescription', 'functionalDescription', 'category', 'purpose'],
}

// JSON Schema for NPC entities
export const NPC_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Display name of the NPC' },
    rarity: {
      type: 'string',
      enum: ['common', 'rare', 'epic', 'legendary'] as Rarity[],
      description:
        "Significance level: 'common' = everyday/generic person, 'rare' = generic person with a unique trait, 'epic' = notable historical figure or generic person with an iconic job or role in that time period, 'legendary' = iconic/world-famous historical figure that modern people would know about",
    },
    visualDescription: { type: 'string', description: 'give a description of the person that would allow a painter to create a portrait of this person' },
    functionalDescription: { type: 'string', description: 'what did the prompt ask for this npc and its purpose. If not clear then output "generic"' },
    category: {
      type: 'string',
      enum: [] as string[], // Will be populated dynamically
      description: 'NPC category',
    },
    purpose: {
      type: 'string',
      description: "Intended use/role of this NPC in the game. Output 'generic' if no clear purpose is found in the prompt",
    },
  },
  required: ['name', 'rarity', 'visualDescription', 'functionalDescription', 'category', 'purpose'],
}

// JSON Schema for Location entities
export const LOCATION_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Display name of the location' },
    rarity: {
      type: 'string',
      enum: ['common', 'rare', 'epic', 'legendary'] as Rarity[],
      description:
        "Significance level: 'common' = generic place, 'rare' = a place that would have a name that the people living nearby would know, 'epic' = a place that is known by the people from that time period around the region, 'legendary' = iconic/world-famous place that modern people would know about",
    },
    visualDescription: { type: 'string', description: 'give a description of the location that would allow a painter to create a image of this location' },
    functionalDescription: { type: 'string', description: 'what did the prompt ask for this location and its purpose. If not clear then output "generic"' },
    category: {
      type: 'string',
      enum: [] as string[], // Will be populated dynamically
      description: 'Location category',
    },
    purpose: {
      type: 'string',
      description: "Intended use/role of this location in the game. Output 'generic' if no clear purpose is found in the prompt",
    },
  },
  required: ['name', 'rarity', 'visualDescription', 'functionalDescription', 'category', 'purpose'],
}

