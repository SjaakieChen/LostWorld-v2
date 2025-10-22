// Google Gemini Structured Output - Core Constants and Schemas
// Shared definitions used across all entity generation modules

// API Configuration
const STRUCTURED_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';
const STRUCTURED_IMAGE_MODEL = 'gemini-2.5-flash-image';
const STRUCTURED_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// JSON Schemas for each entity type

/**
 * Schema for Item entities
 * Base semantic/content fields only - attributes added separately
 */
const ITEM_SCHEMA = {
    type: "object",
    properties: {
        id: { 
            type: "string", 
            description: "Auto-generated semantic ID in format: XXX_itemname_### (e.g., 'wea_sword_001', 'arm_shield_wooden_001', 'con_potion_health_001')" 
        },
        name: { type: "string", description: "Display name of the item" },
        rarity: { 
            type: "string", 
            enum: ["common", "rare", "epic", "legendary"],
            description: "Significance level: 'common' = everyday/ordinary, 'rare' = quality/notable, 'epic' = famous/major, 'legendary' = iconic/world-famous"
        },
        description: { type: "string", description: "Detailed historical description" },
        category: { 
            type: "string", 
            enum: ITEM_CATEGORIES,
            description: "Item category" 
        }
    },
    required: ["id", "name", "rarity", "description"]
};

/**
 * Schema for NPC entities
 * Base semantic/content fields only - attributes added separately
 */
const NPC_SCHEMA = {
    type: "object",
    properties: {
        id: { 
            type: "string", 
            description: "Auto-generated semantic ID in format: XXX_npcname_### (e.g., 'mer_hans_001', 'gua_castle_001', 'que_elder_001')" 
        },
        name: { type: "string", description: "Display name of the NPC" },
        rarity: { 
            type: "string", 
            enum: ["common", "rare", "epic", "legendary"],
            description: "Significance level: 'common' = everyday/ordinary, 'rare' = quality/notable, 'epic' = famous/major, 'legendary' = iconic/world-famous"
        },
        description: { type: "string", description: "Detailed historical description" },
        category: { 
            type: "string", 
            enum: NPC_CATEGORIES,
            description: "NPC category" 
        }
    },
    required: ["id", "name", "rarity", "description"]
};

/**
 * Schema for Location entities
 * Base semantic/content fields only - attributes added separately
 */
const LOCATION_SCHEMA = {
    type: "object",
    properties: {
        id: { 
            type: "string", 
            description: "Auto-generated semantic ID in format: XXX_locationname_### (e.g., 'wil_forest_dark_001', 'tow_village_001', 'dun_crypt_001')" 
        },
        name: { type: "string", description: "Display name of the location" },
        rarity: { 
            type: "string", 
            enum: ["common", "rare", "epic", "legendary"],
            description: "Significance level: 'common' = everyday/ordinary, 'rare' = quality/notable, 'epic' = famous/major, 'legendary' = iconic/world-famous"
        },
        description: { type: "string", description: "Detailed historical description" },
        category: { 
            type: "string", 
            enum: LOCATION_CATEGORIES,
            description: "Location category" 
        }
    },
    required: ["id", "name", "rarity", "description"]
};

